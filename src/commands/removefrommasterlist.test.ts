import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../store", () => ({
  removeFromMasterList: vi.fn(),
}));

import * as store from "../store";
import handleRemoveFromMasterlist from "./removefrommasterlist";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleRemoveFromMasterlist", () => {
  it("removes a place from master list", async () => {
    (store.removeFromMasterList as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const say = vi.fn().mockResolvedValue(undefined);

    await handleRemoveFromMasterlist({ say, args: "Taco Bell" });

    expect(store.removeFromMasterList).toHaveBeenCalledWith("Taco Bell");
    expect(say).toHaveBeenCalledWith("Removed *Taco Bell* from the master list.");
  });

  it("rejects when place not found", async () => {
    (store.removeFromMasterList as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const say = vi.fn().mockResolvedValue(undefined);

    await handleRemoveFromMasterlist({ say, args: "Nonexistent" });

    expect(say).toHaveBeenCalledWith("*Nonexistent* is not in the master list.");
  });

  it("shows usage when no place provided", async () => {
    const say = vi.fn().mockResolvedValue(undefined);

    await handleRemoveFromMasterlist({ say, args: "" });

    expect(say).toHaveBeenCalledWith("Usage: @LunchSlackBot removefrommasterlist <place>");
    expect(store.removeFromMasterList).not.toHaveBeenCalled();
  });

  it("shows usage when args missing entirely", async () => {
    const say = vi.fn().mockResolvedValue(undefined);

    await handleRemoveFromMasterlist({ say });

    expect(say).toHaveBeenCalledWith("Usage: @LunchSlackBot removefrommasterlist <place>");
  });
});
