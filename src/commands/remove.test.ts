import { describe, it, expect, vi, beforeEach } from "vitest";

let mockGetToday: ReturnType<typeof vi.fn>;
let mockRemoveSuggestion: ReturnType<typeof vi.fn>;
let mockStartToday: ReturnType<typeof vi.fn>;
let mockResetStore: ReturnType<typeof vi.fn>;
let mockAdd: ReturnType<typeof vi.fn>;
let mockCheck: ReturnType<typeof vi.fn>;
let mockUpdatePollMessage: ReturnType<typeof vi.fn>;

vi.mock("../store", () => ({
  getToday: vi.fn(),
  removeSuggestion: vi.fn(),
  startToday: vi.fn(),
  resetStore: vi.fn(),
  clearSuggestions: vi.fn(),
  getSchedule: vi.fn().mockReturnValue({ beginTime: "09:30", voteTime: "10:30", endTime: "11:15", days: "*", enabled: true }),
}));

vi.mock("../confirmations", () => ({
  add: vi.fn(),
  check: vi.fn(),
}));

vi.mock("../time-util", () => ({
  formatTime12: vi.fn().mockReturnValue("10:30 AM"),
}));

vi.mock("./vote", () => ({
  updatePollMessage: vi.fn().mockResolvedValue(undefined),
  buildPollBlocks: vi.fn(),
  handleVoteToggle: vi.fn(),
}));

import * as store from "../store";
import * as confirmations from "../confirmations";
import * as vote from "./vote";
import handleRemove, { handleBlockAction } from "./remove";

beforeEach(() => {
  mockGetToday = store.getToday as ReturnType<typeof vi.fn>;
  mockRemoveSuggestion = store.removeSuggestion as ReturnType<typeof vi.fn>;
  mockStartToday = store.startToday as ReturnType<typeof vi.fn>;
  mockResetStore = store.resetStore as ReturnType<typeof vi.fn>;
  mockAdd = confirmations.add as ReturnType<typeof vi.fn>;
  mockCheck = confirmations.check as ReturnType<typeof vi.fn>;
  mockUpdatePollMessage = vote.updatePollMessage as ReturnType<typeof vi.fn>;
  vi.clearAllMocks();
});

describe("remove command", () => {
  const todayDay = {
    date: "2025-01-15",
    suggestions: ["Taco Bell", "Chipotle"],
    deadline: "11:00 AM",
    started: true,
  };

  it("prompts for confirmation for valid place", async () => {
    mockGetToday.mockReturnValue(todayDay);

    const say = vi.fn().mockResolvedValue(undefined);
    await handleRemove({ say, args: "Taco Bell", userId: "U1", channelId: "C1" });

    expect(say).toHaveBeenCalledWith({
      text: "Remove *Taco Bell* from today's suggestions?",
      blocks: [
        {
          type: "section",
          text: { type: "mrkdwn", text: "Remove *Taco Bell* from today's suggestions?" },
          accessory: {
            type: "button",
            text: { type: "plain_text", text: "Yes", emoji: false },
            action_id: "confirm_remove",
            style: "danger",
          },
        },
      ],
    });
    expect(mockAdd).toHaveBeenCalledWith("U1", "C1", "remove", "Taco Bell");
  });

  it("shows usage hint when no place name", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleRemove({ say, args: "" });

    expect(say).toHaveBeenCalledWith("Usage: @LunchSlackBot remove <place>");
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("rejects removal when poll ended", async () => {
    mockGetToday.mockReturnValue({
      ...todayDay,
      pollEnded: true,
    });

    const say = vi.fn().mockResolvedValue(undefined);
    await handleRemove({ say, args: "Taco Bell", userId: "U1", channelId: "C1" });

    expect(say).toHaveBeenCalledWith("Poll has already ended for today. Start a new round with @LunchSlackBot begin.");
  });

  it("shows not found for non-existent place", async () => {
    mockGetToday.mockReturnValue(todayDay);

    const say = vi.fn().mockResolvedValue(undefined);
    await handleRemove({ say, args: "Subway", userId: "U1", channelId: "C1" });

    expect(say).toHaveBeenCalledWith("*Subway* is not in today's suggestions.");
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("prompts to begin when day not started", async () => {
    mockGetToday.mockReturnValue(undefined);

    const say = vi.fn().mockResolvedValue(undefined);
    await handleRemove({ say, args: "Taco Bell", userId: "U1", channelId: "C1" });

    expect(say).toHaveBeenCalledWith(
      "Lunch suggestions haven't started yet. Use @LunchSlackBot begin to start."
    );
  });

  it("errors when userId or channelId missing", async () => {
    mockGetToday.mockReturnValue(todayDay);

    const say = vi.fn().mockResolvedValue(undefined);
    await handleRemove({ say, args: "Taco Bell" });

    expect(say).toHaveBeenCalledWith(
      "Sorry, I couldn't determine your user or channel. Try again."
    );
    expect(mockAdd).not.toHaveBeenCalled();
  });
});

describe("handleBlockAction", () => {
  const mockAck = vi.fn().mockResolvedValue(undefined);
  const mockUpdate = vi.fn().mockResolvedValue({ ok: true });
  const mockPostMessage = vi.fn().mockResolvedValue({ ok: true });
  const mockClient = { chat: { update: mockUpdate, postMessage: mockPostMessage } };

  it("starts round on confirm_begin button click", async () => {
    mockStartToday.mockReturnValue({ date: "2025-01-15", suggestions: [], deadline: "11:00 AM EST", started: true });
    mockCheck.mockReturnValue({ type: "begin", payload: null });

    await handleBlockAction({
      ack: mockAck,
      body: {
        user: { id: "U1" },
        channel: { id: "C1" },
        message: { ts: "1234567890.123456" },
        actions: [{ action_id: "confirm_begin" }],
      },
      client: mockClient,
    });

    expect(mockAck).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({
      channel: "C1",
      ts: "1234567890.123456",
      text: "🍱 Lunch suggestions are open! Use @LunchSlackBot suggest <place> to add a place. Voting starts at 10:30 AM EST.",
    });
    expect(mockPostMessage).toHaveBeenCalledWith({
      channel: "C1",
      text: "🍱 Lunch suggestions are open! Use @LunchSlackBot suggest <place> to add a place. Voting starts at 10:30 AM EST.",
    });
  });

  it("removes place on confirm_remove button click", async () => {
    mockCheck.mockReturnValue({ type: "remove", payload: "Taco Bell" });
    mockRemoveSuggestion.mockReturnValue(true);

    await handleBlockAction({
      ack: mockAck,
      body: {
        user: { id: "U1" },
        channel: { id: "C1" },
        message: { ts: "1234567890.123456" },
        actions: [{ action_id: "confirm_remove" }],
      },
      client: mockClient,
    });

    expect(mockRemoveSuggestion).toHaveBeenCalledWith("Taco Bell");
    expect(mockUpdate).toHaveBeenCalledWith({
      channel: "C1",
      ts: "1234567890.123456",
      text: "✅ Removed *Taco Bell* from today's suggestions.",
    });
  });

  it("confirm_remove triggers poll update during active voting", async () => {
    mockCheck.mockReturnValue({ type: "remove", payload: "Taco Bell" });
    mockRemoveSuggestion.mockReturnValue(true);
    mockGetToday.mockReturnValue({
      date: "2025-01-15",
      suggestions: ["Chipotle"],
      deadline: "11:00 AM",
      started: true,
      votingStarted: true,
    });

    await handleBlockAction({
      ack: mockAck,
      body: {
        user: { id: "U1" },
        channel: { id: "C1" },
        message: { ts: "1234567890.123456" },
        actions: [{ action_id: "confirm_remove" }],
      },
      client: mockClient,
    });

    expect(mockUpdatePollMessage).toHaveBeenCalled();
  });

  it("confirm_remove does NOT trigger poll update when voting not started", async () => {
    mockCheck.mockReturnValue({ type: "remove", payload: "Taco Bell" });
    mockRemoveSuggestion.mockReturnValue(true);
    mockGetToday.mockReturnValue({
      date: "2025-01-15",
      suggestions: ["Chipotle"],
      deadline: "11:00 AM",
      started: true,
      votingStarted: false,
    });

    await handleBlockAction({
      ack: mockAck,
      body: {
        user: { id: "U1" },
        channel: { id: "C1" },
        message: { ts: "1234567890.123456" },
        actions: [{ action_id: "confirm_remove" }],
      },
      client: mockClient,
    });

    expect(mockUpdatePollMessage).not.toHaveBeenCalled();
  });

  it("returns early when userId is missing", async () => {
    mockCheck.mockReturnValue(undefined);

    await handleBlockAction({
      ack: mockAck,
      body: {
        channel: { id: "C1" },
        message: { ts: "1234567890.123456" },
        actions: [{ action_id: "confirm_begin" }],
      },
      client: mockClient,
    });

    expect(mockAck).toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns early when no pending confirmation exists", async () => {
    mockCheck.mockReturnValue(undefined);

    await handleBlockAction({
      ack: mockAck,
      body: {
        user: { id: "U1" },
        channel: { id: "C1" },
        message: { ts: "1234567890.123456" },
        actions: [{ action_id: "confirm_begin" }],
      },
      client: mockClient,
    });

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("resets store on confirm_adminreset button click", async () => {
    mockCheck.mockReturnValue({ type: "adminreset", payload: null });

    await handleBlockAction({
      ack: mockAck,
      body: {
        user: { id: "U1" },
        channel: { id: "C1" },
        message: { ts: "1234567890.123456" },
        actions: [{ action_id: "confirm_adminreset" }],
      },
      client: mockClient,
    });

    expect(mockResetStore).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({
      channel: "C1",
      ts: "1234567890.123456",
      text: "🗑️ LunchBot has been reset. Master list preserved.",
    });
  });

  it("clears suggestions on confirm_clearsuggestions button click", async () => {
    mockCheck.mockReturnValue({ type: "clearsuggestions", payload: null, timeout: {} as any });

    await handleBlockAction({
      ack: mockAck,
      body: {
        user: { id: "U1" },
        channel: { id: "C1" },
        message: { ts: "1234567890.123456" },
        actions: [{ action_id: "confirm_clearsuggestions" }],
      },
      client: mockClient,
    });

    expect(store.clearSuggestions).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({
      channel: "C1",
      ts: "1234567890.123456",
      text: "🗑️ Suggestions cleared.",
    });
  });

  it("confirm_clearsuggestions triggers poll update during active voting", async () => {
    mockCheck.mockReturnValue({ type: "clearsuggestions", payload: null, timeout: {} as any });
    mockGetToday.mockReturnValue({
      date: "2025-01-15",
      suggestions: [],
      deadline: "11:00 AM",
      started: true,
      votingStarted: true,
    });

    await handleBlockAction({
      ack: mockAck,
      body: {
        user: { id: "U1" },
        channel: { id: "C1" },
        message: { ts: "1234567890.123456" },
        actions: [{ action_id: "confirm_clearsuggestions" }],
      },
      client: mockClient,
    });

    expect(store.clearSuggestions).toHaveBeenCalled();
    expect(mockUpdatePollMessage).toHaveBeenCalled();
  });
});
