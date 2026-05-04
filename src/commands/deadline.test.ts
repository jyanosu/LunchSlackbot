import { describe, it, expect, vi, beforeEach } from "vitest";

let mockGetToday: ReturnType<typeof vi.fn>;
let mockSetDeadline: ReturnType<typeof vi.fn>;

vi.mock("../store", () => ({
  getToday: vi.fn(),
  setDeadline: vi.fn(),
}));

import * as store from "../store";
import handleDeadline from "./deadline";

beforeEach(() => {
  mockGetToday = store.getToday as ReturnType<typeof vi.fn>;
  mockSetDeadline = store.setDeadline as ReturnType<typeof vi.fn>;
  vi.clearAllMocks();
});

describe("deadline command", () => {
  const todayDay = {
    date: "2025-01-15",
    suggestions: [],
    deadline: "11:00 AM",
    started: true,
  };

  it("sets deadline with HH:MM AM format", async () => {
    mockGetToday.mockReturnValue(todayDay);

    const say = vi.fn().mockResolvedValue(undefined);
    await handleDeadline({ say, args: "10:30 AM" });

    expect(mockSetDeadline).toHaveBeenCalledWith("10:30 AM");
    expect(say).toHaveBeenCalledWith("⏰ Deadline set to 10:30 AM EST.");
  });

  it("sets deadline with HH:MM PM format", async () => {
    mockGetToday.mockReturnValue(todayDay);

    const say = vi.fn().mockResolvedValue(undefined);
    await handleDeadline({ say, args: "1:00 PM" });

    expect(mockSetDeadline).toHaveBeenCalledWith("01:00 PM");
    expect(say).toHaveBeenCalledWith("⏰ Deadline set to 01:00 PM EST.");
  });

  it("defaults bare HH:MM to AM", async () => {
    mockGetToday.mockReturnValue(todayDay);

    const say = vi.fn().mockResolvedValue(undefined);
    await handleDeadline({ say, args: "11:30" });

    expect(mockSetDeadline).toHaveBeenCalledWith("11:30 AM");
    expect(say).toHaveBeenCalledWith("⏰ Deadline set to 11:30 AM EST.");
  });

  it("shows usage hint when no time provided", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleDeadline({ say, args: "" });

    expect(say).toHaveBeenCalledWith(
      "Usage: @LunchSlackBot suggestiondeadline <time> (e.g., 10:30 AM)"
    );
    expect(mockSetDeadline).not.toHaveBeenCalled();
  });

  it("shows usage hint for invalid time", async () => {
    mockGetToday.mockReturnValue(todayDay);

    const say = vi.fn().mockResolvedValue(undefined);
    await handleDeadline({ say, args: "25:00" });

    expect(say).toHaveBeenCalledWith(
      "Usage: @LunchSlackBot suggestiondeadline <time> (e.g., 10:30 AM)"
    );
    expect(mockSetDeadline).not.toHaveBeenCalled();
  });

  it("prompts to begin when day not started", async () => {
    mockGetToday.mockReturnValue(undefined);

    const say = vi.fn().mockResolvedValue(undefined);
    await handleDeadline({ say, args: "10:30 AM" });

    expect(say).toHaveBeenCalledWith(
      "Lunch suggestions haven't started yet. Use @LunchSlackBot begin to start."
    );
    expect(mockSetDeadline).not.toHaveBeenCalled();
  });

  it("rejects invalid minutes", async () => {
    mockGetToday.mockReturnValue(todayDay);

    const say = vi.fn().mockResolvedValue(undefined);
    await handleDeadline({ say, args: "10:60" });

    expect(say).toHaveBeenCalledWith(
      "Usage: @LunchSlackBot suggestiondeadline <time> (e.g., 10:30 AM)"
    );
    expect(mockSetDeadline).not.toHaveBeenCalled();
  });

  it("handles missing args entirely", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleDeadline({ say });

    expect(say).toHaveBeenCalledWith(
      "Usage: @LunchSlackBot suggestiondeadline <time> (e.g., 10:30 AM)"
    );
  });
});
