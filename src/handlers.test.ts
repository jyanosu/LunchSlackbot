import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleAppMention, routeCommand, KNOWN_COMMANDS } from "./handlers";

beforeEach(() => {
  vi.resetModules();
});

describe("handleAppMention router", () => {
  it("replies with title message when no subcommand", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleAppMention({ say, event: { text: "@LunchSlackBot", user: "U1", channel: "C1" } });

    expect(say).toHaveBeenCalledWith("🍱 *Lunchbot* — lunch suggestion bot");
  });

  it("replies with usage hint for unknown command", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleAppMention({ say, event: { text: "@LunchSlackBot unknown", user: "U1", channel: "C1" } });

    expect(say).toHaveBeenCalledWith(
      "Unknown command. Try @LunchSlackBot help for a list of commands."
    );
  });

  it("routes 'begin' command", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleAppMention({ say, event: { text: "@LunchSlackBot begin", user: "U1", channel: "C1" } });

    // Should not hit unknown command
    expect(say).not.toHaveBeenCalledWith(
      expect.stringContaining("Unknown command"))
    // begin stub says "begin command not yet implemented" or prompts confirmation
    expect(say).toHaveBeenCalled();
  });

  it("routes 'help' command", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleAppMention({ say, event: { text: "@LunchSlackBot help", user: "U1", channel: "C1" } });

    expect(say).toHaveBeenCalledWith(
      expect.stringContaining("LunchBot Commands"))
  });

  it("routes 'suggest' command", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleAppMention({ say, event: { text: "@LunchSlackBot suggest Taco Bell", user: "U1", channel: "C1" } });

    expect(say).toHaveBeenCalled();
    expect(say).not.toHaveBeenCalledWith(expect.stringContaining("Unknown command"));
  });

  it("routes 'suggestiondeadline' command", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleAppMention({ say, event: { text: "@LunchSlackBot suggestiondeadline 10:30 AM", user: "U1", channel: "C1" } });

    expect(say).toHaveBeenCalled();
    expect(say).not.toHaveBeenCalledWith(expect.stringContaining("Unknown command"));
  });

  it("routes 'remove' command", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleAppMention({ say, event: { text: "@LunchSlackBot remove Taco Bell", user: "U1", channel: "C1" } });

    expect(say).toHaveBeenCalled();
    expect(say).not.toHaveBeenCalledWith(expect.stringContaining("Unknown command"));
  });

  it("routes 'list' command", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleAppMention({ say, event: { text: "@LunchSlackBot list", user: "U1", channel: "C1" } });

    expect(say).toHaveBeenCalled();
    expect(say).not.toHaveBeenCalledWith(expect.stringContaining("Unknown command"));
  });

  it("handles empty event gracefully", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleAppMention({ say });

    expect(say).toHaveBeenCalledWith("🍱 *Lunchbot* — lunch suggestion bot");
  });
});

describe("routeCommand", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("dispatches 'help' command", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await routeCommand("help", { say });

    expect(say).toHaveBeenCalledWith(expect.stringContaining("LunchBot Commands"));
  });

  it("dispatches 'list' command", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await routeCommand("list", { say });

    // list command will try to get today's data; with no store, it should handle gracefully
    expect(say).toHaveBeenCalled();
  });

  it("does nothing for unknown command", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await routeCommand("unknown", { say });

    expect(say).not.toHaveBeenCalled();
  });

  it("handler receives correct context", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await routeCommand("help", { say, args: "test", userId: "U1", channelId: "C1" });

    expect(say).toHaveBeenCalled();
  });
});
