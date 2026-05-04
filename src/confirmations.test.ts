import { describe, it, expect, vi, beforeEach } from "vitest";
import { add, check } from "./confirmations";

describe("confirmations", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("adds and retrieves a pending confirmation", () => {
    add("U1", "C1", "begin", null);
    const entry = check("U1", "C1", "begin");
    expect(entry).toBeDefined();
    expect(entry?.type).toBe("begin");
    expect(entry?.payload).toBeNull();
  });

  it("returns undefined for non-existent confirmation", () => {
    expect(check("U1", "C1", "begin")).toBeUndefined();
  });

  it("clears entry after check", () => {
    add("U1", "C1", "remove", "Taco Bell");
    check("U1", "C1", "remove");
    expect(check("U1", "C1", "remove")).toBeUndefined();
  });

  it("keeps begin and remove separate (no collision)", () => {
    add("U1", "C1", "begin", null);
    add("U1", "C1", "remove", "Taco Bell");

    const beginEntry = check("U1", "C1", "begin");
    expect(beginEntry?.type).toBe("begin");

    const removeEntry = check("U1", "C1", "remove");
    expect(removeEntry?.type).toBe("remove");
    expect(removeEntry?.payload).toBe("Taco Bell");
  });

  it("expires after 60 seconds", () => {
    add("U1", "C1", "begin", null);
    expect(check("U1", "C1", "begin")).toBeDefined();

    vi.advanceTimersByTime(61_000);
    expect(check("U1", "C1", "begin")).toBeUndefined();
  });

  it("does not expire before 60 seconds", () => {
    add("U1", "C1", "begin", null);
    vi.advanceTimersByTime(59_000);
    expect(check("U1", "C1", "begin")).toBeDefined();
  });

  it("different users do not collide", () => {
    add("U1", "C1", "begin", null);
    expect(check("U2", "C1", "begin")).toBeUndefined();
  });

  it("different channels do not collide", () => {
    add("U1", "C1", "begin", null);
    expect(check("U1", "C2", "begin")).toBeUndefined();
  });

  it("overwrites existing confirmation for same key", () => {
    add("U1", "C1", "remove", "Taco Bell");
    add("U1", "C1", "remove", "Chipotle");

    const entry = check("U1", "C1", "remove");
    expect(entry?.payload).toBe("Chipotle");
  });
});
