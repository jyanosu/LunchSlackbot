import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../store", () => ({
  getSchedule: vi.fn(),
  setSchedule: vi.fn(),
}));

vi.mock("../cron", () => ({
  restartSchedule: vi.fn(),
  stopSchedule: vi.fn(),
}));

vi.mock("../time-util", () => ({
  formatTime12: vi.fn((t: string) => t.replace(":", ":").replace(/^(\d)/, " $1")),
}));

import * as store from "../store";
import * as cron from "../cron";
import handleShowSchedule from "./showschedule";

beforeEach(() => vi.clearAllMocks());

const defaultSchedule = {
  beginTime: "09:30",
  voteTime: "10:30",
  endTime: "11:15",
  days: "*",
  enabled: true,
};

describe("handleShowSchedule", () => {
  it("shows current schedule", async () => {
    (store.getSchedule as ReturnType<typeof vi.fn>).mockReturnValue(defaultSchedule);
    const say = vi.fn().mockResolvedValue(undefined);

    await handleShowSchedule({ say });

    expect(say).toHaveBeenCalledWith(expect.stringContaining("📅 *Lunch Schedule:* (enabled)"));
    expect(say).toHaveBeenCalledWith(expect.stringContaining("Days: every day"));
    expect(say).toHaveBeenCalledWith(expect.stringContaining("Begin:"));
    expect(say).toHaveBeenCalledWith(expect.stringContaining("Vote:"));
    expect(say).toHaveBeenCalledWith(expect.stringContaining("End:"));
  });

  it("shows disabled state", async () => {
    (store.getSchedule as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultSchedule,
      enabled: false,
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handleShowSchedule({ say });

    expect(say).toHaveBeenCalledWith(expect.stringContaining("(disabled)"));
  });

  it("enables schedule", async () => {
    (store.getSchedule as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultSchedule,
      enabled: false,
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handleShowSchedule({ say, args: "enable" });

    expect(store.setSchedule).toHaveBeenCalledWith({ enabled: true });
    expect(cron.restartSchedule).toHaveBeenCalled();
    expect(say).toHaveBeenCalledWith("Schedule enabled.");
  });

  it("disables schedule", async () => {
    (store.getSchedule as ReturnType<typeof vi.fn>).mockReturnValue(defaultSchedule);
    const say = vi.fn().mockResolvedValue(undefined);

    await handleShowSchedule({ say, args: "disable" });

    expect(store.setSchedule).toHaveBeenCalledWith({ enabled: false });
    expect(cron.stopSchedule).toHaveBeenCalled();
    expect(say).toHaveBeenCalledWith("Schedule disabled.");
  });

  it("guards against enabling when already enabled", async () => {
    (store.getSchedule as ReturnType<typeof vi.fn>).mockReturnValue(defaultSchedule);
    const say = vi.fn().mockResolvedValue(undefined);

    await handleShowSchedule({ say, args: "enable" });

    expect(say).toHaveBeenCalledWith("Schedule is already enabled.");
    expect(cron.restartSchedule).not.toHaveBeenCalled();
  });

  it("guards against disabling when already disabled", async () => {
    (store.getSchedule as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultSchedule,
      enabled: false,
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handleShowSchedule({ say, args: "disable" });

    expect(say).toHaveBeenCalledWith("Schedule is already disabled.");
    expect(cron.stopSchedule).not.toHaveBeenCalled();
  });
});
