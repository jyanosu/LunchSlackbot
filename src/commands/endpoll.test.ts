import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../store", () => ({
  getToday: vi.fn(),
  endPoll: vi.fn(),
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

  it("posts final announcement with winner", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(todayDay);
    (store.endPoll as ReturnType<typeof vi.fn>).mockReturnValue({
      winner: { place: "Taco Bell", votes: 3 },
      results: [
        { place: "Taco Bell", votes: 3, rank: 1 },
        { place: "Chipotle", votes: 2, rank: 2 },
        { place: "Panda Express", votes: 1, rank: 3 },
      ],
      isTie: false,
      totalVotes: 6,
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handleEndpoll({ say });

    const announcement = say.mock.calls[0][0];
    expect(announcement).toContain("🏆 *Taco Bell* — 3 votes");
    expect(announcement).toContain("1. 🏆 Taco Bell — 3 votes");
    expect(announcement).toContain("2. Chipotle — 2 votes");
    expect(announcement).toContain("3. Panda Express — 1 vote");
    expect(announcement).not.toContain("tiebreaker");
  });

  it("shows tiebreaker note on tie", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(todayDay);
    (store.endPoll as ReturnType<typeof vi.fn>).mockReturnValue({
      winner: { place: "Chipotle", votes: 2 },
      results: [
        { place: "Chipotle", votes: 2, rank: 1 },
        { place: "Taco Bell", votes: 2, rank: 1 },
        { place: "Panda Express", votes: 0, rank: 3 },
      ],
      isTie: true,
      totalVotes: 4,
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handleEndpoll({ say });

    const announcement = say.mock.calls[0][0];
    expect(announcement).toContain("(tiebreaker: random)");
    expect(announcement).toContain("Chipotle — 2 votes");
    expect(announcement).toContain("Taco Bell — 2 votes");
  });

  it("uses singular 'vote' when count is 1", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(todayDay);
    (store.endPoll as ReturnType<typeof vi.fn>).mockReturnValue({
      winner: { place: "Taco Bell", votes: 1 },
      results: [
        { place: "Taco Bell", votes: 1, rank: 1 },
        { place: "Chipotle", votes: 0, rank: 2 },
      ],
      isTie: false,
      totalVotes: 1,
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handleEndpoll({ say });

    const announcement = say.mock.calls[0][0];
    expect(announcement).toContain("🏆 *Taco Bell* — 1 vote");
    expect(announcement).not.toContain("1 votes");
  });

  it("all suggestions appear in results (even with 0 votes)", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(todayDay);
    (store.endPoll as ReturnType<typeof vi.fn>).mockReturnValue({
      winner: { place: "Chipotle", votes: 0 },
      results: [
        { place: "Chipotle", votes: 0, rank: 1 },
        { place: "Panda Express", votes: 0, rank: 1 },
        { place: "Taco Bell", votes: 0, rank: 1 },
      ],
      isTie: true,
      totalVotes: 0,
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handleEndpoll({ say });

    const announcement = say.mock.calls[0][0];
    expect(announcement).toContain("Taco Bell");
    expect(announcement).toContain("Chipotle");
    expect(announcement).toContain("Panda Express");
  });

  it("handles endPoll returning undefined", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(todayDay);
    (store.endPoll as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    const say = vi.fn().mockResolvedValue(undefined);

    await handleEndpoll({ say });

    expect(say).toHaveBeenCalledWith("Could not end poll. Poll may have already ended.");
  });
});
