import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "lunch.json");

export interface LunchDay {
  date: string;
  suggestions: string[];
  deadline: string;
  started: boolean;
  votingStarted?: boolean;
  pollMessageTs?: string;
  pollEnded?: boolean;
}

export interface LunchSchedule {
  beginTime: string;    // "HH:MM" 24h, default "09:30"
  voteTime: string;     // "HH:MM" 24h, default "10:30"
  endTime: string;      // "HH:MM" 24h, default "11:15"
  days: string;         // cron day-of-week, default "*" (every day)
  enabled: boolean;     // default true
}

export interface LunchStore {
  days: Record<string, LunchDay>;
  votes: Record<string, string[]>;  // "date:place" → userId[]
  userNames: Record<string, string>;  // userId → name
  masterList: string[];  // original case, unique (case-insensitive, array for JSON)
  schedule: LunchSchedule;
}

const store: LunchStore = {
  days: {},
  votes: {},
  userNames: {},
  masterList: [],
  schedule: {
    beginTime: "09:30",
    voteTime: "10:30",
    endTime: "11:15",
    days: "*",
    enabled: true,
  },
};

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadStore(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const data = JSON.parse(raw) as LunchStore;
      if (data && typeof data.days === "object") {
        Object.assign(store.days, data.days);
      }
      if (data && typeof data.votes === "object") {
        Object.assign(store.votes, data.votes);
      }
      if (data && typeof data.userNames === "object") {
        Object.assign(store.userNames, data.userNames);
      }
      if (data && Array.isArray(data.masterList)) {
        store.masterList = data.masterList;
      }
      if (data && data.schedule && typeof data.schedule === "object") {
        Object.assign(store.schedule, data.schedule);
      }
    }
  } catch {
    // best-effort, silently ignore
  }
}

function saveStore(): void {
  try {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch {
    // best-effort, silently ignore
  }
}

function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}

export function getToday(): LunchDay | undefined {
  return store.days[todayKey()] ?? undefined;
}

export function setToday(day: LunchDay): void {
  store.days[day.date] = day;
  saveStore();
}

export function addSuggestion(place: string): boolean {
  const key = todayKey();
  const day = store.days[key];
  if (!day) return false;

  const duplicate = day.suggestions.some(
    (s) => s.toLowerCase() === place.toLowerCase()
  );
  if (duplicate) return false;

  day.suggestions.push(place);
  saveStore();
  return true;
}

export function removeSuggestion(place: string): boolean {
  const key = todayKey();
  const day = store.days[key];
  if (!day) return false;

  const index = day.suggestions.findIndex(
    (s) => s.toLowerCase() === place.toLowerCase()
  );
  if (index === -1) return false;

  day.suggestions.splice(index, 1);
  saveStore();
  return true;
}

export function setDeadline(deadline: string): void {
  const key = todayKey();
  const day = store.days[key];
  if (!day) return;

  day.deadline = deadline;
  saveStore();
}

// --- Voting ---

function voteKey(place: string): string {
  return `${todayKey()}:${place}`;
}

export function getVotes(place: string): Set<string> {
  const key = voteKey(place);
  const voters = store.votes[key];
  if (!voters) return new Set();
  return new Set(voters);
}

export function toggleVote(place: string, userId: string): boolean {
  const key = voteKey(place);
  if (!store.votes[key]) {
    store.votes[key] = [];
  }
  const voters = store.votes[key];
  const index = voters.indexOf(userId);
  if (index === -1) {
    voters.push(userId);
    saveStore();
    return true; // voted
  } else {
    voters.splice(index, 1);
    saveStore();
    return false; // unvoted
  }
}

export function hasVoted(place: string, userId: string): boolean {
  const key = voteKey(place);
  const voters = store.votes[key];
  if (!voters) return false;
  return voters.includes(userId);
}

export function getUserNames(): Map<string, string> {
  return new Map(Object.entries(store.userNames));
}

export function setUserName(userId: string, name: string): void {
  store.userNames[userId] = name;
  saveStore();
}

export function setVotingStarted(votingStarted: boolean): void {
  const key = todayKey();
  const day = store.days[key];
  if (!day) return;

  day.votingStarted = votingStarted;
  saveStore();
}

export function setPollMessageTs(ts: string): void {
  const key = todayKey();
  const day = store.days[key];
  if (!day) return;

  day.pollMessageTs = ts;
  saveStore();
}

// --- Master List ---

export function getMasterList(): Set<string> {
  return new Set(store.masterList);
}

export function addToMasterList(place: string): void {
  const normalized = place.toLowerCase();
  const existing = store.masterList.findIndex(
    (s) => s.toLowerCase() === normalized
  );
  if (existing === -1) {
    store.masterList.push(place);
    saveStore();
  }
}

export function removeFromMasterList(place: string): boolean {
  const normalized = place.toLowerCase();
  const index = store.masterList.findIndex(
    (s) => s.toLowerCase() === normalized
  );
  if (index === -1) return false;
  store.masterList.splice(index, 1);
  saveStore();
  return true;
}

// --- Admin Reset ---

export function resetStore(): void {
  store.days = {};
  store.votes = {};
  store.userNames = {};
  // masterList is preserved
  saveStore();
}

// --- Poll Ended ---

export function setPollEnded(): void {
  const key = todayKey();
  const day = store.days[key];
  if (!day) return;

  day.pollEnded = true;
  saveStore();
}

// --- Winner History ---

const WINNERS_FILE = path.join(DATA_DIR, "winners.json");

export interface WinnerEntry {
  date: string;
  place: string;
  voteCount: number;
  totalVotes: number;
}

interface WinnerStore {
  winners: WinnerEntry[];
}

const winnersStore: WinnerStore = { winners: [] };

export function loadWinners(): void {
  try {
    if (fs.existsSync(WINNERS_FILE)) {
      const raw = fs.readFileSync(WINNERS_FILE, "utf-8");
      const data = JSON.parse(raw) as WinnerStore;
      if (data && Array.isArray(data.winners)) {
        winnersStore.winners = data.winners;
      }
    }
  } catch {
    // best-effort, silently ignore
  }
}

function saveWinners(): void {
  try {
    ensureDataDir();
    fs.writeFileSync(WINNERS_FILE, JSON.stringify(winnersStore, null, 2), "utf-8");
  } catch {
    // best-effort, silently ignore
  }
}

export function getWinners(): WinnerEntry[] {
  return [...winnersStore.winners];
}

export function addWinner(entry: WinnerEntry): void {
  winnersStore.winners.push(entry);
  saveWinners();
}

// --- Schedule Config ---

export function getSchedule(): LunchSchedule {
  return { ...store.schedule };
}

export function setSchedule(schedule: Partial<LunchSchedule>): void {
  Object.assign(store.schedule, schedule);
  saveStore();
}

// --- Shared Store Functions (used by both handlers and cron) ---

export interface PollResult {
  winner: { place: string; votes: number };
  results: Array<{ place: string; votes: number; rank: number }>;
  isTie: boolean;
  totalVotes: number;
}

const DEFAULT_DEADLINE = "11:00 AM EST";

/**
 * Start today's lunch suggestion round.
 * Returns the LunchDay if started, undefined if already started.
 */
export function startToday(): LunchDay | undefined {
  const today = store.days[todayKey()];
  if (today?.started) return undefined;

  const day: LunchDay = {
    date: todayKey(),
    suggestions: [],
    deadline: DEFAULT_DEADLINE,
    started: true,
    votingStarted: false,
  };
  setToday(day);
  return day;
}

/**
 * Start voting for today.
 * Returns the LunchDay if started, undefined if already started or no suggestions.
 */
export function startVoting(): LunchDay | undefined {
  const today = store.days[todayKey()];
  if (!today?.started) return undefined;
  if (today.votingStarted) return undefined;
  if (today.suggestions.length === 0) {
    console.log("[startVoting] no suggestions, skipping");
    return undefined;
  }

  today.votingStarted = true;
  saveStore();
  return today;
}

/**
 * End today's poll: compute winner, save history, mark poll ended.
 * Returns PollResult if ended, undefined if already ended or voting not started.
 */
export function endPoll(): PollResult | undefined {
  const today = store.days[todayKey()];
  if (!today?.started) return undefined;
  if (!today.votingStarted) return undefined;
  if (today.pollEnded) return undefined;

  // Compute results
  const results: Array<{ place: string; votes: number }> = today.suggestions.map((place) => ({
    place,
    votes: getVotes(place).size,
  }));

  // Sort: descending by vote count, ascending by name for ties
  results.sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    return a.place.localeCompare(b.place);
  });

  // Pick winner
  const topVotes = results[0].votes;
  const tiedWinners = results.filter((r) => r.votes === topVotes);
  const isTie = tiedWinners.length > 1;
  const winner = isTie
    ? tiedWinners[Math.floor(Math.random() * tiedWinners.length)]
    : tiedWinners[0];
  const totalVotes = results.reduce((sum, r) => sum + r.votes, 0);

  // Save winner to history
  addWinner({
    date: today.date,
    place: winner.place,
    voteCount: winner.votes,
    totalVotes,
  });

  // Mark poll as ended
  setPollEnded();

  // Build ranked results
  let rank = 1;
  const rankedResults: Array<{ place: string; votes: number; rank: number }> = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (i > 0 && r.votes === results[i - 1].votes) {
      // same rank as previous
    } else {
      rank = i + 1;
    }
    rankedResults.push({ place: r.place, votes: r.votes, rank });
  }

  return {
    winner: { place: winner.place, votes: winner.votes },
    results: rankedResults,
    isTie,
    totalVotes,
  };
}
