import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../store", () => ({
  getToday: vi.fn(),
  toggleExpandedSuggestion: vi.fn(),
  getExpandedSuggestions: vi.fn(),
}));

vi.mock("./vote", () => ({
  buildPollBlocks: vi.fn(),
}));

describe("handleExpandVoters", () => {
  let handleExpandVoters: any;
  let store: any;
  let vote: any;
  let mockClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    store = await import("../store");
    vote = await import("./vote");
    const mod = await import("./expandvoters");
    handleExpandVoters = mod.handleExpandVoters;

    mockClient = {
      chat: {
        update: vi.fn().mockResolvedValue({ ok: true }),
      },
      users: {
        info: vi.fn().mockResolvedValue({ ok: false }),
      },
    };
  });

  it("toggles expanded state and updates poll message", async () => {
    const today = {
      started: true,
      votingStarted: true,
      suggestions: ["Taco Bell"],
      deadline: "11:45 AM",
      expandedSuggestions: [],
    };
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(today);
    (store.getExpandedSuggestions as ReturnType<typeof vi.fn>).mockReturnValue(new Set(["Taco Bell"]));
    (vote.buildPollBlocks as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const body = {
      actions: [{ value: "Taco Bell" }],
      channel: { id: "C1" },
      message: { ts: "1234567890.123456" },
    };

    await handleExpandVoters({
      ack: vi.fn().mockResolvedValue(undefined),
      body,
      client: mockClient,
    });

    expect(store.toggleExpandedSuggestion).toHaveBeenCalledWith("Taco Bell");
    expect(mockClient.chat.update).toHaveBeenCalledWith({
      channel: "C1",
      ts: "1234567890.123456",
      text: "🗳️ *Voting is open!*",
      blocks: [],
    });
  });

  it("returns early when voting not started", async () => {
    const today = {
      started: true,
      votingStarted: false,
      suggestions: ["Taco Bell"],
      deadline: "11:45 AM",
    };
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(today);

    const body = {
      actions: [{ value: "Taco Bell" }],
      channel: { id: "C1" },
      message: { ts: "1234567890.123456" },
    };

    await handleExpandVoters({
      ack: vi.fn().mockResolvedValue(undefined),
      body,
      client: mockClient,
    });

    expect(store.toggleExpandedSuggestion).not.toHaveBeenCalled();
    expect(mockClient.chat.update).not.toHaveBeenCalled();
  });

  it("returns early when poll ended", async () => {
    const today = {
      started: true,
      votingStarted: true,
      pollEnded: true,
      suggestions: ["Taco Bell"],
      deadline: "11:45 AM",
    };
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(today);

    const body = {
      actions: [{ value: "Taco Bell" }],
      channel: { id: "C1" },
      message: { ts: "1234567890.123456" },
    };

    await handleExpandVoters({
      ack: vi.fn().mockResolvedValue(undefined),
      body,
      client: mockClient,
    });

    expect(store.toggleExpandedSuggestion).not.toHaveBeenCalled();
    expect(mockClient.chat.update).not.toHaveBeenCalled();
  });

  it("returns early when missing required fields", async () => {
    const body = {
      actions: [],
      channel: { id: "C1" },
      message: { ts: "1234567890.123456" },
    };

    await handleExpandVoters({
      ack: vi.fn().mockResolvedValue(undefined),
      body,
      client: mockClient,
    });

    expect(store.toggleExpandedSuggestion).not.toHaveBeenCalled();
    expect(mockClient.chat.update).not.toHaveBeenCalled();
  });
});
