import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../store", () => ({
  getSchedule: vi.fn(),
  setSchedule: vi.fn(),
}));

import * as store from "../store";
import handlePrune from "./prune";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handlePrune", () => {
  it("shows current setting when no args", async () => {
    (store.getSchedule as ReturnType<typeof vi.fn>).mockReturnValue({
      beginTime: "09:30",
      voteTime: "10:30",
      endTime: "11:15",
      days: "*",
      enabled: true,
      pruneDays: 90,
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handlePrune({ say });

    expect(say).toHaveBeenCalledWith(expect.stringContaining("90 days"));
  });

  it("shows default when pruneDays not set", async () => {
    (store.getSchedule as ReturnType<typeof vi.fn>).mockReturnValue({
      beginTime: "09:30",
      voteTime: "10:30",
      endTime: "11:15",
      days: "*",
      enabled: true,
    });
    const say = vi.fn().mockResolvedValue(undefined);

    await handlePrune({ say });

    expect(say).toHaveBeenCalledWith(expect.stringContaining("120"));
  });

  it("sets pruneDays with valid input", async () => {
    const say = vi.fn().mockResolvedValue(undefined);

    await handlePrune({ say, args: "90" });

    expect(store.setSchedule).toHaveBeenCalledWith({ pruneDays: 90 });
    expect(say).toHaveBeenCalledWith("Prune retention set to 90 days.");
  });

  it("rejects value below 7", async () => {
    const say = vi.fn().mockResolvedValue(undefined);

    await handlePrune({ say, args: "5" });

    expect(store.setSchedule).not.toHaveBeenCalled();
    expect(say).toHaveBeenCalledWith(expect.stringContaining("at least 7 days"));
  });

  it("rejects non-numeric input", async () => {
    const say = vi.fn().mockResolvedValue(undefined);

    await handlePrune({ say, args: "abc" });

    expect(store.setSchedule).not.toHaveBeenCalled();
    expect(say).toHaveBeenCalledWith(expect.stringContaining("at least 7 days"));
  });
});
