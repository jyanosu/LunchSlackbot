import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../store", () => ({
  addToMasterList: vi.fn(),
  getMasterList: vi.fn(),
}));

import * as store from "../store";
import handleSeedMasterlist from "./seedmasterlist";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleSeedMasterlist", () => {
  it("adds seed places and reports count", async () => {
    let size = 0;
    (store.getMasterList as ReturnType<typeof vi.fn>).mockImplementation(() => {
      return new Set(Array.from({ length: size }, (_, i) => `place${i}`));
    });
    (store.addToMasterList as ReturnType<typeof vi.fn>).mockImplementation(() => {
      size++;
    });

    const say = vi.fn().mockResolvedValue(undefined);

    await handleSeedMasterlist({ say });

    expect(store.addToMasterList).toHaveBeenCalledTimes(20);
    expect(say).toHaveBeenCalledWith(
      "Seeded master list. 20 new places added (20 total)."
    );
  });

  it("reports correctly when some places already exist", async () => {
    let size = 2;
    (store.getMasterList as ReturnType<typeof vi.fn>).mockImplementation(() => {
      return new Set(Array.from({ length: size }, (_, i) => `place${i}`));
    });
    // Simulate: 2 of 20 seed places already exist, so only 18 are added
    let callCount = 0;
    (store.addToMasterList as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      if (callCount <= 18) {
        size++;
      }
    });

    const say = vi.fn().mockResolvedValue(undefined);

    await handleSeedMasterlist({ say });

    expect(store.addToMasterList).toHaveBeenCalledTimes(20);
    expect(say).toHaveBeenCalledWith(
      "Seeded master list. 18 new places added (20 total)."
    );
  });
});
