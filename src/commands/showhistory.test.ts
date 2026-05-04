import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../store", () => ({
  getWinners: vi.fn(),
}));

import * as store from "../store";
import handleShowHistory from "./showhistory";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleShowHistory", () => {
  it("displays winners in reverse chronological order", async () => {
    (store.getWinners as ReturnType<typeof vi.fn>).mockReturnValue([
      { date: "2025-01-14", place: "Chipotle", voteCount: 4, totalVotes: 10 },
      { date: "2025-01-15", place: "Taco Bell", voteCount: 5, totalVotes: 12 },
    ]);
    const say = vi.fn().mockResolvedValue(undefined);

    await handleShowHistory({ say });

    const output = say.mock.calls[0][0];
    expect(output).toContain("📋 *Lunch History*");
    // 2025-01-15 should appear before 2025-01-14
    const index15 = output.indexOf("2025-01-15");
    const index14 = output.indexOf("2025-01-14");
    expect(index15).toBeLessThan(index14);
  });

  it("shows empty state when no winners", async () => {
    (store.getWinners as ReturnType<typeof vi.fn>).mockReturnValue([]);
    const say = vi.fn().mockResolvedValue(undefined);

    await handleShowHistory({ say });

    expect(say).toHaveBeenCalledWith(
      "📋 *Lunch History*\n\nNo winners yet. End a poll with @LunchSlackBot endpoll to start tracking."
    );
  });
});
