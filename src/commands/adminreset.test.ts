import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../confirmations", () => ({
  add: vi.fn(),
}));

import * as confirmations from "../confirmations";
import handleAdminreset from "./adminreset";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleAdminreset", () => {
  it("sends confirmation button", async () => {
    const say = vi.fn().mockResolvedValue(undefined);

    await handleAdminreset({ say, userId: "U1", channelId: "C1" });

    expect(confirmations.add).toHaveBeenCalledWith("U1", "C1", "adminreset", null);
    expect(say).toHaveBeenCalledWith(
      expect.objectContaining({
        blocks: expect.arrayContaining([
          expect.objectContaining({
            accessory: expect.objectContaining({
              action_id: "confirm_adminreset",
            }),
          }),
        ]),
      })
    );
  });

  it("rejects when userId or channelId missing", async () => {
    const say = vi.fn().mockResolvedValue(undefined);

    await handleAdminreset({ say });

    expect(say).toHaveBeenCalledWith("Sorry, I couldn't determine your user or channel. Try again.");
    expect(confirmations.add).not.toHaveBeenCalled();
  });
});
