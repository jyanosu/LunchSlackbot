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
}

export interface LunchStore {
  days: Record<string, LunchDay>;
  votes: Record<string, string[]>;  // "date:place" → userId[]
  userNames: Record<string, string>;  // userId → name
  masterList: string[];  // lowercase place names, unique (array for JSON)
}

const store: LunchStore = { days: {}, votes: {}, userNames: {}, masterList: [] };

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
  if (!store.masterList.includes(normalized)) {
    store.masterList.push(normalized);
    saveStore();
  }
}

export function removeFromMasterList(place: string): boolean {
  const normalized = place.toLowerCase();
  const index = store.masterList.indexOf(normalized);
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
