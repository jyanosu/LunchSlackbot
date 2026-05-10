import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("version command", () => {
  let say: ReturnType<typeof vi.fn>;
  let buildInfoModule: { getBuildInfo: () => { timestamp: string } | null };

  beforeEach(() => {
    say = vi.fn().mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows build timestamp when build-info.json exists", async () => {
    const handleVersion = (await import("./version")).default;

    buildInfoModule = await import("../build-info");
    vi.spyOn(buildInfoModule, "getBuildInfo").mockReturnValue({
      timestamp: "2025-01-15T10:30:00.000Z",
    });

    await handleVersion({ say });

    expect(say).toHaveBeenCalledWith(
      "🔧 *Last built:* 2025-01-15T10:30:00.000Z"
    );
  });

  it("shows unknown when build-info.json is missing", async () => {
    const handleVersion = (await import("./version")).default;

    buildInfoModule = await import("../build-info");
    vi.spyOn(buildInfoModule, "getBuildInfo").mockReturnValue(null);

    await handleVersion({ say });

    expect(say).toHaveBeenCalledWith("🔧 *Last built:* unknown");
  });
});
