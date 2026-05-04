import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../store", () => ({
  getToday: vi.fn(),
  addSuggestion: vi.fn(),
  getMasterList: vi.fn(),
}));

import * as store from "../store";
import handleSuggestFromMasterlist from "./suggestfrommasterlist";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleSuggestFromMasterlist", () => {
  it("picks 5 places by default", async () => {
    const places = ["taco bell", "chipotle", "in-n-out", "panda express", "subway", "qdoba"];
    (store.getMasterList as ReturnType<typeof vi.fn>).mockReturnValue(new Set(places));
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      date: "2025-01-15",
      suggestions: [],
      deadline: "11:00 AM",
      started: true,
    });
    (store.addSuggestion as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const say = vi.fn().mockResolvedValue(undefined);

    await handleSuggestFromMasterlist({ say });

    expect(store.addSuggestion).toHaveBeenCalledTimes(5);
    expect(say).toHaveBeenCalledWith(
      expect.stringContaining("🎲 Picked 5 places from master list.")
    );
  });

  it("respects custom count argument", async () => {
    const places = ["taco bell", "chipotle", "in-n-out", "panda express", "subway", "qdoba"];
    (store.getMasterList as ReturnType<typeof vi.fn>).mockReturnValue(new Set(places));
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      date: "2025-01-15",
      suggestions: [],
      deadline: "11:00 AM",
      started: true,
    });
    (store.addSuggestion as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const say = vi.fn().mockResolvedValue(undefined);

    await handleSuggestFromMasterlist({ say, args: "3" });

    expect(store.addSuggestion).toHaveBeenCalledTimes(3);
    expect(say).toHaveBeenCalledWith(
      expect.stringContaining("🎲 Picked 3 places from master list.")
    );
  });

  it("clamps count to available places", async () => {
    const places = ["taco bell", "chipotle"];
    (store.getMasterList as ReturnType<typeof vi.fn>).mockReturnValue(new Set(places));
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      date: "2025-01-15",
      suggestions: [],
      deadline: "11:00 AM",
      started: true,
    });
    (store.addSuggestion as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const say = vi.fn().mockResolvedValue(undefined);

    await handleSuggestFromMasterlist({ say, args: "10" });

    expect(store.addSuggestion).toHaveBeenCalledTimes(2);
    expect(say).toHaveBeenCalledWith(
      expect.stringContaining("🎲 Picked 2 places from master list.")
    );
  });

  it("defaults to 5 when count is invalid", async () => {
    const places = ["taco bell", "chipotle", "in-n-out", "panda express", "subway", "qdoba"];
    (store.getMasterList as ReturnType<typeof vi.fn>).mockReturnValue(new Set(places));
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      date: "2025-01-15",
      suggestions: [],
      deadline: "11:00 AM",
      started: true,
    });
    (store.addSuggestion as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const say = vi.fn().mockResolvedValue(undefined);

    await handleSuggestFromMasterlist({ say, args: "abc" });

    expect(store.addSuggestion).toHaveBeenCalledTimes(5);
  });

  it("defaults to 5 when count is negative", async () => {
    const places = ["taco bell", "chipotle", "in-n-out", "panda express", "subway", "qdoba"];
    (store.getMasterList as ReturnType<typeof vi.fn>).mockReturnValue(new Set(places));
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      date: "2025-01-15",
      suggestions: [],
      deadline: "11:00 AM",
      started: true,
    });
    (store.addSuggestion as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const say = vi.fn().mockResolvedValue(undefined);

    await handleSuggestFromMasterlist({ say, args: "-3" });

    expect(store.addSuggestion).toHaveBeenCalledTimes(5);
  });

  it("handles empty master list", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      date: "2025-01-15",
      suggestions: [],
      deadline: "11:00 AM",
      started: true,
    });
    (store.getMasterList as ReturnType<typeof vi.fn>).mockReturnValue(new Set());

    const say = vi.fn().mockResolvedValue(undefined);

    await handleSuggestFromMasterlist({ say });

    expect(say).toHaveBeenCalledWith(
      "Master list is empty. Use @LunchSlackBot suggest <place> or seedmasterlist to add places."
    );
  });

  it("prompts to begin when round not started", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

    const say = vi.fn().mockResolvedValue(undefined);

    await handleSuggestFromMasterlist({ say });

    expect(say).toHaveBeenCalledWith(
      "Lunch suggestions haven't started yet. Use @LunchSlackBot begin to start."
    );
  });

  it("skips duplicates and reports them", async () => {
    const places = ["taco bell", "chipotle", "in-n-out", "panda express", "subway"];
    (store.getMasterList as ReturnType<typeof vi.fn>).mockReturnValue(new Set(places));
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      date: "2025-01-15",
      suggestions: ["taco bell"],
      deadline: "11:00 AM",
      started: true,
    });
    // First call returns false (duplicate), rest return true
    (store.addSuggestion as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(false)
      .mockReturnValue(true);

    const say = vi.fn().mockResolvedValue(undefined);

    await handleSuggestFromMasterlist({ say });

    expect(say).toHaveBeenCalledWith(
      expect.stringContaining("Already suggested (skipped):")
    );
  });

  it("reply includes current suggestions list", async () => {
    const places = ["taco bell", "chipotle", "in-n-out", "panda express", "subway", "qdoba"];
    (store.getMasterList as ReturnType<typeof vi.fn>).mockReturnValue(new Set(places));
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      date: "2025-01-15",
      suggestions: ["taco bell", "chipotle", "in-n-out", "panda express", "subway"],
      deadline: "11:00 AM",
      started: true,
    });
    (store.addSuggestion as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const say = vi.fn().mockResolvedValue(undefined);

    await handleSuggestFromMasterlist({ say });

    expect(say).toHaveBeenCalledWith(
      expect.stringContaining("Current suggestions:")
    );
  });
});
