import { describe, it, expect, vi, beforeEach } from "vitest";

let mockGetToday: ReturnType<typeof vi.fn>;
let mockRemoveSuggestion: ReturnType<typeof vi.fn>;
let mockStartToday: ReturnType<typeof vi.fn>;
let mockResetStore: ReturnType<typeof vi.fn>;
let mockAdd: ReturnType<typeof vi.fn>;
let mockCheck: ReturnType<typeof vi.fn>;

vi.mock("../store", () => ({
  getToday: vi.fn(),
  removeSuggestion: vi.fn(),
  startToday: vi.fn(),
  resetStore: vi.fn(),
}));

vi.mock("../confirmations", () => ({
  add: vi.fn(),
  check: vi.fn(),
}));

import * as store from "../store";
import * as confirmations from "../confirmations";
import handleRemove, { handleConfirmation, handleBlockAction } from "./remove";

beforeEach(() => {
  mockGetToday = store.getToday as ReturnType<typeof vi.fn>;
  mockRemoveSuggestion = store.removeSuggestion as ReturnType<typeof vi.fn>;
  mockStartToday = store.startToday as ReturnType<typeof vi.fn>;
  mockResetStore = store.resetStore as ReturnType<typeof vi.fn>;
  mockAdd = confirmations.add as ReturnType<typeof vi.fn>;
  mockCheck = confirmations.check as ReturnType<typeof vi.fn>;
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

describe("handleConfirmation", () => {
  const mockAck = vi.fn().mockResolvedValue(undefined);
  const mockPostMessage = vi.fn().mockResolvedValue({ ok: true });
  const mockClient = { chat: { postMessage: mockPostMessage } };

  it("skips bot messages", async () => {
    mockCheck.mockReturnValue(undefined);
    await handleConfirmation({ event: { type: "message", bot_id: "B123", user: "U1", channel: "C1", text: "yes" }, client: mockClient, ack: mockAck });

    expect(mockAck).toHaveBeenCalled();
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it("ignores non-yes messages", async () => {
    await handleConfirmation({ event: { type: "message", user: "U1", channel: "C1", text: "no" }, client: mockClient, ack: mockAck });
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it("ignores when no pending confirmation", async () => {
    mockCheck.mockReturnValue(undefined);
    await handleConfirmation({ event: { type: "message", user: "U1", channel: "C1", text: "yes" }, client: mockClient, ack: mockAck });
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it("starts round on begin confirmation", async () => {
    mockStartToday.mockReturnValue({ date: "2025-01-15", suggestions: [], deadline: "11:00 AM EST", started: true });
    mockCheck.mockReturnValue({ type: "begin", payload: null });
    await handleConfirmation({ event: { type: "message", user: "U1", channel: "C1", text: "yes" }, client: mockClient, ack: mockAck });

    expect(mockPostMessage).toHaveBeenCalledWith({
      channel: "C1",
      text: "🍱 Lunch suggestions are open! Use @LunchSlackBot suggest <place> to add a place. Deadline: 11:00 AM EST.",
    });
  });

  it("removes place on remove confirmation", async () => {
    mockCheck.mockImplementation((_userId: string, _channelId: string, action: string) => {
      if (action === "remove") return { type: "remove", payload: "Taco Bell" };
      return undefined;
    });
    mockRemoveSuggestion.mockReturnValue(true);

    await handleConfirmation({ event: { type: "message", user: "U1", channel: "C1", text: "yes" }, client: mockClient, ack: mockAck });

    expect(mockRemoveSuggestion).toHaveBeenCalledWith("Taco Bell");
    expect(mockPostMessage).toHaveBeenCalledWith({
      channel: "C1",
      text: "✅ Removed *Taco Bell* from today's suggestions.",
    });
  });

  it("handles case-insensitive yes", async () => {
    mockStartToday.mockReturnValue({ date: "2025-01-15", suggestions: [], deadline: "11:00 AM EST", started: true });
    mockCheck.mockReturnValue({ type: "begin", payload: null });
    await handleConfirmation({ event: { type: "message", user: "U1", channel: "C1", text: "YES" }, client: mockClient, ack: mockAck });
    expect(mockPostMessage).toHaveBeenCalled();
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
      text: "🍱 Lunch suggestions are open! Use @LunchSlackBot suggest <place> to add a place. Deadline: 11:00 AM EST.",
    });
    expect(mockPostMessage).toHaveBeenCalledWith({
      channel: "C1",
      text: "🍱 Lunch suggestions are open! Use @LunchSlackBot suggest <place> to add a place. Deadline: 11:00 AM EST.",
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
});
