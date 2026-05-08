import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../store", () => ({ setSchedule: vi.fn() }));
vi.mock("../cron", () => ({ restartSchedule: vi.fn() }));
vi.mock("../time-util", () => ({ parseTime: vi.fn(), formatTime12: vi.fn() }));

import * as store from "../store";
import * as time from "../time-util";
import handleScheduleEnd from "./scheduleend";

beforeEach(() => vi.clearAllMocks());

describe("handleScheduleEnd", () => {
  it("sets end time with valid input", async () => {
    (time.parseTime as ReturnType<typeof vi.fn>).mockReturnValue("11:15");
    (time.formatTime12 as ReturnType<typeof vi.fn>).mockReturnValue("11:15 AM");
    const say = vi.fn().mockResolvedValue(undefined);

    await handleScheduleEnd({ say, args: "11:15 AM" });

    expect(store.setSchedule).toHaveBeenCalledWith({ endTime: "11:15" });
    expect(say).toHaveBeenCalledWith("End time set to 11:15 AM EST.");
  });

  it("shows usage when no args", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleScheduleEnd({ say });
    expect(say).toHaveBeenCalledWith("Usage: @LunchSlackBot scheduleend <time> (e.g., 11:15 AM)");
  });

  it("shows usage for invalid time", async () => {
    (time.parseTime as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    const say = vi.fn().mockResolvedValue(undefined);
    await handleScheduleEnd({ say, args: "abc" });
    expect(say).toHaveBeenCalledWith("Usage: @LunchSlackBot scheduleend <time> (e.g., 11:15 AM)");
  });
});
