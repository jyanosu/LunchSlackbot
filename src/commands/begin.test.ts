import { describe, it, expect, vi, beforeEach } from "vitest";

let mockGetToday: ReturnType<typeof vi.fn>;
let mockAdd: ReturnType<typeof vi.fn>;

vi.mock("../store", () => ({
  getToday: vi.fn(),
}));

vi.mock("../confirmations", () => ({
  add: vi.fn(),
}));

// Import after mocks are set up
import * as store from "../store";
import * as confirmations from "../confirmations";
import handleBegin from "./begin";

beforeEach(() => {
  mockGetToday = (store.getToday as ReturnType<typeof vi.fn>);
  mockAdd = (confirmations.add as ReturnType<typeof vi.fn>);
  vi.clearAllMocks();
});

describe("begin command", () => {
  it("notifies when round already started", async () => {
    mockGetToday.mockReturnValue({
      date: "2025-01-15",
      suggestions: [],
      deadline: "11:00 AM",
      started: true,
    });

    const say = vi.fn().mockResolvedValue(undefined);
    await handleBegin({ say, userId: "U123", channelId: "C123" });

    expect(say).toHaveBeenCalledWith(
      "Lunch suggestions are already open for today. Use @LunchSlackBot suggest <place> to add a place."
    );
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("prompts for confirmation when round not started", async () => {
    mockGetToday.mockReturnValue(undefined);

    const say = vi.fn().mockResolvedValue(undefined);
    await handleBegin({ say, userId: "U123", channelId: "C123" });

    expect(say).toHaveBeenCalledWith(
      'Start lunch suggestions for today? Reply with "yes" to confirm.'
    );
    expect(mockAdd).toHaveBeenCalledWith("U123", "C123", "begin", null);
  });

  it("prompts when day exists but not started", async () => {
    mockGetToday.mockReturnValue({
      date: "2025-01-15",
      suggestions: [],
      deadline: "11:00 AM",
      started: false,
    });

    const say = vi.fn().mockResolvedValue(undefined);
    await handleBegin({ say, userId: "U123", channelId: "C123" });

    expect(say).toHaveBeenCalledWith(
      'Start lunch suggestions for today? Reply with "yes" to confirm.'
    );
    expect(mockAdd).toHaveBeenCalledWith("U123", "C123", "begin", null);
  });

  it("errors when userId or channelId missing", async () => {
    mockGetToday.mockReturnValue(undefined);

    const say = vi.fn().mockResolvedValue(undefined);
    await handleBegin({ say });

    expect(say).toHaveBeenCalledWith(
      "Sorry, I couldn't determine your user or channel. Try again."
    );
    expect(mockAdd).not.toHaveBeenCalled();
  });
});
