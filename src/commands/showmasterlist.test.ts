import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../store", () => ({
  getMasterList: vi.fn(),
}));

import * as store from "../store";
import handleShowmasterlist from "./showmasterlist";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleShowmasterlist", () => {
  it("shows numbered list with count", async () => {
    (store.getMasterList as ReturnType<typeof vi.fn>).mockReturnValue(
      new Set(["taco bell", "chipotle", "in-n-out"])
    );
    const say = vi.fn().mockResolvedValue(undefined);

    await handleShowmasterlist({ say });

    expect(say).toHaveBeenCalledWith(
      expect.stringContaining("📋 *Master Suggestion List* (3 places)")
    );
  });

  it("shows empty message when list is empty", async () => {
    (store.getMasterList as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
    const say = vi.fn().mockResolvedValue(undefined);

    await handleShowmasterlist({ say });

    expect(say).toHaveBeenCalledWith(
      "No places in the master list yet. Use @LunchSlackBot suggest <place> to add one."
    );
  });
});
