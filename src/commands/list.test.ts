import { describe, it, expect, vi, beforeEach } from "vitest";

let mockGetToday: ReturnType<typeof vi.fn>;

vi.mock("../store", () => ({
  getToday: vi.fn(),
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

  it("shows numbered list with deadline when suggestions exist", async () => {
    mockGetToday.mockReturnValue({
      date: "2025-01-15",
      suggestions: ["Taco Bell", "Chipotle"],
      deadline: "11:00 AM",
      started: true,
    });

    const say = vi.fn().mockResolvedValue(undefined);
    await handleList({ say });

    expect(say).toHaveBeenCalledWith({
      text: "🍱 Today's lunch suggestions (deadline: 11:00 AM): 1. Taco Bell\n2. Chipotle",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*🍱 Today's lunch suggestions* (deadline: 11:00 AM):\n1. Taco Bell\n2. Chipotle",
          },
        },
      ],
    });
  });
});
