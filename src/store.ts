import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "lunch.json");

export interface LunchDay {
  date: string;
  suggestions: string[];
  deadline: string;
  started: boolean;
}

export interface LunchStore {
  days: Record<string, LunchDay>;
}

const store: LunchStore = { days: {} };

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
