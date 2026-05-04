import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "lunch.json");

function cleanup() {
  try {
    if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
    if (fs.existsSync(DATA_DIR)) fs.rmdirSync(DATA_DIR);
  } catch {
    // ignore
  }
}

describe("store", () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  it("starts with empty state when data file missing", async () => {
    // Re-import fresh module to get clean state
    const { loadStore, getToday } = await import("./store");
    loadStore();
    expect(getToday()).toBeUndefined();
  });

  it("seeds from data file on load", async () => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const today = new Date().toISOString().split("T")[0];
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({
        days: {
          [today]: {
            date: today,
            suggestions: ["Taco Bell"],
            deadline: "11:00 AM",
            started: true,
          },
        },
      }),
      "utf-8"
    );

    const { loadStore, getToday } = await import("./store");
    loadStore();
    expect(getToday()).toBeDefined();
  });

  it("addSuggestion adds a place to today", async () => {
    const { loadStore, setToday, addSuggestion, getToday } = await import("./store");
    loadStore();
    const today = new Date().toISOString().split("T")[0];
    setToday({ date: today, suggestions: [], deadline: "11:00 AM", started: true });
    expect(addSuggestion("Taco Bell")).toBe(true);
    expect(getToday()?.suggestions).toContain("Taco Bell");
  });

  it("addSuggestion rejects duplicates (case-insensitive)", async () => {
    const { loadStore, setToday, addSuggestion } = await import("./store");
    loadStore();
    const today = new Date().toISOString().split("T")[0];
    setToday({ date: today, suggestions: ["Taco Bell"], deadline: "11:00 AM", started: true });
    expect(addSuggestion("taco bell")).toBe(false);
    expect(addSuggestion("TACO BELL")).toBe(false);
  });

  it("addSuggestion returns false when day not started", async () => {
    const { loadStore, addSuggestion } = await import("./store");
    loadStore();
    expect(addSuggestion("Taco Bell")).toBe(false);
  });

  it("removeSuggestion removes a place (case-insensitive)", async () => {
    const { loadStore, setToday, removeSuggestion, getToday } = await import("./store");
    loadStore();
    const today = new Date().toISOString().split("T")[0];
    setToday({ date: today, suggestions: ["Taco Bell", "Chipotle"], deadline: "11:00 AM", started: true });
    expect(removeSuggestion("taco bell")).toBe(true);
    expect(getToday()?.suggestions).toEqual(["Chipotle"]);
  });

  it("removeSuggestion returns false for non-existent place", async () => {
    const { loadStore, setToday, removeSuggestion } = await import("./store");
    loadStore();
    const today = new Date().toISOString().split("T")[0];
    setToday({ date: today, suggestions: ["Taco Bell"], deadline: "11:00 AM", started: true });
    expect(removeSuggestion("Subway")).toBe(false);
  });

  it("setDeadline updates today's deadline", async () => {
    const { loadStore, setToday, setDeadline, getToday } = await import("./store");
    loadStore();
    const today = new Date().toISOString().split("T")[0];
    setToday({ date: today, suggestions: [], deadline: "11:00 AM", started: true });
    setDeadline("10:30 AM");
    expect(getToday()?.deadline).toBe("10:30 AM");
  });

  it("persists data to file on mutation", async () => {
    const { loadStore, setToday, addSuggestion } = await import("./store");
    loadStore();
    const today = new Date().toISOString().split("T")[0];
    setToday({ date: today, suggestions: [], deadline: "11:00 AM", started: true });
    addSuggestion("Taco Bell");
    expect(fs.existsSync(DATA_FILE)).toBe(true);
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    expect(saved.days[today].suggestions).toContain("Taco Bell");
  });
});

describe("store voting", () => {
  beforeEach(() => {
    vi.resetModules();
    cleanup();
  });
  afterEach(cleanup);

  it("toggleVote adds vote on first call", async () => {
    const { loadStore, setToday, toggleVote, getVotes } = await import("./store");
    loadStore();
    const today = new Date().toISOString().split("T")[0];
    setToday({ date: today, suggestions: ["Taco Bell"], deadline: "11:00 AM", started: true });
    expect(toggleVote("Taco Bell", "U1")).toBe(true);
    expect(getVotes("Taco Bell")).toContain("U1");
  });

  it("toggleVote removes vote on second call", async () => {
    const { loadStore, setToday, toggleVote, getVotes } = await import("./store");
    loadStore();
    const today = new Date().toISOString().split("T")[0];
    setToday({ date: today, suggestions: ["Taco Bell"], deadline: "11:00 AM", started: true });
    toggleVote("Taco Bell", "U1");
    expect(toggleVote("Taco Bell", "U1")).toBe(false);
    expect(getVotes("Taco Bell")).not.toContain("U1");
  });

  it("hasVoted returns correct state", async () => {
    const { loadStore, setToday, toggleVote, hasVoted } = await import("./store");
    loadStore();
    const today = new Date().toISOString().split("T")[0];
    setToday({ date: today, suggestions: ["Taco Bell"], deadline: "11:00 AM", started: true });
    expect(hasVoted("Taco Bell", "U1")).toBe(false);
    toggleVote("Taco Bell", "U1");
    expect(hasVoted("Taco Bell", "U1")).toBe(true);
  });

  it("getVotes returns empty set for unknown place", async () => {
    const { loadStore, getVotes } = await import("./store");
    loadStore();
    expect(getVotes("Unknown")).toEqual(new Set());
  });

  it("multiple users can vote for same place", async () => {
    const { loadStore, setToday, toggleVote, getVotes } = await import("./store");
    loadStore();
    const today = new Date().toISOString().split("T")[0];
    setToday({ date: today, suggestions: ["Taco Bell"], deadline: "11:00 AM", started: true });
    toggleVote("Taco Bell", "U1");
    toggleVote("Taco Bell", "U2");
    const votes = getVotes("Taco Bell");
    expect(votes).toContain("U1");
    expect(votes).toContain("U2");
  });

  it("setUserName caches user name", async () => {
    const { loadStore, setUserName, getUserNames } = await import("./store");
    loadStore();
    setUserName("U1", "Alice");
    expect(getUserNames().get("U1")).toBe("Alice");
  });

  it("setVotingStarted updates voting state", async () => {
    const { loadStore, setToday, setVotingStarted, getToday } = await import("./store");
    loadStore();
    const today = new Date().toISOString().split("T")[0];
    setToday({ date: today, suggestions: ["Taco Bell"], deadline: "11:00 AM", started: true, votingStarted: false });
    setVotingStarted(true);
    expect(getToday()?.votingStarted).toBe(true);
  });

  it("setPollMessageTs saves ts", async () => {
    const { loadStore, setToday, setPollMessageTs, getToday } = await import("./store");
    loadStore();
    const today = new Date().toISOString().split("T")[0];
    setToday({ date: today, suggestions: ["Taco Bell"], deadline: "11:00 AM", started: true, votingStarted: true });
    setPollMessageTs("1234567890.123456");
    expect(getToday()?.pollMessageTs).toBe("1234567890.123456");
  });

  it("votes persist to file and reload", async () => {
    const { loadStore, setToday, toggleVote, getVotes } = await import("./store");
    loadStore();
    const today = new Date().toISOString().split("T")[0];
    setToday({ date: today, suggestions: ["Taco Bell"], deadline: "11:00 AM", started: true });
    toggleVote("Taco Bell", "U1");

    // Read saved data directly
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    expect(saved.votes).toBeDefined();
    const voteKey = today + ":Taco Bell";
    expect(saved.votes[voteKey]).toContain("U1");
  });
});
