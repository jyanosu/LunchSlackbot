import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../store", () => ({
  getToday: vi.fn(),
  setVotingStarted: vi.fn(),
  setPollMessageTs: vi.fn(),
  getVotes: vi.fn(),
  hasVoted: vi.fn(),
  toggleVote: vi.fn(),
  setUserName: vi.fn(),
  getUserNames: vi.fn(),
}));

import * as store from "../store";
import handleVote, { handleVoteToggle } from "./vote";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleVote", () => {
  it("rejects when suggestions not started", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    const say = vi.fn().mockResolvedValue(undefined);

    await handleVote({ say });

    expect(say).toHaveBeenCalledWith(
      "Lunch suggestions haven't started yet. Use @LunchSlackBot begin to start."
    );
  });

  it("rejects when voting already started", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      started: true,
      votingStarted: true,
      suggestions: ["Taco Bell"],
      deadline: "11:45 AM",
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handleVote({ say });

    expect(say).toHaveBeenCalledWith("Voting has already started for today.");
  });

  it("rejects when no suggestions", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      started: true,
      votingStarted: false,
      suggestions: [],
      deadline: "11:45 AM",
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handleVote({ say });

    expect(say).toHaveBeenCalledWith(
      "No suggestions yet. Use @LunchSlackBot suggest <place> to add some."
    );
  });

  it("starts voting and posts poll message", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      started: true,
      votingStarted: false,
      suggestions: ["Taco Bell", "Chipotle"],
      deadline: "11:45 AM",
    });
    (store.getVotes as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
    const say = vi.fn().mockResolvedValue({ ts: "1234567890.123456" });

    await handleVote({
      say,
      userId: "U1",
      channelId: "C1",
    });

    expect(store.setVotingStarted).toHaveBeenCalledWith(true);
    expect(say).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Voting is open"),
      })
    );
  });

  it("rejects when channelId is missing", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      started: true,
      votingStarted: false,
      suggestions: ["Taco Bell"],
      deadline: "11:45 AM",
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handleVote({ say, userId: "U1" });

    expect(say).toHaveBeenCalledWith(
      "Sorry, I couldn't determine your channel. Try again."
    );
  });

  it("saves poll message ts when returned", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      started: true,
      votingStarted: false,
      suggestions: ["Taco Bell"],
      deadline: "11:45 AM",
    });
    (store.getVotes as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
    const say = vi.fn().mockResolvedValue({ ts: "9999999.111" });

    await handleVote({ say, userId: "U1", channelId: "C1" });

    expect(store.setPollMessageTs).toHaveBeenCalledWith("9999999.111");
  });

  it("posts announcement before poll message", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      started: true,
      votingStarted: false,
      suggestions: ["Taco Bell", "Chipotle"],
      deadline: "11:45 AM",
    });
    (store.getVotes as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
    const say = vi.fn().mockResolvedValue({ ts: "1234567890.123456" });

    await handleVote({
      say,
      userId: "U1",
      channelId: "C1",
    });

    // First call is announcement, second is poll message
    expect(say).toHaveBeenNthCalledWith(
      1,
      "🗳️ Voting is open! Check the poll below and vote using the buttons."
    );
    expect(say).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        text: expect.stringContaining("Voting is open"),
      })
    );
  });
});

describe("handleVoteToggle", () => {
  it("toggles vote and updates poll message", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      started: true,
      votingStarted: true,
      suggestions: ["Taco Bell", "Chipotle"],
      deadline: "11:45 AM",
    });
    (store.getVotes as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
    (store.getUserNames as ReturnType<typeof vi.fn>).mockReturnValue(new Map<string, string>());
    const mockUpdate = vi.fn().mockResolvedValue({ ok: true });
    const mockClient = {
      chat: { update: mockUpdate },
      users: { info: vi.fn().mockResolvedValue({ ok: true, user: { real_name: "Alice" } }) },
    };

    await handleVoteToggle({
      ack: vi.fn().mockResolvedValue(undefined),
      body: {
        user: { id: "U1" },
        channel: { id: "C1" },
        message: { ts: "1234567890.123456" },
        actions: [{ action_id: "vote_toggle", value: "Taco Bell" }],
      },
      client: mockClient,
    });

    expect(store.toggleVote).toHaveBeenCalledWith("Taco Bell", "U1");
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("returns early when missing required fields", async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ ok: true });
    const mockClient = { chat: { update: mockUpdate } };

    await handleVoteToggle({
      ack: vi.fn().mockResolvedValue(undefined),
      body: {
        user: { id: "U1" },
        channel: { id: "C1" },
        actions: [{ action_id: "vote_toggle", value: "Taco Bell" }],
      },
      client: mockClient,
    });

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns early when voting not started", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      started: true,
      votingStarted: false,
      suggestions: ["Taco Bell"],
      deadline: "11:45 AM",
    });
    const mockUpdate = vi.fn().mockResolvedValue({ ok: true });
    const mockClient = { chat: { update: mockUpdate } };

    await handleVoteToggle({
      ack: vi.fn().mockResolvedValue(undefined),
      body: {
        user: { id: "U1" },
        channel: { id: "C1" },
        message: { ts: "1234567890.123456" },
        actions: [{ action_id: "vote_toggle", value: "Taco Bell" }],
      },
      client: mockClient,
    });

    expect(store.toggleVote).not.toHaveBeenCalled();
  });

  it("returns early when place is not in suggestions", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      started: true,
      votingStarted: true,
      suggestions: ["Taco Bell"],
      deadline: "11:45 AM",
    });
    const mockUpdate = vi.fn().mockResolvedValue({ ok: true });
    const mockClient = { chat: { update: mockUpdate } };

    await handleVoteToggle({
      ack: vi.fn().mockResolvedValue(undefined),
      body: {
        user: { id: "U1" },
        channel: { id: "C1" },
        message: { ts: "1234567890.123456" },
        actions: [{ action_id: "vote_toggle", value: "Chipotle" }],
      },
      client: mockClient,
    });

    expect(store.toggleVote).not.toHaveBeenCalled();
  });

  it("returns early when poll ended", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      started: true,
      votingStarted: true,
      pollEnded: true,
      suggestions: ["Taco Bell"],
      deadline: "11:45 AM",
    });
    const mockUpdate = vi.fn().mockResolvedValue({ ok: true });
    const mockClient = { chat: { update: mockUpdate } };

    await handleVoteToggle({
      ack: vi.fn().mockResolvedValue(undefined),
      body: {
        user: { id: "U1" },
        channel: { id: "C1" },
        message: { ts: "1234567890.123456" },
        actions: [{ action_id: "vote_toggle", value: "Taco Bell" }],
      },
      client: mockClient,
    });

    expect(store.toggleVote).not.toHaveBeenCalled();
  });
});
