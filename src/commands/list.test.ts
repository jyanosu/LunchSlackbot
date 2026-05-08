import { describe, it, expect, vi, beforeEach } from "vitest";

let mockGetToday: ReturnType<typeof vi.fn>;

vi.mock("../store", () => ({
  getToday: vi.fn(),
  getSchedule: vi.fn().mockReturnValue({ beginTime: "09:30", voteTime: "10:30", endTime: "11:15", days: "*", enabled: true }),
}));

vi.mock("../time-util", () => ({
  formatTime12: vi.fn().mockReturnValue("10:30 AM"),
}));

import * as store from "../store";
import handleList from "./list";

beforeEach(() => {
  mockGetToday = store.getToday as ReturnType<typeof vi.fn>;
  vi.clearAllMocks();
});

describe("list command", () => {
  it("prompts to begin when round not started", async () => {
    mockGetToday.mockReturnValue(undefined);

    const say = vi.fn().mockResolvedValue(undefined);
    await handleList({ say });

    expect(say).toHaveBeenCalledWith(
      "Lunch suggestions haven't started yet. Use @LunchSlackBot begin to start."
    );
  });

  it("prompts to suggest when no suggestions exist", async () => {
    mockGetToday.mockReturnValue({
      date: "2025-01-15",
      suggestions: [],
      deadline: "11:00 AM",
      started: true,
    });

    const say = vi.fn().mockResolvedValue(undefined);
    await handleList({ say });

    expect(say).toHaveBeenCalledWith(
      "No suggestions yet. Use @LunchSlackBot suggest <place> to add one."
    );
  });

  it("shows numbered list with voting start time when suggestions exist", async () => {
    mockGetToday.mockReturnValue({
      date: "2025-01-15",
      suggestions: ["Taco Bell", "Chipotle"],
      deadline: "11:00 AM",
      started: true,
    });

    const say = vi.fn().mockResolvedValue(undefined);
    await handleList({ say });

    expect(say).toHaveBeenCalledWith({
      text: "🍱 Today's lunch suggestions (voting starts at 10:30 AM EST): 1. Chipotle\n2. Taco Bell",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*🍱 Today's lunch suggestions* (voting starts at 10:30 AM EST):\n1. Chipotle\n2. Taco Bell",
          },
        },
      ],
    });
  });

  it("sorts suggestions alphabetically (case-insensitive)", async () => {
    mockGetToday.mockReturnValue({
      date: "2025-01-15",
      suggestions: ["Zoo", "alpha", "Beta"],
      deadline: "11:00 AM",
      started: true,
    });

    const say = vi.fn().mockResolvedValue(undefined);
    await handleList({ say });

    expect(say).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("1. alpha"),
      })
    );
    expect(say).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("2. Beta"),
      })
    );
    expect(say).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("3. Zoo"),
      })
    );
  });
});
