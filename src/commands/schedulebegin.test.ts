import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../store", () => ({
  setSchedule: vi.fn(),
  getSchedule: vi.fn(),
}));

vi.mock("../cron", () => ({
  restartSchedule: vi.fn(),
  stopSchedule: vi.fn(),
  setBoltApp: vi.fn(),
}));

vi.mock("../time-util", () => ({
  parseTime: vi.fn(),
  formatTime12: vi.fn(),
}));

import * as store from "../store";
import * as cron from "../cron";
import * as time from "../time-util";
import handleScheduleBegin from "./schedulebegin";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleScheduleBegin", () => {
  it("sets begin time with valid input", async () => {
    (time.parseTime as ReturnType<typeof vi.fn>).mockReturnValue("09:00");
    (time.formatTime12 as ReturnType<typeof vi.fn>).mockReturnValue("9:00 AM");
    const say = vi.fn().mockResolvedValue(undefined);

    await handleScheduleBegin({ say, args: "9:00 AM" });

    expect(time.parseTime).toHaveBeenCalledWith("9:00 AM");
    expect(store.setSchedule).toHaveBeenCalledWith({ beginTime: "09:00" });
    expect(cron.restartSchedule).toHaveBeenCalled();
    expect(say).toHaveBeenCalledWith("Begin time set to 9:00 AM EST.");
  });

  it("shows usage when no args", async () => {
    const say = vi.fn().mockResolvedValue(undefined);

    await handleScheduleBegin({ say });

    expect(say).toHaveBeenCalledWith("Usage: @LunchSlackBot schedulebegin <time> (e.g., 9:00 AM)");
  });

  it("shows usage for invalid time", async () => {
    (time.parseTime as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    const say = vi.fn().mockResolvedValue(undefined);

    await handleScheduleBegin({ say, args: "abc" });

    expect(say).toHaveBeenCalledWith("Usage: @LunchSlackBot schedulebegin <time> (e.g., 9:00 AM)");
  });
});
