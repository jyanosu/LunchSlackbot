import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../store", () => ({
  getToday: vi.fn(),
  setPollMessageTs: vi.fn(),
  getVotes: vi.fn(),
  hasVoted: vi.fn(),
  getUserNames: vi.fn(),
  setUserName: vi.fn(),
  getSchedule: vi.fn(),
}));

import * as store from "../store";
import handleShowpoll from "./showpoll";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleShowpoll", () => {
  it("rejects when suggestions not started", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    const say = vi.fn().mockResolvedValue(undefined);

    await handleShowpoll({ say });

    expect(say).toHaveBeenCalledWith(
      "Lunch suggestions haven't started yet. Use @LunchSlackBot begin to start."
    );
  });

  it("rejects when voting not started", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      started: true,
      votingStarted: false,
      suggestions: ["Taco Bell"],
      deadline: "11:45 AM",
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handleShowpoll({ say });

    expect(say).toHaveBeenCalledWith(
      "Voting hasn't started yet. Use @LunchSlackBot vote to begin voting."
    );
  });

  it("posts poll message when voting is active", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      started: true,
      votingStarted: true,
      suggestions: ["Taco Bell", "Chipotle"],
      deadline: "11:45 AM",
    });
    (store.getVotes as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
    (store.getUserNames as ReturnType<typeof vi.fn>).mockReturnValue(new Map<string, string>());
    (store.getSchedule as ReturnType<typeof vi.fn>).mockReturnValue({ endTime: "11:15" });
    const say = vi.fn().mockResolvedValue({ ts: "1234567890.123456" });

    await handleShowpoll({ say, userId: "U1", channelId: "C1" });

    expect(say).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Voting is open"),
      })
    );
  });

  it("saves poll message ts when returned", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      started: true,
      votingStarted: true,
      suggestions: ["Taco Bell"],
      deadline: "11:45 AM",
    });
    (store.getVotes as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
    (store.getUserNames as ReturnType<typeof vi.fn>).mockReturnValue(new Map<string, string>());
    (store.getSchedule as ReturnType<typeof vi.fn>).mockReturnValue({ endTime: "11:15" });
    const say = vi.fn().mockResolvedValue({ ts: "8888888.999" });

    await handleShowpoll({ say, channelId: "C1" });

    expect(store.setPollMessageTs).toHaveBeenCalledWith("8888888.999");
  });

  it("rejects when poll ended", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      started: true,
      votingStarted: true,
      pollEnded: true,
      suggestions: ["Taco Bell"],
      deadline: "11:45 AM",
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handleShowpoll({ say });

    expect(say).toHaveBeenCalledWith("Poll has already ended for today.");
  });
});
