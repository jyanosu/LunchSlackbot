import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../store", () => ({
  getToday: vi.fn(),
  getVotes: vi.fn(),
  setPollEnded: vi.fn(),
  addWinner: vi.fn(),
}));

import * as store from "../store";
import handleEndpoll from "./endpoll";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleEndpoll", () => {
  const todayDay = {
    date: "2025-01-15",
    suggestions: ["Taco Bell", "Chipotle", "Panda Express"],
    deadline: "11:45 AM",
    started: true,
    votingStarted: true,
    pollEnded: false,
  };

  it("rejects when no round started", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    const say = vi.fn().mockResolvedValue(undefined);

    await handleEndpoll({ say });

    expect(say).toHaveBeenCalledWith(
      "Lunch suggestions haven't started yet. Use @LunchSlackBot begin to start."
    );
  });

  it("rejects when voting not started", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      ...todayDay,
      votingStarted: false,
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handleEndpoll({ say });

    expect(say).toHaveBeenCalledWith(
      "Voting hasn't started yet. Use @LunchSlackBot vote to begin voting."
    );
  });

  it("rejects when poll already ended", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      ...todayDay,
      pollEnded: true,
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handleEndpoll({ say });

    expect(say).toHaveBeenCalledWith("Poll has already ended for today.");
  });

  it("computes winner correctly (highest votes)", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(todayDay);
    (store.getVotes as ReturnType<typeof vi.fn>).mockImplementation((place: string) => {
      if (place === "Taco Bell") return new Set(["U1", "U2", "U3"]);
      if (place === "Chipotle") return new Set(["U1"]);
      return new Set(["U2"]);
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handleEndpoll({ say });

    expect(store.addWinner).toHaveBeenCalledWith({
      date: "2025-01-15",
      place: "Taco Bell",
      voteCount: 3,
      totalVotes: 5,
    });
    expect(store.setPollEnded).toHaveBeenCalled();
    expect(say).toHaveBeenCalledWith(expect.stringContaining("🏆 *Taco Bell*"));
  });

  it("picks random winner on tie", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(todayDay);
    (store.getVotes as ReturnType<typeof vi.fn>).mockImplementation((place: string) => {
      if (place === "Taco Bell") return new Set(["U1", "U2"]);
      if (place === "Chipotle") return new Set(["U1", "U3"]);
      return new Set();
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handleEndpoll({ say });

    // Winner is one of the tied places
    const winnerCall = (store.addWinner as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(["Chipotle", "Taco Bell"]).toContain(winnerCall.place);
    expect(winnerCall.voteCount).toBe(2);
    expect(say).toHaveBeenCalledWith(expect.stringContaining("(tiebreaker: random)"));
  });

  it("posts final announcement with ordered results", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(todayDay);
    (store.getVotes as ReturnType<typeof vi.fn>).mockImplementation((place: string) => {
      if (place === "Taco Bell") return new Set(["U1", "U2", "U3"]);
      if (place === "Chipotle") return new Set(["U1", "U2"]);
      return new Set(["U1"]);
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handleEndpoll({ say });

    const announcement = say.mock.calls[0][0];
    expect(announcement).toContain("1. 🏆 Taco Bell — 3 votes");
    expect(announcement).toContain("2. Chipotle — 2 votes");
    expect(announcement).toContain("3. Panda Express — 1 vote");
  });

  it("all suggestions appear in results (even with 0 votes)", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(todayDay);
    (store.getVotes as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
    const say = vi.fn().mockResolvedValue(undefined);

    await handleEndpoll({ say });

    const announcement = say.mock.calls[0][0];
    expect(announcement).toContain("Taco Bell");
    expect(announcement).toContain("Chipotle");
    expect(announcement).toContain("Panda Express");
  });

  it("tie shows same rank number", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(todayDay);
    (store.getVotes as ReturnType<typeof vi.fn>).mockImplementation((place: string) => {
      if (place === "Taco Bell") return new Set(["U1"]);
      if (place === "Chipotle") return new Set(["U2"]);
      return new Set();
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handleEndpoll({ say });

    const announcement = say.mock.calls[0][0];
    // Both tied places show rank 1 (sorted alphabetically: Chipotle first)
    expect(announcement).toContain("Chipotle — 1 vote");
    expect(announcement).toContain("Taco Bell — 1 vote");
    expect(announcement).toContain("Panda Express — 0 votes");
    // One of the tied places has the trophy
    const chipotleLine = announcement.split("\n").find((l) => l.includes("Chipotle"));
    const tacoLine = announcement.split("\n").find((l) => l.includes("Taco Bell"));
    const trophyCount = (chipotleLine?.includes("🏆") ? 1 : 0) + (tacoLine?.includes("🏆") ? 1 : 0);
    expect(trophyCount).toBe(1);
  });

  it("saves winner to history", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(todayDay);
    (store.getVotes as ReturnType<typeof vi.fn>).mockImplementation((place: string) => {
      if (place === "Taco Bell") return new Set(["U1"]);
      return new Set();
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handleEndpoll({ say });

    expect(store.addWinner).toHaveBeenCalledWith({
      date: "2025-01-15",
      place: "Taco Bell",
      voteCount: 1,
      totalVotes: 1,
    });
  });

  it("marks poll as ended", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(todayDay);
    (store.getVotes as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
    const say = vi.fn().mockResolvedValue(undefined);

    await handleEndpoll({ say });

    expect(store.setPollEnded).toHaveBeenCalled();
  });

  it("uses singular 'vote' when count is 1", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(todayDay);
    (store.getVotes as ReturnType<typeof vi.fn>).mockImplementation((place: string) => {
      if (place === "Taco Bell") return new Set(["U1"]);
      return new Set();
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handleEndpoll({ say });

    const announcement = say.mock.calls[0][0];
    expect(announcement).toContain("🏆 *Taco Bell* — 1 vote");
    expect(announcement).not.toContain("1 votes");
  });

  it("picks random winner when all places tied at 0 votes", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(todayDay);
    (store.getVotes as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
    const say = vi.fn().mockResolvedValue(undefined);

    await handleEndpoll({ say });

    const winnerCall = (store.addWinner as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(["Chipotle", "Panda Express", "Taco Bell"]).toContain(winnerCall.place);
    expect(winnerCall.voteCount).toBe(0);
    expect(winnerCall.totalVotes).toBe(0);
    expect(say).toHaveBeenCalledWith(expect.stringContaining("(tiebreaker: random)"));
  });

  it("handles single suggestion", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      ...todayDay,
      suggestions: ["Taco Bell"],
    });
    (store.getVotes as ReturnType<typeof vi.fn>).mockReturnValue(new Set(["U1", "U2"]));
    const say = vi.fn().mockResolvedValue(undefined);

    await handleEndpoll({ say });

    expect(store.addWinner).toHaveBeenCalledWith({
      date: "2025-01-15",
      place: "Taco Bell",
      voteCount: 2,
      totalVotes: 2,
    });
    const announcement = say.mock.calls[0][0];
    expect(announcement).not.toContain("tiebreaker");
  });
});
