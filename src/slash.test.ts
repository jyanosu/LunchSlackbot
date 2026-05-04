import { describe, it, expect, vi, beforeEach } from "vitest";
import { App } from "@slack/bolt";

let mockRouteCommand: ReturnType<typeof vi.fn>;

vi.mock("./handlers", () => ({
  routeCommand: vi.fn().mockResolvedValue(undefined),
}));

import { registerSlashCommands } from "./slash";
import { routeCommand } from "./handlers";

beforeEach(() => {
  mockRouteCommand = routeCommand as ReturnType<typeof vi.fn>;
  vi.clearAllMocks();
});

describe("registerSlashCommands", () => {
  it("registers all six slash commands", () => {
    const mockApp = {
      command: vi.fn(),
    } as unknown as App;

    registerSlashCommands(mockApp);

    expect(mockApp.command).toHaveBeenCalledTimes(10);
    expect(mockApp.command).toHaveBeenCalledWith("/lsb-begin", expect.any(Function));
    expect(mockApp.command).toHaveBeenCalledWith("/lsb-suggest", expect.any(Function));
    expect(mockApp.command).toHaveBeenCalledWith("/lsb-deadline", expect.any(Function));
    expect(mockApp.command).toHaveBeenCalledWith("/lsb-remove", expect.any(Function));
    expect(mockApp.command).toHaveBeenCalledWith("/lsb-list", expect.any(Function));
    expect(mockApp.command).toHaveBeenCalledWith("/lsb-vote", expect.any(Function));
    expect(mockApp.command).toHaveBeenCalledWith("/lsb-showpoll", expect.any(Function));
    expect(mockApp.command).toHaveBeenCalledWith("/lsb-showmasterlist", expect.any(Function));
    expect(mockApp.command).toHaveBeenCalledWith("/lsb-removefrommasterlist", expect.any(Function));
    expect(mockApp.command).toHaveBeenCalledWith("/lsb-help", expect.any(Function));
  });

  it("/lsb-suggest extracts place from body.text", async () => {
    const mockApp = {
      command: vi.fn(),
    } as unknown as App;

    registerSlashCommands(mockApp);

    // Get the /lsb-suggest handler
    const suggestCall = (mockApp.command as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: any[]) => call[0] === "/lsb-suggest"
    )!;
    const suggestHandler = suggestCall[1];

    const mockAck = vi.fn().mockResolvedValue(undefined);
    const mockSay = vi.fn().mockResolvedValue(undefined);

    await suggestHandler({
      ack: mockAck,
      say: mockSay,
      body: { text: "Taco Bell", user_id: "U1", channel_id: "C1" },
    });

    expect(mockAck).toHaveBeenCalled();
    expect(mockRouteCommand).toHaveBeenCalledWith("suggest", {
      say: mockSay,
      args: "Taco Bell",
      userId: "U1",
      channelId: "C1",
    });
  });

  it("/lsb-begin passes empty args", async () => {
    const mockApp = {
      command: vi.fn(),
    } as unknown as App;

    registerSlashCommands(mockApp);

    const beginCall = (mockApp.command as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: any[]) => call[0] === "/lsb-begin"
    )!;
    const beginHandler = beginCall[1];

    const mockAck = vi.fn().mockResolvedValue(undefined);
    const mockSay = vi.fn().mockResolvedValue(undefined);

    await beginHandler({
      ack: mockAck,
      say: mockSay,
      body: { text: "", user_id: "U1", channel_id: "C1" },
    });

    expect(mockAck).toHaveBeenCalled();
    expect(mockRouteCommand).toHaveBeenCalledWith("begin", {
      say: mockSay,
      args: "",
      userId: "U1",
      channelId: "C1",
    });
  });

  it("body.text undefined is handled defensively", async () => {
    const mockApp = {
      command: vi.fn(),
    } as unknown as App;

    registerSlashCommands(mockApp);

    const suggestCall = (mockApp.command as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: any[]) => call[0] === "/lsb-suggest"
    )!;
    const suggestHandler = suggestCall[1];

    const mockAck = vi.fn().mockResolvedValue(undefined);
    const mockSay = vi.fn().mockResolvedValue(undefined);

    await suggestHandler({
      ack: mockAck,
      say: mockSay,
      body: { text: undefined, user_id: "U1", channel_id: "C1" },
    });

    expect(mockRouteCommand).toHaveBeenCalledWith("suggest", {
      say: mockSay,
      args: "",
      userId: "U1",
      channelId: "C1",
    });
  });

  it("/lsb-vote routes to vote command", async () => {
    const mockApp = {
      command: vi.fn(),
    } as unknown as App;

    registerSlashCommands(mockApp);

    const voteCall = (mockApp.command as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: any[]) => call[0] === "/lsb-vote"
    )!;
    const voteHandler = voteCall[1];

    const mockAck = vi.fn().mockResolvedValue(undefined);
    const mockSay = vi.fn().mockResolvedValue(undefined);

    await voteHandler({
      ack: mockAck,
      say: mockSay,
      body: { text: "", user_id: "U1", channel_id: "C1" },
    });

    expect(mockAck).toHaveBeenCalled();
    expect(mockRouteCommand).toHaveBeenCalledWith("vote", {
      say: mockSay,
      args: "",
      userId: "U1",
      channelId: "C1",
    });
  });

  it("/lsb-showpoll routes to showpoll command", async () => {
    const mockApp = {
      command: vi.fn(),
    } as unknown as App;

    registerSlashCommands(mockApp);

    const showpollCall = (mockApp.command as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: any[]) => call[0] === "/lsb-showpoll"
    )!;
    const showpollHandler = showpollCall[1];

    const mockAck = vi.fn().mockResolvedValue(undefined);
    const mockSay = vi.fn().mockResolvedValue(undefined);

    await showpollHandler({
      ack: mockAck,
      say: mockSay,
      body: { text: "", user_id: "U1", channel_id: "C1" },
    });

    expect(mockAck).toHaveBeenCalled();
    expect(mockRouteCommand).toHaveBeenCalledWith("showpoll", {
      say: mockSay,
      args: "",
      userId: "U1",
      channelId: "C1",
    });
  });
});
