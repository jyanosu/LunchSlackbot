import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../store", () => ({
  setSchedule: vi.fn(),
}));

vi.mock("../cron", () => ({
  restartSchedule: vi.fn(),
}));

import * as store from "../store";
import * as cron from "../cron";
import handleScheduleDays from "./scheduledays";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleScheduleDays", () => {
  it("sets days and restarts schedule", async () => {
    const say = vi.fn().mockResolvedValue(undefined);

    await handleScheduleDays({ say, args: "2-3" });

    expect(store.setSchedule).toHaveBeenCalledWith({ days: "2-3" });
    expect(cron.restartSchedule).toHaveBeenCalled();
    expect(say).toHaveBeenCalledWith("Days set to 2-3.");
  });

  it("sets wildcard for every day", async () => {
    const say = vi.fn().mockResolvedValue(undefined);

    await handleScheduleDays({ say, args: "*" });

    expect(store.setSchedule).toHaveBeenCalledWith({ days: "*" });
    expect(say).toHaveBeenCalledWith("Days set to *.");
  });

  it("shows usage when no args", async () => {
    const say = vi.fn().mockResolvedValue(undefined);

    await handleScheduleDays({ say });

    expect(say).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
    expect(store.setSchedule).not.toHaveBeenCalled();
  });

  it("rejects invalid format", async () => {
    const say = vi.fn().mockResolvedValue(undefined);

    await handleScheduleDays({ say, args: "abc" });

    expect(say).toHaveBeenCalledWith(expect.stringContaining("Invalid format"));
    expect(store.setSchedule).not.toHaveBeenCalled();
  });

  it("rejects empty string", async () => {
    const say = vi.fn().mockResolvedValue(undefined);

    await handleScheduleDays({ say, args: "   " });

    expect(say).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
    expect(store.setSchedule).not.toHaveBeenCalled();
  });
});
