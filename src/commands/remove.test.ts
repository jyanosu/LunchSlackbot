import { describe, it, expect, vi, beforeEach } from "vitest";

let mockGetToday: ReturnType<typeof vi.fn>;
let mockRemoveSuggestion: ReturnType<typeof vi.fn>;
let mockSetToday: ReturnType<typeof vi.fn>;
let mockAdd: ReturnType<typeof vi.fn>;
let mockCheck: ReturnType<typeof vi.fn>;

vi.mock("../store", () => ({
  getToday: vi.fn(),
  removeSuggestion: vi.fn(),
  setToday: vi.fn(),
}));

vi.mock("../confirmations", () => ({
  add: vi.fn(),
  check: vi.fn(),
}));

import * as store from "../store";
import * as confirmations from "../confirmations";
import handleRemove, { handleConfirmation } from "./remove";

beforeEach(() => {
  mockGetToday = store.getToday as ReturnType<typeof vi.fn>;
  mockRemoveSuggestion = store.removeSuggestion as ReturnType<typeof vi.fn>;
  mockSetToday = store.setToday as ReturnType<typeof vi.fn>;
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

    expect(say).toHaveBeenCalledWith(
      'Remove *Taco Bell* from today\'s suggestions? Reply with "yes" to confirm.'
    );
    expect(mockAdd).toHaveBeenCalledWith("U1", "C1", "remove", "Taco Bell");
  });

  it("shows usage hint when no place name", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleRemove({ say, args: "" });

    expect(say).toHaveBeenCalledWith("Usage: @LunchSlackBot remove <place>");
    expect(mockAdd).not.toHaveBeenCalled();
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

  it("skips bot messages", async () => {
    mockCheck.mockReturnValue(undefined);

    const say = vi.fn().mockResolvedValue(undefined);
    await handleConfirmation({ event: { bot: true, user: "U1", channel: "C1", text: "yes" }, say, ack: mockAck });

    expect(mockAck).toHaveBeenCalled();
    expect(say).not.toHaveBeenCalled();
  });

  it("ignores non-yes messages", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleConfirmation({ event: { bot: false, user: "U1", channel: "C1", text: "no" }, say, ack: mockAck });

    expect(say).not.toHaveBeenCalled();
  });

  it("ignores when no pending confirmation", async () => {
    mockCheck.mockReturnValue(undefined);

    const say = vi.fn().mockResolvedValue(undefined);
    await handleConfirmation({ event: { bot: false, user: "U1", channel: "C1", text: "yes" }, say, ack: mockAck });

    expect(say).not.toHaveBeenCalled();
  });

  it("starts round on begin confirmation", async () => {
    mockCheck.mockReturnValue({ type: "begin", payload: null });

    const say = vi.fn().mockResolvedValue(undefined);
    await handleConfirmation({ event: { bot: false, user: "U1", channel: "C1", text: "yes" }, say, ack: mockAck });

    expect(say).toHaveBeenCalledWith(
      "🍱 Lunch suggestions are open! Use @LunchSlackBot suggest <place> to add a place. Deadline: 11:00 AM EST."
    );
  });

  it("removes place on remove confirmation", async () => {
    mockCheck.mockImplementation((_userId: string, _channelId: string, action: string) => {
      if (action === "remove") return { type: "remove", payload: "Taco Bell" };
      return undefined;
    });
    mockRemoveSuggestion.mockReturnValue(true);

    const say = vi.fn().mockResolvedValue(undefined);
    await handleConfirmation({ event: { bot: false, user: "U1", channel: "C1", text: "yes" }, say, ack: mockAck });

    expect(mockRemoveSuggestion).toHaveBeenCalledWith("Taco Bell");
    expect(say).toHaveBeenCalledWith("✅ Removed *Taco Bell* from today's suggestions.");
  });

  it("handles case-insensitive yes", async () => {
    mockCheck.mockReturnValue({ type: "begin", payload: null });

    const say = vi.fn().mockResolvedValue(undefined);
    await handleConfirmation({ event: { bot: false, user: "U1", channel: "C1", text: "YES" }, say, ack: mockAck });

    expect(say).toHaveBeenCalled();
  });
});
