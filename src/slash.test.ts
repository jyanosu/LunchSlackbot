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
  it("registers all slash commands", () => {
    const mockApp = {
      command: vi.fn(),
    } as unknown as App;

    registerSlashCommands(mockApp);

    expect(mockApp.command).toHaveBeenCalledTimes(19);
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
    expect(mockApp.command).toHaveBeenCalledWith("/lsb-seedmasterlist", expect.any(Function));
    expect(mockApp.command).toHaveBeenCalledWith("/lsb-suggestfrommasterlist", expect.any(Function));
    expect(mockApp.command).toHaveBeenCalledWith("/lsb-endpoll", expect.any(Function));
    expect(mockApp.command).toHaveBeenCalledWith("/lsb-showhistory", expect.any(Function));
    expect(mockApp.command).toHaveBeenCalledWith("/lsb-schedulebegin", expect.any(Function));
    expect(mockApp.command).toHaveBeenCalledWith("/lsb-schedulevote", expect.any(Function));
    expect(mockApp.command).toHaveBeenCalledWith("/lsb-scheduleend", expect.any(Function));
    expect(mockApp.command).toHaveBeenCalledWith("/lsb-scheduledays", expect.any(Function));
    expect(mockApp.command).toHaveBeenCalledWith("/lsb-schedule", expect.any(Function));
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

  it("/lsb-seedmasterlist routes to seedmasterlist command", async () => {
    const mockApp = {
      command: vi.fn(),
    } as unknown as App;

    registerSlashCommands(mockApp);

    const seedCall = (mockApp.command as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: any[]) => call[0] === "/lsb-seedmasterlist"
    )!;
    const seedHandler = seedCall[1];

    const mockAck = vi.fn().mockResolvedValue(undefined);
    const mockSay = vi.fn().mockResolvedValue(undefined);

    await seedHandler({
      ack: mockAck,
      say: mockSay,
      body: { text: "", user_id: "U1", channel_id: "C1" },
    });

    expect(mockAck).toHaveBeenCalled();
    expect(mockRouteCommand).toHaveBeenCalledWith("seedmasterlist", {
      say: mockSay,
      args: "",
      userId: "U1",
      channelId: "C1",
    });
  });

  it("/lsb-suggestfrommasterlist extracts count from body.text", async () => {
    const mockApp = {
      command: vi.fn(),
    } as unknown as App;

    registerSlashCommands(mockApp);

    const suggestCall = (mockApp.command as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: any[]) => call[0] === "/lsb-suggestfrommasterlist"
    )!;
    const suggestHandler = suggestCall[1];

    const mockAck = vi.fn().mockResolvedValue(undefined);
    const mockSay = vi.fn().mockResolvedValue(undefined);

    await suggestHandler({
      ack: mockAck,
      say: mockSay,
      body: { text: "3", user_id: "U1", channel_id: "C1" },
    });

    expect(mockAck).toHaveBeenCalled();
    expect(mockRouteCommand).toHaveBeenCalledWith("suggestfrommasterlist", {
      say: mockSay,
      args: "3",
      userId: "U1",
      channelId: "C1",
    });
  });

  it("/lsb-endpoll routes to endpoll command", async () => {
    const mockApp = {
      command: vi.fn(),
    } as unknown as App;

    registerSlashCommands(mockApp);

    const endpollCall = (mockApp.command as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: any[]) => call[0] === "/lsb-endpoll"
    )!;
    const endpollHandler = endpollCall[1];

    const mockAck = vi.fn().mockResolvedValue(undefined);
    const mockSay = vi.fn().mockResolvedValue(undefined);

    await endpollHandler({
      ack: mockAck,
      say: mockSay,
      body: { text: "", user_id: "U1", channel_id: "C1" },
    });

    expect(mockAck).toHaveBeenCalled();
    expect(mockRouteCommand).toHaveBeenCalledWith("endpoll", {
      say: mockSay,
      args: "",
      userId: "U1",
      channelId: "C1",
    });
  });

  it("/lsb-showhistory routes to showhistory command", async () => {
    const mockApp = {
      command: vi.fn(),
    } as unknown as App;

    registerSlashCommands(mockApp);

    const showhistoryCall = (mockApp.command as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: any[]) => call[0] === "/lsb-showhistory"
    )!;
    const showhistoryHandler = showhistoryCall[1];

    const mockAck = vi.fn().mockResolvedValue(undefined);
    const mockSay = vi.fn().mockResolvedValue(undefined);

    await showhistoryHandler({
      ack: mockAck,
      say: mockSay,
      body: { text: "", user_id: "U1", channel_id: "C1" },
    });

    expect(mockAck).toHaveBeenCalled();
    expect(mockRouteCommand).toHaveBeenCalledWith("showhistory", {
      say: mockSay,
      args: "",
      userId: "U1",
      channelId: "C1",
    });
  });
});
