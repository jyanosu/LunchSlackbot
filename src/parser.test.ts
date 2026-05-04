import { describe, it, expect } from "vitest";
import { parseCommand } from "./parser";

describe("parser", () => {
  it("extracts command with no args", () => {
    expect(parseCommand("@LunchSlackBot begin")).toEqual({
      command: "begin",
      args: "",
    });
  });

  it("extracts command with args", () => {
    expect(parseCommand("@LunchSlackBot suggest Taco Bell")).toEqual({
      command: "suggest",
      args: "Taco Bell",
    });
  });

  it("extracts suggestiondeadline with time args", () => {
    expect(parseCommand("@LunchSlackBot suggestiondeadline 10:30 AM")).toEqual({
      command: "suggestiondeadline",
      args: "10:30 AM",
    });
  });

  it("extracts remove with place name", () => {
    expect(parseCommand("@LunchSlackBot remove Taco Bell")).toEqual({
      command: "remove",
      args: "Taco Bell",
    });
  });

  it("extracts help command", () => {
    expect(parseCommand("@LunchSlackBot help")).toEqual({
      command: "help",
      args: "",
    });
  });

  it("returns empty when no subcommand", () => {
    expect(parseCommand("@LunchSlackBot")).toEqual({
      command: "",
      args: "",
    });
  });

  it("returns empty for bare mention with extra whitespace", () => {
    expect(parseCommand("@LunchSlackBot   ")).toEqual({
      command: "",
      args: "",
    });
  });

  it("is case-insensitive", () => {
    expect(parseCommand("@LunchSlackBot BEGIN")).toEqual({
      command: "begin",
      args: "",
    });
    expect(parseCommand("@LunchSlackBot Suggest Taco Bell")).toEqual({
      command: "suggest",
      args: "Taco Bell",
    });
  });

  it("handles Slack user mention format <@U...>", () => {
    expect(parseCommand("<@U1234567> begin")).toEqual({
      command: "begin",
      args: "",
    });
  });

  it("handles command only (no args, no trailing space)", () => {
    expect(parseCommand("@LunchSlackBot help")).toEqual({
      command: "help",
      args: "",
    });
  });
});
