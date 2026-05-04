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

  it("breaks tie alphabetically", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(todayDay);
    (store.getVotes as ReturnType<typeof vi.fn>).mockImplementation((place: string) => {
      if (place === "Taco Bell") return new Set(["U1", "U2"]);
      if (place === "Chipotle") return new Set(["U1", "U3"]);
      return new Set();
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handleEndpoll({ say });

    // Chipotle wins alphabetically over Taco Bell (both have 2 votes)
    expect(store.addWinner).toHaveBeenCalledWith({
      date: "2025-01-15",
      place: "Chipotle",
      voteCount: 2,
      totalVotes: 4,
    });
    expect(say).toHaveBeenCalledWith(expect.stringContaining("(tiebreaker: alphabetical)"));
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
    expect(announcement).toContain("1. 🏆 Chipotle — 1 vote");
    expect(announcement).toContain("1. Taco Bell — 1 vote");
    expect(announcement).toContain("3. Panda Express — 0 votes");
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
});
