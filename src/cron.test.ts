import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "lunch.json");
const WINNERS_FILE = path.join(DATA_DIR, "winners.json");

function cleanup() {
  try {
    if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
    if (fs.existsSync(WINNERS_FILE)) fs.unlinkSync(WINNERS_FILE);
    if (fs.existsSync(DATA_DIR)) fs.rmdirSync(DATA_DIR);
  } catch {
    // ignore
  }
}

describe("cron schedule", () => {
  beforeEach(() => {
    vi.resetModules();
    cleanup();
  });
  afterEach(() => {
    cleanup();
  });

  it("builds cron expression from time and days", async () => {
    const { initSchedule, stopSchedule } = await import("./cron");
    const { loadStore, setSchedule } = await import("./store");
    loadStore();
    setSchedule({ beginTime: "09:30", days: "*" });

    // Mock app
    const mockApp = { client: { chat: { postMessage: vi.fn() } } } as any;

    // Should not throw
    expect(() => initSchedule(mockApp)).not.toThrow();
    stopSchedule();
  });

  it("skips registration when LUNCH_CHANNEL_ID missing", async () => {
    const { initSchedule } = await import("./cron");
    const mockApp = { client: {} } as any;

    // Should not throw, just log warning
    expect(() => initSchedule(mockApp)).not.toThrow();
  });

  it("skips registration when schedule disabled", async () => {
    const { initSchedule, stopSchedule } = await import("./cron");
    const { loadStore, setSchedule } = await import("./store");
    loadStore();
    setSchedule({ enabled: false });

    const mockApp = { client: { chat: { postMessage: vi.fn() } } } as any;

    expect(() => initSchedule(mockApp)).not.toThrow();
    stopSchedule();
  });

  it("stopSchedule stops all jobs", async () => {
    const { initSchedule, stopSchedule } = await import("./cron");
    const { loadStore } = await import("./store");
    loadStore();

    const mockApp = { client: { chat: { postMessage: vi.fn() } } } as any;
    initSchedule(mockApp);
    stopSchedule();

    // Should not throw on second stop
    expect(() => stopSchedule()).not.toThrow();
  });
});
