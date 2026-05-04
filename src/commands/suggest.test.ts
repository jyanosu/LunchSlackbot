import { describe, it, expect, vi, beforeEach } from "vitest";

let mockGetToday: ReturnType<typeof vi.fn>;
let mockAddSuggestion: ReturnType<typeof vi.fn>;
let mockAddToMasterList: ReturnType<typeof vi.fn>;

vi.mock("../store", () => ({
  getToday: vi.fn(),
  addSuggestion: vi.fn(),
  addToMasterList: vi.fn(),
}));

import * as store from "../store";
import handleSuggest from "./suggest";

beforeEach(() => {
  mockGetToday = store.getToday as ReturnType<typeof vi.fn>;
  mockAddSuggestion = store.addSuggestion as ReturnType<typeof vi.fn>;
  mockAddToMasterList = store.addToMasterList as ReturnType<typeof vi.fn>;
  vi.clearAllMocks();
});

describe("suggest command", () => {
  it("adds a valid place and lists suggestions", async () => {
    mockGetToday.mockReturnValue({
      date: "2025-01-15",
      suggestions: ["Taco Bell"],
      deadline: "11:00 AM",
      started: true,
    });
    mockAddSuggestion.mockReturnValue(true);

    const say = vi.fn().mockResolvedValue(undefined);
    await handleSuggest({ say, args: "Chipotle" });

    expect(mockAddSuggestion).toHaveBeenCalledWith("Chipotle");
    expect(say).toHaveBeenCalledWith(
      "✅ Added *Chipotle*.\n\nCurrent suggestions:\n• Taco Bell"
    );
  });

  it("shows usage hint when no place name", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleSuggest({ say, args: "" });

    expect(say).toHaveBeenCalledWith("Usage: @LunchSlackBot suggest <place>");
    expect(mockAddSuggestion).not.toHaveBeenCalled();
  });

  it("prompts to begin when round not started", async () => {
    mockGetToday.mockReturnValue(undefined);

    const say = vi.fn().mockResolvedValue(undefined);
    await handleSuggest({ say, args: "Chipotle" });

    expect(say).toHaveBeenCalledWith(
      "Lunch suggestions haven't started yet. Use @LunchSlackBot begin to start."
    );
    expect(mockAddSuggestion).not.toHaveBeenCalled();
  });

  it("rejects duplicate place", async () => {
    mockGetToday.mockReturnValue({
      date: "2025-01-15",
      suggestions: ["Taco Bell"],
      deadline: "11:00 AM",
      started: true,
    });
    mockAddSuggestion.mockReturnValue(false);

    const say = vi.fn().mockResolvedValue(undefined);
    await handleSuggest({ say, args: "Taco Bell" });

    expect(say).toHaveBeenCalledWith("*Taco Bell* is already suggested.");
  });

  it("handles missing args entirely", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleSuggest({ say });

    expect(say).toHaveBeenCalledWith("Usage: @LunchSlackBot suggest <place>");
  });

  it("allows suggestion when voting started", async () => {
    mockGetToday.mockReturnValue({
      date: "2025-01-15",
      suggestions: ["Taco Bell"],
      deadline: "11:00 AM",
      started: true,
      votingStarted: true,
    });
    mockAddSuggestion.mockReturnValue(true);

    const say = vi.fn().mockResolvedValue(undefined);
    await handleSuggest({ say, args: "Chipotle" });

    expect(mockAddSuggestion).toHaveBeenCalledWith("Chipotle");
  });

  it("rejects suggestion when poll ended", async () => {
    mockGetToday.mockReturnValue({
      date: "2025-01-15",
      suggestions: ["Taco Bell"],
      deadline: "11:00 AM",
      started: true,
      votingStarted: true,
      pollEnded: true,
    });

    const say = vi.fn().mockResolvedValue(undefined);
    await handleSuggest({ say, args: "Chipotle" });

    expect(say).toHaveBeenCalledWith("Poll has already ended for today. Start a new round with @LunchSlackBot begin.");
    expect(mockAddSuggestion).not.toHaveBeenCalled();
  });

  it("adds place to master list after successful suggest", async () => {
    mockGetToday.mockReturnValue({
      date: "2025-01-15",
      suggestions: ["Chipotle"],
      deadline: "11:00 AM",
      started: true,
    });
    mockAddSuggestion.mockReturnValue(true);

    const say = vi.fn().mockResolvedValue(undefined);
    await handleSuggest({ say, args: "Chipotle" });

    expect(mockAddToMasterList).toHaveBeenCalledWith("Chipotle");
  });

  it("does not add to master list when duplicate", async () => {
    mockGetToday.mockReturnValue({
      date: "2025-01-15",
      suggestions: ["Taco Bell"],
      deadline: "11:00 AM",
      started: true,
    });
    mockAddSuggestion.mockReturnValue(false);

    const say = vi.fn().mockResolvedValue(undefined);
    await handleSuggest({ say, args: "Taco Bell" });

    expect(mockAddToMasterList).not.toHaveBeenCalled();
  });

  it("reply includes newly added suggestion in list", async () => {
    mockGetToday.mockReturnValue({
      date: "2025-01-15",
      suggestions: ["Taco Bell", "Chipotle"],
      deadline: "11:00 AM",
      started: true,
    });
    mockAddSuggestion.mockReturnValue(true);

    const say = vi.fn().mockResolvedValue(undefined);
    await handleSuggest({ say, args: "Chipotle" });

    expect(say).toHaveBeenCalledWith(
      expect.stringContaining("• Chipotle")
    );
  });
});
