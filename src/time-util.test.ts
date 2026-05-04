import { describe, it, expect } from "vitest";
import { parseTime, formatTime12 } from "./time-util";

describe("parseTime", () => {
  it("parses 12-hour format with AM", () => {
    expect(parseTime("9:00 AM")).toBe("09:00");
    expect(parseTime("09:30 AM")).toBe("09:30");
  });

  it("parses 12-hour format with PM", () => {
    expect(parseTime("2:00 PM")).toBe("14:00");
    expect(parseTime("12:30 PM")).toBe("12:30");
  });

  it("parses 12-hour format without space", () => {
    expect(parseTime("9AM")).toBe("09:00");
    expect(parseTime("12PM")).toBe("12:00");
  });

  it("parses 24-hour format", () => {
    expect(parseTime("14:30")).toBe("14:30");
    expect(parseTime("09:00")).toBe("09:00");
  });

  it("parses 24-hour without leading zero", () => {
    expect(parseTime("9:30")).toBe("09:30");
  });

  it("handles 12 AM as midnight", () => {
    expect(parseTime("12:00 AM")).toBe("00:00");
  });

  it("handles 12 PM as noon", () => {
    expect(parseTime("12:00 PM")).toBe("12:00");
  });

  it("returns undefined for invalid input", () => {
    expect(parseTime("")).toBeUndefined();
    expect(parseTime("25:00")).toBeUndefined();
    expect(parseTime("0:00 AM")).toBeUndefined();
    expect(parseTime("13:00 AM")).toBeUndefined();
    expect(parseTime("abc")).toBeUndefined();
    expect(parseTime("9:60")).toBeUndefined();
  });
});

describe("formatTime12", () => {
  it("formats morning time", () => {
    expect(formatTime12("09:30")).toBe("9:30 AM");
  });

  it("formats afternoon time", () => {
    expect(formatTime12("14:00")).toBe("2:00 PM");
  });

  it("formats midnight", () => {
    expect(formatTime12("00:00")).toBe("12:00 AM");
  });

  it("formats noon", () => {
    expect(formatTime12("12:00")).toBe("12:00 PM");
  });
});
