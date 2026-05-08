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
  beforeEach(() => {
    vi.resetModules();
    cleanup();
  });
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

  it("getExpandedSuggestions returns empty set when not set", async () => {
    const { loadStore, setToday, getExpandedSuggestions } = await import("./store");
    loadStore();
    const today = new Date().toISOString().split("T")[0];
    setToday({ date: today, suggestions: ["Taco Bell"], deadline: "11:00 AM", started: true });
    expect(getExpandedSuggestions().size).toBe(0);
  });

  it("toggleExpandedSuggestion adds and removes", async () => {
    const { loadStore, setToday, getExpandedSuggestions, toggleExpandedSuggestion } = await import("./store");
    loadStore();
    const today = new Date().toISOString().split("T")[0];
    setToday({ date: today, suggestions: ["Taco Bell", "Chipotle"], deadline: "11:00 AM", started: true });

    toggleExpandedSuggestion("Taco Bell");
    expect(getExpandedSuggestions()).toContain("Taco Bell");

    toggleExpandedSuggestion("Taco Bell");
    expect(getExpandedSuggestions()).not.toContain("Taco Bell");
  });

  it("toggleExpandedSuggestion tracks multiple places", async () => {
    const { loadStore, setToday, getExpandedSuggestions, toggleExpandedSuggestion } = await import("./store");
    loadStore();
    const today = new Date().toISOString().split("T")[0];
    setToday({ date: today, suggestions: ["Taco Bell", "Chipotle"], deadline: "11:00 AM", started: true });

    toggleExpandedSuggestion("Taco Bell");
    toggleExpandedSuggestion("Chipotle");
    expect(getExpandedSuggestions().size).toBe(2);
    expect(getExpandedSuggestions()).toContain("Taco Bell");
    expect(getExpandedSuggestions()).toContain("Chipotle");
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

describe("store masterList", () => {
  beforeEach(() => {
    vi.resetModules();
    cleanup();
  });
  afterEach(cleanup);

  it("addToMasterList adds a new place (preserves original case)", async () => {
    const { loadStore, addToMasterList, getMasterList } = await import("./store");
    loadStore();
    addToMasterList("Taco Bell");
    expect(getMasterList()).toContain("Taco Bell");
  });

  it("addToMasterList is idempotent", async () => {
    const { loadStore, addToMasterList, getMasterList } = await import("./store");
    loadStore();
    addToMasterList("Taco Bell");
    addToMasterList("TACO BELL");
    expect(getMasterList().size).toBe(1);
  });

  it("removeFromMasterList removes a place (case-insensitive)", async () => {
    const { loadStore, addToMasterList, removeFromMasterList, getMasterList } = await import("./store");
    loadStore();
    addToMasterList("Chipotle");
    expect(getMasterList()).toContain("Chipotle");
    removeFromMasterList("CHIPOTLE");
    expect(getMasterList()).not.toContain("Chipotle");
  });

  it("removeFromMasterList returns false for unknown place", async () => {
    const { loadStore, removeFromMasterList } = await import("./store");
    loadStore();
    expect(removeFromMasterList("Nonexistent")).toBe(false);
  });

  it("masterList persists to file and reloads (preserves case)", async () => {
    const { loadStore, addToMasterList, getMasterList } = await import("./store");
    loadStore();
    addToMasterList("In-N-Out");

    // Read saved data directly
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    expect(saved.masterList).toContain("In-N-Out");

    // Reload and verify
    const { loadStore: loadStore2, getMasterList: getMasterList2 } = await import("./store");
    vi.resetModules();
    const reloaded = await import("./store");
    reloaded.loadStore();
    expect(reloaded.getMasterList()).toContain("In-N-Out");
  });

  it("empty masterList loads gracefully", async () => {
    const { loadStore, getMasterList } = await import("./store");
    loadStore();
    expect(getMasterList().size).toBe(0);
  });
});

describe("store adminreset", () => {
  beforeEach(() => {
    vi.resetModules();
    cleanup();
  });
  afterEach(cleanup);

  it("resetStore clears days, votes, userNames", async () => {
    const { loadStore, setToday, toggleVote, setUserName, resetStore, getToday, getVotes, getUserNames } = await import("./store");
    loadStore();
    const today = new Date().toISOString().split("T")[0];
    setToday({ date: today, suggestions: ["Taco Bell"], deadline: "11:00 AM", started: true });
    toggleVote("Taco Bell", "U1");
    setUserName("U1", "Alice");

    resetStore();

    expect(getToday()).toBeUndefined();
    expect(getVotes("Taco Bell").size).toBe(0);
    expect(getUserNames().size).toBe(0);
  });

  it("resetStore preserves masterList (original case)", async () => {
    const { loadStore, addToMasterList, resetStore, getMasterList } = await import("./store");
    loadStore();
    addToMasterList("Taco Bell");
    addToMasterList("Chipotle");

    resetStore();

    expect(getMasterList()).toContain("Taco Bell");
    expect(getMasterList()).toContain("Chipotle");
    expect(getMasterList().size).toBe(2);
  });

  it("resetStore saves empty state to JSON", async () => {
    const { loadStore, setToday, resetStore } = await import("./store");
    loadStore();
    const today = new Date().toISOString().split("T")[0];
    setToday({ date: today, suggestions: ["Taco Bell"], deadline: "11:00 AM", started: true });

    resetStore();

    const saved = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    expect(Object.keys(saved.days)).toHaveLength(0);
    expect(Object.keys(saved.votes)).toHaveLength(0);
    expect(Object.keys(saved.userNames)).toHaveLength(0);
  });

  // --- Poll Ended ---

  it("setPollEnded sets flag on today's LunchDay", async () => {
    const { loadStore, setToday, setPollEnded, getToday } = await import("./store");
    loadStore();
    const today = new Date().toISOString().split("T")[0];
    setToday({ date: today, suggestions: ["Taco Bell"], deadline: "11:45 AM", started: true, votingStarted: true });

    setPollEnded();

    expect(getToday()?.pollEnded).toBe(true);
  });

  it("setPollEnded is no-op when no today", async () => {
    const { loadStore, setPollEnded } = await import("./store");
    loadStore();

    // Should not throw
    expect(() => setPollEnded()).not.toThrow();
  });

  // --- Winner History ---

  const WINNERS_FILE = path.join(DATA_DIR, "winners.json");

  function cleanupWinners() {
    try {
      if (fs.existsSync(WINNERS_FILE)) fs.unlinkSync(WINNERS_FILE);
    } catch {
      // ignore
    }
  }

  it("getWinners returns empty array when file missing", async () => {
    cleanupWinners();
    const { loadWinners, getWinners } = await import("./store");
    loadWinners();
    expect(getWinners()).toEqual([]);
  });

  it("getWinners returns entries from file", async () => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const today = new Date().toISOString().split("T")[0];
    fs.writeFileSync(
      WINNERS_FILE,
      JSON.stringify({
        winners: [
          { date: today, place: "Chipotle", voteCount: 4, totalVotes: 10 },
        ],
      }),
      "utf-8"
    );

    const { loadWinners, getWinners } = await import("./store");
    loadWinners();
    expect(getWinners()).toHaveLength(1);
    expect(getWinners()[0].place).toBe("Chipotle");
  });

  it("addWinner appends entry and saves", async () => {
    cleanupWinners();
    const { loadWinners, addWinner, getWinners } = await import("./store");
    loadWinners();

    addWinner({ date: "2025-01-15", place: "Taco Bell", voteCount: 5, totalVotes: 12 });

    expect(getWinners()).toHaveLength(1);
    expect(getWinners()[0].place).toBe("Taco Bell");
    expect(fs.existsSync(WINNERS_FILE)).toBe(true);
  });

  it("resetStore preserves winners (not cleared)", async () => {
    cleanupWinners();
    const { loadStore, loadWinners, addWinner, getWinners, resetStore, setToday } = await import("./store");
    loadStore();
    loadWinners();
    const today = new Date().toISOString().split("T")[0];
    setToday({ date: today, suggestions: ["Taco Bell"], deadline: "11:00 AM", started: true });
    addWinner({ date: today, place: "Taco Bell", voteCount: 5, totalVotes: 10 });

    resetStore();

    expect(getWinners()).toHaveLength(1);
    expect(getWinners()[0].place).toBe("Taco Bell");
  });
});

describe("shared store functions", () => {
  beforeEach(() => {
    vi.resetModules();
    cleanup();
  });
  afterEach(cleanup);

  it("startToday creates LunchDay with correct defaults", async () => {
    const { loadStore, startToday, getToday } = await import("./store");
    loadStore();

    const day = startToday();

    expect(day).toBeDefined();
    expect(day!.started).toBe(true);
    expect(day!.votingStarted).toBe(false);
    expect(day!.deadline).toBe("11:00 AM EST");
    expect(day!.suggestions).toEqual([]);
    expect(getToday()).toBe(day);
  });

  it("startToday returns undefined when already started", async () => {
    const { loadStore, startToday } = await import("./store");
    loadStore();

    startToday();
    const result = startToday();

    expect(result).toBeUndefined();
  });

  it("startVoting returns LunchDay when suggestions exist", async () => {
    const { loadStore, startToday, startVoting, addSuggestion } = await import("./store");
    loadStore();

    startToday();
    addSuggestion("Taco Bell");
    const day = startVoting();

    expect(day).toBeDefined();
    expect(day!.votingStarted).toBe(true);
  });

  it("startVoting returns undefined when already started", async () => {
    const { loadStore, startToday, startVoting, addSuggestion } = await import("./store");
    loadStore();

    startToday();
    addSuggestion("Taco Bell");
    startVoting();
    const result = startVoting();

    expect(result).toBeUndefined();
  });

  it("startVoting returns undefined when no suggestions and master list empty", async () => {
    const { loadStore, startToday, startVoting, getMasterList } = await import("./store");
    loadStore();

    startToday();
    // Master list is empty after loadStore, so auto-pick has nothing to pick
    const result = startVoting();

    expect(result).toBeUndefined();
  });

  it("startVoting returns undefined when no round started", async () => {
    const { loadStore, startVoting } = await import("./store");
    loadStore();

    const result = startVoting();

    expect(result).toBeUndefined();
  });

  it("startVoting auto-picks from master list when suggestions empty", async () => {
    const { loadStore, startToday, startVoting, addSuggestion, getMasterList, setMasterList } = await import("./store");
    loadStore();

    setMasterList(new Set(["Taco Bell", "Chipotle", "In-N-Out", "Panda Express", "Subway", "Qdoba"]));
    startToday();
    const result = startVoting();

    expect(result).toBeDefined();
    expect(result!.votingStarted).toBe(true);
    expect(result!.autoPicked).toBe(true);
    expect(result!.suggestions.length).toBe(5);
  });

  it("startVoting picks all when master list < 5", async () => {
    const { loadStore, startToday, startVoting, setMasterList } = await import("./store");
    loadStore();

    setMasterList(new Set(["Taco Bell", "Chipotle"]));
    startToday();
    const result = startVoting();

    expect(result).toBeDefined();
    expect(result!.suggestions.length).toBe(2);
    expect(result!.autoPicked).toBe(true);
  });

  it("startVoting skips when both suggestions and master list empty", async () => {
    const { loadStore, startToday, startVoting, setMasterList } = await import("./store");
    loadStore();

    setMasterList(new Set());
    startToday();
    const result = startVoting();

    expect(result).toBeUndefined();
  });

  it("startToday resets autoPicked flag", async () => {
    const { loadStore, startToday, startVoting, setMasterList, resetStore } = await import("./store");
    loadStore();

    setMasterList(new Set(["Taco Bell", "Chipotle", "In-N-Out", "Panda Express", "Subway"]));
    startToday();
    const day1 = startVoting();
    expect(day1!.autoPicked).toBe(true);

    // New day resets autoPicked
    resetStore();
    const day2 = startToday();
    expect(day2!.autoPicked).toBeUndefined();
  });

  it("endPoll returns PollResult with correct shape", async () => {
    const { loadStore, startToday, startVoting, addSuggestion, toggleVote, endPoll } = await import("./store");
    loadStore();

    startToday();
    addSuggestion("Taco Bell");
    addSuggestion("Chipotle");
    toggleVote("Taco Bell", "U1");
    toggleVote("Taco Bell", "U2");
    toggleVote("Chipotle", "U1");
    startVoting();

    const result = endPoll();

    expect(result).toBeDefined();
    expect(result!.winner.place).toBe("Taco Bell");
    expect(result!.winner.votes).toBe(2);
    expect(result!.results).toHaveLength(2);
    expect(result!.results[0].place).toBe("Taco Bell");
    expect(result!.results[0].rank).toBe(1);
    expect(result!.results[1].place).toBe("Chipotle");
    expect(result!.results[1].rank).toBe(2);
    expect(result!.isTie).toBe(false);
    expect(result!.totalVotes).toBe(3);
  });

  it("endPoll saves runners-up to history", async () => {
    const { loadStore, startToday, startVoting, addSuggestion, toggleVote, endPoll, getWinners } = await import("./store");
    loadStore();

    startToday();
    addSuggestion("Taco Bell");
    addSuggestion("Chipotle");
    addSuggestion("Panda Express");
    toggleVote("Taco Bell", "U1");
    toggleVote("Taco Bell", "U2");
    toggleVote("Chipotle", "U1");
    startVoting();

    endPoll();

    const winners = getWinners();
    expect(winners.length).toBe(1);
    expect(winners[0].place).toBe("Taco Bell");
    expect(winners[0].runnersUp).toHaveLength(2);
    expect(winners[0].runnersUp![0].place).toBe("Chipotle");
    expect(winners[0].runnersUp![0].votes).toBe(1);
    expect(winners[0].runnersUp![1].place).toBe("Panda Express");
    expect(winners[0].runnersUp![1].votes).toBe(0);
  });

  it("endPoll puts winner first in results even on tie", async () => {
    const { loadStore, startToday, startVoting, addSuggestion, toggleVote, endPoll } = await import("./store");
    loadStore();

    startToday();
    addSuggestion("Chipotle");
    addSuggestion("Taco Bell");
    // Both get 2 votes - tie, alphabetically Chipotle first
    toggleVote("Chipotle", "U1");
    toggleVote("Chipotle", "U2");
    toggleVote("Taco Bell", "U3");
    toggleVote("Taco Bell", "U4");
    startVoting();

    const result = endPoll();

    expect(result).toBeDefined();
    // Winner is first in results regardless of alphabetical order
    expect(result!.results[0].place).toBe(result!.winner.place);
    expect(result!.results[0].rank).toBe(1);
  });

  it("endPoll returns undefined when already ended", async () => {
    const { loadStore, startToday, startVoting, addSuggestion, endPoll } = await import("./store");
    loadStore();

    startToday();
    addSuggestion("Taco Bell");
    startVoting();
    endPoll();

    const result = endPoll();

    expect(result).toBeUndefined();
  });

  it("endPoll returns undefined when voting not started", async () => {
    const { loadStore, startToday, addSuggestion, endPoll } = await import("./store");
    loadStore();

    startToday();
    addSuggestion("Taco Bell");

    const result = endPoll();

    expect(result).toBeUndefined();
  });

  it("endPoll returns undefined when no round started", async () => {
    const { loadStore, endPoll } = await import("./store");
    loadStore();

    const result = endPoll();

    expect(result).toBeUndefined();
  });

  it("endPoll handles tie with random winner", async () => {
    const { loadStore, startToday, startVoting, addSuggestion, toggleVote, endPoll } = await import("./store");
    loadStore();

    startToday();
    addSuggestion("Taco Bell");
    addSuggestion("Chipotle");
    toggleVote("Taco Bell", "U1");
    toggleVote("Chipotle", "U2");
    startVoting();

    const result = endPoll();

    expect(result).toBeDefined();
    expect(["Taco Bell", "Chipotle"]).toContain(result!.winner.place);
    expect(result!.isTie).toBe(true);
    expect(result!.results[0].rank).toBe(1);
    expect(result!.results[1].rank).toBe(1);
  });
});

describe("schedule config", () => {
  beforeEach(() => {
    vi.resetModules();
    cleanup();
  });
  afterEach(cleanup);

  it("getSchedule returns defaults", async () => {
    const { loadStore, getSchedule } = await import("./store");
    loadStore();

    const schedule = getSchedule();

    expect(schedule.beginTime).toBe("09:30");
    expect(schedule.voteTime).toBe("10:30");
    expect(schedule.endTime).toBe("11:15");
    expect(schedule.days).toBe("*");
    expect(schedule.enabled).toBe(true);
  });

  it("setSchedule updates config", async () => {
    const { loadStore, setSchedule, getSchedule } = await import("./store");
    loadStore();

    setSchedule({ beginTime: "10:00" });

    const schedule = getSchedule();
    expect(schedule.beginTime).toBe("10:00");
    expect(schedule.voteTime).toBe("10:30"); // unchanged
  });

  it("setSchedule can toggle enabled", async () => {
    const { loadStore, setSchedule, getSchedule } = await import("./store");
    loadStore();

    setSchedule({ enabled: false });

    expect(getSchedule().enabled).toBe(false);
  });

  it("schedule persists to file and reloads", async () => {
    const { loadStore, setSchedule, getSchedule } = await import("./store");
    loadStore();

    setSchedule({ beginTime: "08:00", voteTime: "09:00", enabled: false });

    // Read file directly to verify persistence (setSchedule calls saveStore)
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    expect(data.schedule.beginTime).toBe("08:00");
    expect(data.schedule.voteTime).toBe("09:00");
    expect(data.schedule.endTime).toBe("11:15");
    expect(data.schedule.enabled).toBe(false);
  });
});

describe("getPickCounts", () => {
  const WINNERS_FILE = path.join(DATA_DIR, "winners.json");

  beforeEach(() => {
    vi.resetModules();
    try {
      if (fs.existsSync(WINNERS_FILE)) fs.unlinkSync(WINNERS_FILE);
    } catch {
      // ignore
    }
  });

  it("returns counts for entries within window", async () => {
    const { loadStore, addWinner, getPickCounts } = await import("./store");
    loadStore();

    const today = new Date().toISOString().split("T")[0];
    addWinner({
      date: today,
      place: "Taco Bell",
      voteCount: 5,
      totalVotes: 10,
      runnersUp: [{ place: "Chipotle", votes: 3 }],
    });

    const counts = getPickCounts(28);
    expect(counts.get("Taco Bell")).toBe(1);
    expect(counts.get("Chipotle")).toBe(1);
  });

  it("excludes entries outside window", async () => {
    const { loadStore, addWinner, getPickCounts } = await import("./store");
    loadStore();

    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 35);
    addWinner({
      date: oldDate.toISOString().split("T")[0],
      place: "Old Place",
      voteCount: 2,
      totalVotes: 5,
    });

    const counts = getPickCounts(28);
    expect(counts.get("Old Place")).toBeUndefined();
  });

  it("handles empty history", async () => {
    const { loadStore, getPickCounts } = await import("./store");
    loadStore();

    const counts = getPickCounts(28);
    expect(counts.size).toBe(0);
  });

  it("handles missing runnersUp", async () => {
    const { loadStore, addWinner, getPickCounts } = await import("./store");
    loadStore();

    const today = new Date().toISOString().split("T")[0];
    addWinner({
      date: today,
      place: "No Runners",
      voteCount: 3,
      totalVotes: 3,
    });

    const counts = getPickCounts(28);
    expect(counts.get("No Runners")).toBe(1);
  });

  it("returns 0 for places never in history", async () => {
    const { loadStore, getPickCounts } = await import("./store");
    loadStore();

    const counts = getPickCounts(28);
    expect(counts.get("Never Picked")).toBeUndefined();
  });

  it("accumulates counts across multiple entries", async () => {
    const { loadStore, addWinner, getPickCounts } = await import("./store");
    loadStore();

    const today = new Date().toISOString().split("T")[0];
    addWinner({
      date: today,
      place: "Taco Bell",
      voteCount: 5,
      totalVotes: 10,
      runnersUp: [{ place: "Chipotle", votes: 3 }],
    });
    addWinner({
      date: today,
      place: "Chipotle",
      voteCount: 4,
      totalVotes: 8,
      runnersUp: [{ place: "Taco Bell", votes: 2 }],
    });

    const counts = getPickCounts(28);
    expect(counts.get("Taco Bell")).toBe(2); // winner once, runner-up once
    expect(counts.get("Chipotle")).toBe(2); // winner once, runner-up once
  });
});

describe("pruneOldWinners", () => {
  const WINNERS_FILE = path.join(DATA_DIR, "winners.json");

  beforeEach(() => {
    vi.resetModules();
    try {
      if (fs.existsSync(WINNERS_FILE)) fs.unlinkSync(WINNERS_FILE);
    } catch {
      // ignore
    }
  });

  it("removes entries older than 90 days", async () => {
    const { loadStore, addWinner, loadWinners, getWinners } = await import("./store");
    loadStore();

    // Add old entry (100 days ago)
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100);
    addWinner({
      date: oldDate.toISOString().split("T")[0],
      place: "Old Place",
      voteCount: 2,
      totalVotes: 5,
    });

    // Add recent entry
    const today = new Date().toISOString().split("T")[0];
    addWinner({
      date: today,
      place: "New Place",
      voteCount: 3,
      totalVotes: 5,
    });

    // Reload triggers pruning
    loadWinners();
    const winners = getWinners();

    expect(winners.length).toBe(1);
    expect(winners[0].place).toBe("New Place");
  });

  it("keeps entries within 90 days", async () => {
    const { loadStore, addWinner, loadWinners, getWinners } = await import("./store");
    loadStore();

    const today = new Date().toISOString().split("T")[0];
    addWinner({
      date: today,
      place: "Recent Place",
      voteCount: 3,
      totalVotes: 5,
    });

    loadWinners();
    const winners = getWinners();

    expect(winners.length).toBe(1);
    expect(winners[0].place).toBe("Recent Place");
  });

  it("keeps entry exactly 90 days old, removes 91 days old", async () => {
    const { loadStore, addWinner, loadWinners, getWinners } = await import("./store");
    loadStore();

    // 90 days old — should be kept
    const day90 = new Date();
    day90.setDate(day90.getDate() - 90);
    addWinner({
      date: day90.toISOString().split("T")[0],
      place: "Day90",
      voteCount: 1,
      totalVotes: 1,
    });

    // 91 days old — should be removed
    const day91 = new Date();
    day91.setDate(day91.getDate() - 91);
    addWinner({
      date: day91.toISOString().split("T")[0],
      place: "Day91",
      voteCount: 1,
      totalVotes: 1,
    });

    loadWinners();
    const winners = getWinners();

    expect(winners.length).toBe(1);
    expect(winners[0].place).toBe("Day90");
  });

  it("handles empty history", async () => {
    const { loadStore, loadWinners, getWinners } = await import("./store");
    loadStore();

    loadWinners();
    const winners = getWinners();

    expect(winners.length).toBe(0);
  });
});

describe("clearSuggestions", () => {
  it("clears suggestions when round active", async () => {
    const { loadStore, startToday, addSuggestion, clearSuggestions, getToday } = await import("./store");
    loadStore();

    startToday();
    addSuggestion("Taco Bell");
    addSuggestion("Chipotle");

    const result = clearSuggestions();

    expect(result).toBe(true);
    expect(getToday()!.suggestions.length).toBe(0);
  });

  it("returns false when no round started", async () => {
    const { loadStore, clearSuggestions } = await import("./store");
    loadStore();

    const result = clearSuggestions();

    expect(result).toBe(false);
  });

  it("returns false when already empty", async () => {
    const { loadStore, startToday, clearSuggestions } = await import("./store");
    loadStore();

    startToday();

    const result = clearSuggestions();

    expect(result).toBe(false);
  });
});
