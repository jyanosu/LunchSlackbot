import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../store", () => ({ setSchedule: vi.fn() }));
vi.mock("../cron", () => ({ restartSchedule: vi.fn() }));
vi.mock("../time-util", () => ({ parseTime: vi.fn(), formatTime12: vi.fn() }));

import * as store from "../store";
import * as time from "../time-util";
import handleScheduleVote from "./schedulevote";

beforeEach(() => vi.clearAllMocks());

describe("handleScheduleVote", () => {
  it("sets vote time with valid input", async () => {
    (time.parseTime as ReturnType<typeof vi.fn>).mockReturnValue("10:30");
    (time.formatTime12 as ReturnType<typeof vi.fn>).mockReturnValue("10:30 AM");
    const say = vi.fn().mockResolvedValue(undefined);

    await handleScheduleVote({ say, args: "10:30 AM" });

    expect(store.setSchedule).toHaveBeenCalledWith({ voteTime: "10:30" });
    expect(say).toHaveBeenCalledWith("Vote time set to 10:30 AM EST.");
  });

  it("shows usage when no args", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleScheduleVote({ say });
    expect(say).toHaveBeenCalledWith("Usage: @LunchSlackBot schedulevote <time> (e.g., 10:30 AM)");
  });

  it("shows usage for invalid time", async () => {
    (time.parseTime as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    const say = vi.fn().mockResolvedValue(undefined);
    await handleScheduleVote({ say, args: "abc" });
    expect(say).toHaveBeenCalledWith("Usage: @LunchSlackBot schedulevote <time> (e.g., 10:30 AM)");
  });
});
