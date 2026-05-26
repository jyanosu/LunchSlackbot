import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../store", () => ({
  getToday: vi.fn(),
  startVoting: vi.fn(),
  setPollMessageTs: vi.fn(),
  setPollChannelId: vi.fn(),
  getVotes: vi.fn(),
  hasVoted: vi.fn(),
  toggleVote: vi.fn(),
  setUserName: vi.fn(),
  getUserNames: vi.fn(),
  getSchedule: vi.fn(),
  getExpandedSuggestions: vi.fn(),
}));

vi.mock("../app-context", () => ({
  getClient: vi.fn(),
  setBoltApp: vi.fn(),
}));

import * as store from "../store";
import * as appContext from "../app-context";
import handleVote, { handleVoteToggle, updatePollMessage } from "./vote";

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
    const todayDay = {
      started: true,
      votingStarted: false,
      suggestions: ["Taco Bell", "Chipotle"],
      deadline: "11:45 AM",
    };
    const votingDay = { ...todayDay, votingStarted: true };
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(todayDay);
    (store.startVoting as ReturnType<typeof vi.fn>).mockReturnValue(votingDay);
    (store.getVotes as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
    (store.getExpandedSuggestions as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
    (store.getSchedule as ReturnType<typeof vi.fn>).mockReturnValue({ endTime: "11:15" });
    const say = vi.fn().mockResolvedValue({ ts: "1234567890.123456" });

    await handleVote({
      say,
      userId: "U1",
      channelId: "C1",
    });

    expect(store.startVoting).toHaveBeenCalled();
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
    const todayDay = {
      started: true,
      votingStarted: false,
      suggestions: ["Taco Bell"],
      deadline: "11:45 AM",
    };
    const votingDay = { ...todayDay, votingStarted: true };
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(todayDay);
    (store.startVoting as ReturnType<typeof vi.fn>).mockReturnValue(votingDay);
    (store.getVotes as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
    (store.getExpandedSuggestions as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
    (store.getSchedule as ReturnType<typeof vi.fn>).mockReturnValue({ endTime: "11:15" });
    const say = vi.fn().mockResolvedValue({ ts: "9999999.111" });

    await handleVote({ say, userId: "U1", channelId: "C1" });

    expect(store.setPollMessageTs).toHaveBeenCalledWith("9999999.111");
  });

  it("posts announcement before poll message", async () => {
    const todayDay = {
      started: true,
      votingStarted: false,
      suggestions: ["Taco Bell", "Chipotle"],
      deadline: "11:45 AM",
    };
    const votingDay = { ...todayDay, votingStarted: true };
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(todayDay);
    (store.startVoting as ReturnType<typeof vi.fn>).mockReturnValue(votingDay);
    (store.getVotes as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
    (store.getExpandedSuggestions as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
    (store.getSchedule as ReturnType<typeof vi.fn>).mockReturnValue({ endTime: "11:15" });
    const say = vi.fn().mockResolvedValue({ ts: "1234567890.123456" });

    await handleVote({
      say,
      userId: "U1",
      channelId: "C1",
    });

    // First call is announcement, second is poll message
    expect(say).toHaveBeenNthCalledWith(
      1,
      "🗳️ Voting is open! Check the poll below and vote using the buttons. Voting closes at 11:15 EST."
    );
    expect(say).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        text: expect.stringContaining("Voting is open"),
      })
    );
  });

  it("does not include voter list section block", async () => {
    const todayDay = {
      started: true,
      votingStarted: false,
      suggestions: ["Taco Bell"],
      deadline: "11:45 AM",
    };
    const votingDay = { ...todayDay, votingStarted: true };
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(todayDay);
    (store.startVoting as ReturnType<typeof vi.fn>).mockReturnValue(votingDay);
    (store.getVotes as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
    (store.getExpandedSuggestions as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
    (store.getSchedule as ReturnType<typeof vi.fn>).mockReturnValue({ endTime: "11:15" });
    const say = vi.fn().mockResolvedValue({ ts: "1234567890.123456" });

    await handleVote({ say, userId: "U1", channelId: "C1" });

    const pollMessage = say.mock.calls[1][0] as any;
    const sectionBlocks = pollMessage.blocks?.filter((b: any) => b.type === "section");
    expect(sectionBlocks).toHaveLength(0);
  });

  it("includes ? button when votes exist", async () => {
    const todayDay = {
      started: true,
      votingStarted: false,
      suggestions: ["Taco Bell"],
      deadline: "11:45 AM",
    };
    const votingDay = { ...todayDay, votingStarted: true };
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(todayDay);
    (store.startVoting as ReturnType<typeof vi.fn>).mockReturnValue(votingDay);
    (store.getVotes as ReturnType<typeof vi.fn>).mockReturnValue(new Set(["U1"]));
    (store.getUserNames as ReturnType<typeof vi.fn>).mockReturnValue(new Map<string, string>());
    (store.getExpandedSuggestions as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
    (store.getSchedule as ReturnType<typeof vi.fn>).mockReturnValue({ endTime: "11:15" });
    const say = vi.fn().mockResolvedValue({ ts: "1234567890.123456" });

    await handleVote({ say, userId: "U1", channelId: "C1" });

    const pollMessage = say.mock.calls[1][0] as any;
    const actionBlock = pollMessage.blocks?.find((b: any) => b.type === "actions");
    expect(actionBlock.elements.length).toBe(2); // vote toggle + ?
    expect(actionBlock.elements[1].text.text).toBe("?");
    expect(actionBlock.elements[1].action_id).toBe("expand_voters");
  });

  it("shows voter section when suggestion is expanded", async () => {
    const todayDay = {
      started: true,
      votingStarted: false,
      suggestions: ["Taco Bell"],
      deadline: "11:45 AM",
    };
    const votingDay = { ...todayDay, votingStarted: true };
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(todayDay);
    (store.startVoting as ReturnType<typeof vi.fn>).mockReturnValue(votingDay);
    (store.getVotes as ReturnType<typeof vi.fn>).mockReturnValue(new Set(["U1"]));
    (store.getUserNames as ReturnType<typeof vi.fn>).mockReturnValue(new Map<string, string>());
    (store.getExpandedSuggestions as ReturnType<typeof vi.fn>).mockReturnValue(new Set(["Taco Bell"]));
    (store.getSchedule as ReturnType<typeof vi.fn>).mockReturnValue({ endTime: "11:15" });
    const say = vi.fn().mockResolvedValue({ ts: "1234567890.123456" });

    await handleVote({ say, userId: "U1", channelId: "C1" });

    const pollMessage = say.mock.calls[1][0] as any;
    const sectionBlocks = pollMessage.blocks?.filter((b: any) => b.type === "section");
    expect(sectionBlocks).toHaveLength(1);
  });

  it("shows auto-pick warning when autoPicked is true", async () => {
    const todayDay = {
      date: "2025-01-15",
      suggestions: ["Taco Bell", "Chipotle", "In-N-Out", "Panda Express", "Subway"],
      deadline: "11:00 AM",
      started: true,
      autoPicked: true,
    };
    const votingDay = { ...todayDay, votingStarted: true };
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(todayDay);
    (store.startVoting as ReturnType<typeof vi.fn>).mockReturnValue(votingDay);
    (store.getVotes as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
    (store.getUserNames as ReturnType<typeof vi.fn>).mockReturnValue(new Map<string, string>());
    (store.getExpandedSuggestions as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
    (store.getSchedule as ReturnType<typeof vi.fn>).mockReturnValue({ endTime: "11:15" });
    const say = vi.fn().mockResolvedValue({ ts: "1234567890.123456" });

    await handleVote({ say, userId: "U1", channelId: "C1" });

    // First call is auto-pick warning
    expect(say.mock.calls[0][0]).toContain("⚠️ No suggestions received");
    expect(say.mock.calls[0][0]).toContain("auto-picked 5 places from master list");
  });

  it("does not show auto-pick warning when suggestions existed", async () => {
    const todayDay = {
      date: "2025-01-15",
      suggestions: ["Taco Bell"],
      deadline: "11:00 AM",
      started: true,
    };
    const votingDay = { ...todayDay, votingStarted: true };
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(todayDay);
    (store.startVoting as ReturnType<typeof vi.fn>).mockReturnValue(votingDay);
    (store.getVotes as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
    (store.getUserNames as ReturnType<typeof vi.fn>).mockReturnValue(new Map<string, string>());
    (store.getExpandedSuggestions as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
    (store.getSchedule as ReturnType<typeof vi.fn>).mockReturnValue({ endTime: "11:15" });
    const say = vi.fn().mockResolvedValue({ ts: "1234567890.123456" });

    await handleVote({ say, userId: "U1", channelId: "C1" });

    expect(say.mock.calls[0][0]).not.toContain("auto-picked");
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
    (store.getExpandedSuggestions as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
    (store.getUserNames as ReturnType<typeof vi.fn>).mockReturnValue(new Map<string, string>());
    (store.getSchedule as ReturnType<typeof vi.fn>).mockReturnValue({ endTime: "11:15" });
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

describe("updatePollMessage", () => {
  const mockClient = {
    chat: {
      update: vi.fn().mockResolvedValue({ ok: true }),
      postMessage: vi.fn().mockResolvedValue({ ts: "9999999.111" }),
    },
    users: { info: vi.fn().mockResolvedValue({ ok: true, user: { real_name: "Alice" } }) },
  };

  beforeEach(() => {
    (store.getVotes as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
    (store.getExpandedSuggestions as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
    (store.getUserNames as ReturnType<typeof vi.fn>).mockReturnValue(new Map<string, string>());
    (store.getSchedule as ReturnType<typeof vi.fn>).mockReturnValue({ endTime: "11:15" });
    (appContext.getClient as ReturnType<typeof vi.fn>).mockReturnValue(mockClient);
    mockClient.chat.update.mockReset();
    mockClient.chat.postMessage.mockReset();
  });

  it("updates poll message when voting is active", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      started: true,
      votingStarted: true,
      pollEnded: false,
      suggestions: ["Taco Bell", "Chipotle"],
      pollMessageTs: "1234567890.123456",
      pollChannelId: "C1",
      deadline: "11:45 AM",
    });

    await updatePollMessage();

    expect(mockClient.chat.update).toHaveBeenCalledWith({
      channel: "C1",
      ts: "1234567890.123456",
      text: "🗳️ *Voting is open!* Closes at 11:15 EST",
      blocks: expect.any(Array),
    });
  });

  it("is no-op when voting not started", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      started: true,
      votingStarted: false,
      suggestions: ["Taco Bell"],
      deadline: "11:45 AM",
    });

    await updatePollMessage();

    expect(mockClient.chat.update).not.toHaveBeenCalled();
  });

  it("is no-op when poll ended", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      started: true,
      votingStarted: true,
      pollEnded: true,
      suggestions: ["Taco Bell"],
      pollMessageTs: "1234567890.123456",
      pollChannelId: "C1",
      deadline: "11:45 AM",
    });

    await updatePollMessage();

    expect(mockClient.chat.update).not.toHaveBeenCalled();
  });

  it("is no-op when pollMessageTs is missing", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      started: true,
      votingStarted: true,
      pollEnded: false,
      suggestions: ["Taco Bell"],
      pollChannelId: "C1",
      deadline: "11:45 AM",
    });

    await updatePollMessage();

    expect(mockClient.chat.update).not.toHaveBeenCalled();
  });

  it("is no-op when pollChannelId is missing", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      started: true,
      votingStarted: true,
      pollEnded: false,
      suggestions: ["Taco Bell"],
      pollMessageTs: "1234567890.123456",
      deadline: "11:45 AM",
    });

    await updatePollMessage();

    expect(mockClient.chat.update).not.toHaveBeenCalled();
  });

  it("is no-op when client is unavailable", async () => {
    (appContext.getClient as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      started: true,
      votingStarted: true,
      pollEnded: false,
      suggestions: ["Taco Bell"],
      pollMessageTs: "1234567890.123456",
      pollChannelId: "C1",
      deadline: "11:45 AM",
    });

    await updatePollMessage();

    expect(mockClient.chat.update).not.toHaveBeenCalled();
  });

  it("posts fresh poll when update fails", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      started: true,
      votingStarted: true,
      pollEnded: false,
      suggestions: ["Taco Bell"],
      pollMessageTs: "1234567890.123456",
      pollChannelId: "C1",
      deadline: "11:45 AM",
    });
    const mockUpdateFn = vi.fn().mockRejectedValue(new Error("message not found"));
    mockClient.chat.update = mockUpdateFn;

    await updatePollMessage();

    expect(mockClient.chat.postMessage).toHaveBeenCalled();
    const postCall = mockClient.chat.postMessage.mock.calls[0][0] as any;
    expect(postCall.channel).toBe("C1");
  });

  it("shows no-suggestions block when suggestions are empty", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      started: true,
      votingStarted: true,
      pollEnded: false,
      suggestions: [],
      pollMessageTs: "1234567890.123456",
      pollChannelId: "C1",
      deadline: "11:45 AM",
    });

    await updatePollMessage();

    const call = mockClient.chat.update.mock.calls[0][0] as any;
    expect(call.blocks).toHaveLength(1);
    expect(call.blocks[0].type).toBe("section");
    expect(call.blocks[0].text.text).toContain("No suggestions");
  });
});
