import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(__dirname, "..", "data");
const LUNCH_FILE = path.join(DATA_DIR, "lunch.json");
const DAYS_FILE = path.join(DATA_DIR, "days.json");
const VOTES_FILE = path.join(DATA_DIR, "votes.json");

export interface LunchDay {
  date: string;
  suggestions: string[];
  deadline: string;
  started: boolean;
  votingStarted?: boolean;
  pollMessageTs?: string;
  pollEnded?: boolean;
  expandedSuggestions?: string[]; // array for JSON, tracked as Set in-memory
  autoPicked?: boolean; // true when suggestions were auto-picked from master list
}

export interface LunchSchedule {
  beginTime: string;    // "HH:MM" 24h, default "09:30"
  voteTime: string;     // "HH:MM" 24h, default "10:30"
  endTime: string;      // "HH:MM" 24h, default "11:15"
  days: string;         // cron day-of-week, default "*" (every day)
  enabled: boolean;     // default true
  pruneDays?: number;   // retention period in days, default 120, min 7
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
  // Load from new separate files
  loadDays();
  loadVotes();
  loadLunch();

  // Migrate old data if present in lunch.json
  migrateOldData();

  // Prune old entries
  pruneOldEntries();
}

function loadDays(): void {
  try {
    if (fs.existsSync(DAYS_FILE)) {
      const raw = fs.readFileSync(DAYS_FILE, "utf-8");
      const data = JSON.parse(raw) as { days: Record<string, LunchDay> };
      if (data && typeof data.days === "object") {
        Object.assign(store.days, data.days);
      }
    }
  } catch {
    // best-effort, silently ignore
  }
}

function saveDays(): void {
  try {
    ensureDataDir();
    fs.writeFileSync(DAYS_FILE, JSON.stringify({ days: store.days }, null, 2), "utf-8");
  } catch {
    // best-effort, silently ignore
  }
}

function loadVotes(): void {
  try {
    if (fs.existsSync(VOTES_FILE)) {
      const raw = fs.readFileSync(VOTES_FILE, "utf-8");
      const data = JSON.parse(raw) as { votes: Record<string, string[]>, userNames: Record<string, string> };
      if (data && typeof data.votes === "object") {
        Object.assign(store.votes, data.votes);
      }
      if (data && typeof data.userNames === "object") {
        Object.assign(store.userNames, data.userNames);
      }
    }
  } catch {
    // best-effort, silently ignore
  }
}

function saveVotes(): void {
  try {
    ensureDataDir();
    fs.writeFileSync(VOTES_FILE, JSON.stringify({ votes: store.votes, userNames: store.userNames }, null, 2), "utf-8");
  } catch {
    // best-effort, silently ignore
  }
}

function loadLunch(): void {
  try {
    if (fs.existsSync(LUNCH_FILE)) {
      const raw = fs.readFileSync(LUNCH_FILE, "utf-8");
      const data = JSON.parse(raw) as LunchStore;
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

function saveLunch(): void {
  try {
    ensureDataDir();
    fs.writeFileSync(LUNCH_FILE, JSON.stringify({
      masterList: store.masterList,
      schedule: store.schedule,
    }, null, 2), "utf-8");
  } catch {
    // best-effort, silently ignore
  }
}

/**
 * Migrate old data from lunch.json to new separate files.
 * Runs once on startup if old format detected.
 */
function migrateOldData(): void {
  try {
    if (!fs.existsSync(LUNCH_FILE)) return;
    const raw = fs.readFileSync(LUNCH_FILE, "utf-8");
    const data = JSON.parse(raw) as LunchStore;

    let needsMigration = false;

    // Migrate days if present
    if (data && typeof data.days === "object" && Object.keys(data.days).length > 0) {
      // Merge into existing days (already loaded from days.json if it exists)
      for (const [key, value] of Object.entries(data.days)) {
        if (!(key in store.days)) {
          store.days[key] = value as LunchDay;
        }
      }
      saveDays();
      needsMigration = true;
    }

    // Migrate votes if present
    if (data && typeof data.votes === "object" && Object.keys(data.votes).length > 0) {
      for (const [key, value] of Object.entries(data.votes)) {
        if (!(key in store.votes)) {
          store.votes[key] = value as string[];
        }
      }
      needsMigration = true;
    }

    // Migrate userNames if present
    if (data && typeof data.userNames === "object" && Object.keys(data.userNames).length > 0) {
      for (const [key, value] of Object.entries(data.userNames)) {
        if (!(key in store.userNames)) {
          store.userNames[key] = value as string;
        }
      }
      needsMigration = true;
    }

    if (needsMigration) {
      saveVotes();
      // Save cleaned lunch.json (only masterList + schedule)
      saveLunch();
    }
  } catch {
    // best-effort, silently ignore
  }
}

/**
 * Prune entries older than pruneDays (default 120).
 */
function pruneOldEntries(): void {
  const pruneDays = store.schedule.pruneDays ?? 120;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - pruneDays);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  // Prune days
  const daysBefore = Object.keys(store.days).length;
  store.days = Object.fromEntries(
    Object.entries(store.days).filter(([key]) => key >= cutoffStr)
  );
  const daysPruned = daysBefore - Object.keys(store.days).length;

  // Prune votes (keyed by "date:place")
  const votesBefore = Object.keys(store.votes).length;
  store.votes = Object.fromEntries(
    Object.entries(store.votes).filter(([key]) => {
      const datePrefix = key.split(":")[0];
      return datePrefix >= cutoffStr;
    })
  );
  const votesPruned = votesBefore - Object.keys(store.votes).length;

  if (daysPruned > 0 || votesPruned > 0) {
    console.log(`[store] pruned ${daysPruned} old days, ${votesPruned} old votes`);
    saveDays();
    saveVotes();
  }
}

export function saveStore(): void {
  saveDays();
  saveVotes();
  saveLunch();
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

/**
 * Get the set of suggestions with expanded voter lists.
 */
export function getExpandedSuggestions(): Set<string> {
  const key = todayKey();
  const day = store.days[key];
  if (!day?.expandedSuggestions) return new Set();
  return new Set(day.expandedSuggestions);
}

/**
 * Toggle a suggestion's expanded state.
 */
export function toggleExpandedSuggestion(place: string): void {
  const key = todayKey();
  const day = store.days[key];
  if (!day) return;

  if (!day.expandedSuggestions) {
    day.expandedSuggestions = [];
  }

  const idx = day.expandedSuggestions.indexOf(place);
  if (idx >= 0) {
    day.expandedSuggestions.splice(idx, 1);
  } else {
    day.expandedSuggestions.push(place);
  }

  saveStore();
}

// --- Master List ---

export function getMasterList(): Set<string> {
  return new Set(store.masterList);
}

export function setMasterList(places: Set<string>): void {
  store.masterList = Array.from(places);
  saveStore();
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
  saveDays();
  saveVotes();
  saveLunch();
}

// --- Poll Ended ---

export function setPollEnded(): void {
  const key = todayKey();
  const day = store.days[key];
  if (!day) return;

  day.pollEnded = true;
  saveStore();
}

/**
 * Clear all suggestions for today. Returns true if cleared, false if no round or already empty.
 */
export function clearSuggestions(): boolean {
  const today = store.days[todayKey()];
  if (!today?.started) return false;
  if (today.suggestions.length === 0) return false;

  today.suggestions = [];
  saveStore();
  return true;
}

// --- Winner History ---

const WINNERS_FILE = path.join(DATA_DIR, "winners.json");

export interface WinnerEntry {
  date: string;
  place: string;
  voteCount: number;
  totalVotes: number;
  runnersUp?: Array<{ place: string; votes: number }>;
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
  pruneOldWinners();
}

function pruneOldWinners(): void {
  const before = winnersStore.winners.length;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  winnersStore.winners = winnersStore.winners.filter(w => w.date >= cutoffStr);
  const pruned = before - winnersStore.winners.length;
  if (pruned > 0) {
    console.log(`[store] pruned ${pruned} old winners`);
    saveWinners();
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

export function getPickCounts(lastDays = 28): Map<string, number> {
  const counts = new Map<string, number>();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lastDays);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  for (const entry of winnersStore.winners) {
    if (entry.date >= cutoffStr) {
      counts.set(entry.place, (counts.get(entry.place) ?? 0) + 1);
      if (entry.runnersUp) {
        for (const r of entry.runnersUp) {
          counts.set(r.place, (counts.get(r.place) ?? 0) + 1);
        }
      }
    }
  }

  return counts;
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
    autoPicked: undefined,
  };
  setToday(day);

  return day;
}

/**
 * Pick N places from master list using smart-pick logic (least picked first, shuffle ties).
 * Returns array of place names.
 */
export function pickFromMasterList(count: number): string[] {
  const masterList = getMasterList();
  const places = Array.from(masterList);

  if (places.length === 0) return [];

  const pickCounts = getPickCounts(28);
  const sorted = places.sort((a, b) => {
    const countA = pickCounts.get(a) ?? 0;
    const countB = pickCounts.get(b) ?? 0;
    if (countA !== countB) return countA - countB;
    return Math.random() - 0.5; // shuffle ties
  });

  return sorted.slice(0, Math.min(count, places.length));
}

/**
 * Start voting for today.
 * Auto-picks from master list if no suggestions. Returns LunchDay if started,
 * undefined if already started or master list also empty.
 */
export function startVoting(): LunchDay | undefined {
  const today = store.days[todayKey()];
  if (!today?.started) return undefined;
  if (today.votingStarted) return undefined;

  // Auto-pick from master list if no suggestions
  if (today.suggestions.length === 0) {
    const picked = pickFromMasterList(5);
    if (picked.length === 0) {
      console.log("[startVoting] no suggestions and master list empty, skipping");
      return undefined;
    }
    today.suggestions.push(...picked);
    today.autoPicked = true;
    console.log(`[startVoting] auto-picked ${picked.length} places from master list`);
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

  // Reorder results so winner is first
  const others = results.filter((r) => r.place !== winner.place);
  const ordered = [winner, ...others];

  // Save winner to history with runners-up
  const runnersUp = others
    .map((r) => ({ place: r.place, votes: r.votes }));

  addWinner({
    date: today.date,
    place: winner.place,
    voteCount: winner.votes,
    totalVotes,
    runnersUp,
  });

  // Mark poll as ended
  setPollEnded();

  // Build ranked results
  let rank = 1;
  const rankedResults: Array<{ place: string; votes: number; rank: number }> = [];
  for (let i = 0; i < ordered.length; i++) {
    const r = ordered[i];
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
