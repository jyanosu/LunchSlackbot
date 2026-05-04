import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../store", () => ({
  getToday: vi.fn(),
  startToday: vi.fn(),
  startVoting: vi.fn(),
  addSuggestion: vi.fn(),
  endPoll: vi.fn(),
  setPollMessageTs: vi.fn(),
}));

vi.mock("../cron", () => ({
  getClient: vi.fn(),
}));

import * as store from "../store";
import * as cron from "../cron";
import handleAdminQuickTest from "./adminquicktest";

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

describe("handleAdminQuickTest", () => {
  it("starts test when no round in progress", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    (cron.getClient as ReturnType<typeof vi.fn>).mockReturnValue({
      chat: { postMessage: vi.fn().mockResolvedValue({ ts: "123" }) },
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handleAdminQuickTest({ say, channelId: "C1" });

    expect(say).toHaveBeenCalledWith(expect.stringContaining("🧪 *Quick test started!*"));
  });

  it("rejects when round already started", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue({
      started: true,
      date: "2025-01-15",
      suggestions: ["Taco Bell"],
      deadline: "11:00 AM EST",
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handleAdminQuickTest({ say, channelId: "C1" });

    expect(say).toHaveBeenCalledWith("A lunch round is already in progress. Use @LunchSlackBot adminreset first.");
  });

  it("rejects when channelId is missing", async () => {
    const say = vi.fn().mockResolvedValue(undefined);

    await handleAdminQuickTest({ say });

    expect(say).toHaveBeenCalledWith("Sorry, I couldn't determine your channel. Try again.");
  });

  it("rejects when client is unavailable", async () => {
    (store.getToday as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    (cron.getClient as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const say = vi.fn().mockResolvedValue(undefined);

    await handleAdminQuickTest({ say, channelId: "C1" });

    expect(say).toHaveBeenCalledWith("Bot client not available. Try again.");
  });
});
