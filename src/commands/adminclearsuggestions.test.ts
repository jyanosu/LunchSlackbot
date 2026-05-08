import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../store", () => ({
  getToday: vi.fn(),
  clearSuggestions: vi.fn(),
}));

vi.mock("../confirmations", () => ({
  add: vi.fn(),
}));

import * as store from "../store";
import * as confirmations from "../confirmations";
import handleAdminClearSuggestions from "./adminclearsuggestions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleAdminClearSuggestions", () => {
  it("sends confirmation button when suggestions exist", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      date: "2025-01-15",
      suggestions: ["Taco Bell", "Chipotle"],
      deadline: "11:00 AM",
      started: true,
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handleAdminClearSuggestions({ say, userId: "U1", channelId: "C1" });

    expect(confirmations.add).toHaveBeenCalledWith("U1", "C1", "clearsuggestions", null);
    const message = (say as any).mock.calls[0][0];
    expect(message.blocks[0].text.text).toContain("Clear all 2 suggestions");
    expect(message.blocks[0].accessory.action_id).toBe("confirm_clearsuggestions");
  });

  it("returns error when no round started", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    const say = vi.fn().mockResolvedValue(undefined);

    await handleAdminClearSuggestions({ say, userId: "U1", channelId: "C1" });

    expect(say).toHaveBeenCalledWith(
      "Lunch suggestions haven't started yet. Use @LunchSlackBot begin to start."
    );
    expect(confirmations.add).not.toHaveBeenCalled();
  });

  it("returns info when already empty", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      date: "2025-01-15",
      suggestions: [],
      deadline: "11:00 AM",
      started: true,
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handleAdminClearSuggestions({ say, userId: "U1", channelId: "C1" });

    expect(say).toHaveBeenCalledWith("No suggestions to clear.");
    expect(confirmations.add).not.toHaveBeenCalled();
  });
});
