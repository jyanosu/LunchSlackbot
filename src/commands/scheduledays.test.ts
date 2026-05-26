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

  // Acceptance tests for validateDays

  it("accepts single day 0", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleScheduleDays({ say, args: "0" });
    expect(store.setSchedule).toHaveBeenCalledWith({ days: "0" });
  });

  it("accepts single day 7", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleScheduleDays({ say, args: "7" });
    expect(store.setSchedule).toHaveBeenCalledWith({ days: "7" });
  });

  it("accepts full range 0-7", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleScheduleDays({ say, args: "0-7" });
    expect(store.setSchedule).toHaveBeenCalledWith({ days: "0-7" });
  });

  it("accepts comma list 1,3,5", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleScheduleDays({ say, args: "1,3,5" });
    expect(store.setSchedule).toHaveBeenCalledWith({ days: "1,3,5" });
  });

  // Rejection tests for validateDays

  it("rejects out-of-range 99", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleScheduleDays({ say, args: "99" });
    expect(say).toHaveBeenCalledWith(expect.stringContaining("Invalid format"));
    expect(store.setSchedule).not.toHaveBeenCalled();
  });

  it("rejects out-of-range 8", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleScheduleDays({ say, args: "8" });
    expect(say).toHaveBeenCalledWith(expect.stringContaining("Invalid format"));
    expect(store.setSchedule).not.toHaveBeenCalled();
  });

  it("rejects incomplete range 1-", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleScheduleDays({ say, args: "1-" });
    expect(say).toHaveBeenCalledWith(expect.stringContaining("Invalid format"));
    expect(store.setSchedule).not.toHaveBeenCalled();
  });

  it("rejects incomplete range -3", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleScheduleDays({ say, args: "-3" });
    expect(say).toHaveBeenCalledWith(expect.stringContaining("Invalid format"));
    expect(store.setSchedule).not.toHaveBeenCalled();
  });

  it("rejects empty list element 1,,3", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleScheduleDays({ say, args: "1,,3" });
    expect(say).toHaveBeenCalledWith(expect.stringContaining("Invalid format"));
    expect(store.setSchedule).not.toHaveBeenCalled();
  });

  it("rejects reversed range 5-1", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleScheduleDays({ say, args: "5-1" });
    expect(say).toHaveBeenCalledWith(expect.stringContaining("Invalid format"));
    expect(store.setSchedule).not.toHaveBeenCalled();
  });

  it("rejects multiple range operators 1-3-5", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleScheduleDays({ say, args: "1-3-5" });
    expect(say).toHaveBeenCalledWith(expect.stringContaining("Invalid format"));
    expect(store.setSchedule).not.toHaveBeenCalled();
  });

  it("rejects mixed invalid 1,3-", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleScheduleDays({ say, args: "1,3-" });
    expect(say).toHaveBeenCalledWith(expect.stringContaining("Invalid format"));
    expect(store.setSchedule).not.toHaveBeenCalled();
  });

  it("rejects degenerate range 1-1", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleScheduleDays({ say, args: "1-1" });
    expect(say).toHaveBeenCalledWith(expect.stringContaining("Invalid format"));
    expect(store.setSchedule).not.toHaveBeenCalled();
  });

  it("rejects whitespace in list 1, 3, 5", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleScheduleDays({ say, args: "1, 3, 5" });
    expect(say).toHaveBeenCalledWith(expect.stringContaining("Invalid format"));
    expect(store.setSchedule).not.toHaveBeenCalled();
  });
});
