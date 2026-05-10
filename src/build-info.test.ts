import { describe, it, expect } from "vitest";
import { getBuildInfo } from "./build-info";

describe("build-info", () => {
  it("returns null when build-info.json does not exist", () => {
    // In test environment, src/build-info.json doesn't exist
    const info = getBuildInfo();
    expect(info).toBeNull();
  });
});
