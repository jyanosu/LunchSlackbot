import { describe, it, expect, vi } from "vitest";
import { handleAppMention } from "./handlers";

describe("handleAppMention", () => {
  it("replies with the Lunchbot title message", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleAppMention({ say });

    expect(say).toHaveBeenCalledWith("🍱 *Lunchbot* — lunch suggestion bot");
    expect(say).toHaveBeenCalledTimes(1);
  });
});
