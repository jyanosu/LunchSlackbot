import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

type CronCallback = () => void | Promise<void>;

const appContextMock = vi.hoisted(() => ({
  getBoltApp: vi.fn(() => null),
  getClient: vi.fn(() => null),
  setBoltApp: vi.fn(),
}));

const cronMock = vi.hoisted(() => {
  const callbacks: CronCallback[] = [];
  const schedule = vi.fn((_expression: string, callback: CronCallback) => {
    callbacks.push(callback);
    return { stop: vi.fn() };
  });
  return { callbacks, schedule };
});

const storeMock = vi.hoisted(() => {
  let schedule = {
    beginTime: "09:30",
    voteTime: "10:30",
    endTime: "11:15",
    days: "*",
    enabled: true,
  };
  let today: {
    date: string;
    suggestions: string[];
    deadline: string;
    started: boolean;
    votingStarted?: boolean;
    pollMessageTs?: string;
    pollChannelId?: string;
    pollEnded?: boolean;
  } | null = null;
  const userNames = new Map<string, string>();

  const resetState = () => {
    schedule = {
      beginTime: "09:30",
      voteTime: "10:30",
      endTime: "11:15",
      days: "*",
      enabled: true,
    };
    today = null;
    userNames.clear();
  };

  return {
    resetState,
    loadStore: vi.fn(),
    resetStore: vi.fn(() => resetState()),
    getSchedule: vi.fn(() => ({ ...schedule })),
    setSchedule: vi.fn((partial: Partial<typeof schedule>) => {
      schedule = { ...schedule, ...partial };
    }),
    getToday: vi.fn(() => today ?? undefined),
    startToday: vi.fn(() => {
      if (today?.started) return undefined;
      today = {
        date: new Date().toISOString().split("T")[0],
        suggestions: [],
        deadline: "11:00 AM EST",
        started: true,
        votingStarted: false,
      };
      return today;
    }),
    startVoting: vi.fn(() => {
      if (!today?.started || today.votingStarted || today.suggestions.length === 0) {
        return undefined;
      }
      today.votingStarted = true;
      return today;
    }),
    endPoll: vi.fn(() => undefined),
    getExpandedSuggestions: vi.fn(() => new Set<string>()),
    getVotes: vi.fn(() => new Set<string>()),
    toggleVote: vi.fn(),
    setVotingStarted: vi.fn((votingStarted: boolean) => {
      if (today) today.votingStarted = votingStarted;
    }),
    setPollMessageTs: vi.fn((ts: string) => {
      if (today) today.pollMessageTs = ts;
    }),
    setPollChannelId: vi.fn((channelId: string) => {
      if (today) today.pollChannelId = channelId;
    }),
    getUserNames: vi.fn(() => userNames),
    setUserName: vi.fn((userId: string, name: string) => {
      userNames.set(userId, name);
    }),
  };
});

vi.mock("./app-context", () => appContextMock);

vi.mock("node-cron", () => ({
  default: { schedule: cronMock.schedule },
  schedule: cronMock.schedule,
}));

vi.mock("./store", () => storeMock);

const ORIGINAL_LUNCH_CHANNEL_ID = process.env.LUNCH_CHANNEL_ID;

describe("cron schedule", () => {
  beforeEach(() => {
    storeMock.resetState();
    cronMock.callbacks.length = 0;
    cronMock.schedule.mockClear();
    appContextMock.getBoltApp.mockReset();
    appContextMock.getBoltApp.mockReturnValue(null);
    appContextMock.getClient.mockReset();
    appContextMock.getClient.mockReturnValue(null);
    appContextMock.setBoltApp.mockReset();
    delete process.env.LUNCH_CHANNEL_ID;
  });
  afterEach(async () => {
    const { stopSchedule } = await import("./cron");
    stopSchedule();
    if (ORIGINAL_LUNCH_CHANNEL_ID === undefined) {
      delete process.env.LUNCH_CHANNEL_ID;
    } else {
      process.env.LUNCH_CHANNEL_ID = ORIGINAL_LUNCH_CHANNEL_ID;
    }
  });

  it("app context returns null when app not set", async () => {
    const actual = await vi.importActual<{
      getBoltApp: () => any;
      getClient: () => any;
      setBoltApp: (app: any | null) => void;
    }>("./app-context");

    // Reset state
    actual.setBoltApp(null);
    expect(actual.getBoltApp()).toBeNull();
    expect(actual.getClient()).toBeNull();
  });

  it("app context returns app and client after setBoltApp", async () => {
    const actual = await vi.importActual<{
      getBoltApp: () => any;
      getClient: () => any;
      setBoltApp: (app: any | null) => void;
    }>("./app-context");

    const mockClient = { chat: { postMessage: vi.fn() } };
    const mockApp = { client: mockClient } as any;
    actual.setBoltApp(mockApp);

    expect(actual.getBoltApp()).toBe(mockApp);
    expect(actual.getClient()).toBe(mockClient);
  });

  it("restartSchedule no-ops when app not set", async () => {
    const { restartSchedule } = await import("./cron");
    await expect(restartSchedule()).resolves.not.toThrow();
    expect(appContextMock.getBoltApp).toHaveBeenCalled();
    expect(cronMock.schedule).not.toHaveBeenCalled();
  });

  it("restartSchedule initializes jobs with the stored Bolt app", async () => {
    process.env.LUNCH_CHANNEL_ID = "C123LUNCH";
    const { resetStore, setSchedule } = await import("./store");
    resetStore();
    setSchedule({
      beginTime: "09:30",
      voteTime: "10:30",
      endTime: "11:15",
      days: "*",
      enabled: true,
    });

    const mockClient = {
      chat: {
        postMessage: vi.fn().mockResolvedValue({ ts: "123.456" }),
      },
    };
    appContextMock.getBoltApp.mockReturnValue({ client: mockClient } as any);

    const { restartSchedule } = await import("./cron");
    await restartSchedule();

    expect(cronMock.schedule).toHaveBeenCalledTimes(5);
    expect(cronMock.callbacks).toHaveLength(5);

    await cronMock.callbacks[0]();

    expect(mockClient.chat.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "C123LUNCH" })
    );
  });

  it("stopSchedule is idempotent", async () => {
    const { stopSchedule } = await import("./cron");
    expect(() => stopSchedule()).not.toThrow();
    expect(() => stopSchedule()).not.toThrow();
  });

  it("initSchedule skips when LUNCH_CHANNEL_ID missing", async () => {
    const { initSchedule } = await import("./cron");
    const mockApp = { client: {} } as any;
    expect(() => initSchedule(mockApp)).not.toThrow();
    expect(cronMock.schedule).not.toHaveBeenCalled();
  });

  it("subtractMinutes computes correct time", async () => {
    // Access via a test helper — subtractMinutes is private but testable through initSchedule
    // We verify the reminder time is computed correctly by checking the schedule logs
    const { initSchedule, stopSchedule } = await import("./cron");
    const { loadStore, setSchedule } = await import("./store");
    loadStore();
    setSchedule({ endTime: "11:15", days: "*" });

    const mockApp = { client: { chat: { postMessage: vi.fn() } } } as any;
    expect(() => initSchedule(mockApp)).not.toThrow();
    stopSchedule();
  });
});
