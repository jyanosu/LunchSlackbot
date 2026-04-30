import { describe, it, expect } from "vitest";
import { spawn } from "child_process";
import { resolve } from "path";

const botPath = resolve(__dirname, "../dist/bot.js");

function runBot(env: Record<string, string | undefined>): Promise<{
  code: number | null;
  stderr: string;
}> {
  return new Promise((resolve) => {
    const child = spawn("node", [botPath], {
      env,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      resolve({ code, stderr });
    });
  });
}

describe("env validation", () => {
  it("exits with code 1 when SLACK_BOT_TOKEN is missing", async () => {
    const { code, stderr } = await runBot({
      SLACK_BOT_TOKEN: "",
      SLACK_SIGNING_SECRET: "present",
    });

    expect(code).toBe(1);
    expect(stderr).toContain("Missing required env var: SLACK_BOT_TOKEN");
  });

  it("exits with code 1 when SLACK_SIGNING_SECRET is missing", async () => {
    const { code, stderr } = await runBot({
      SLACK_BOT_TOKEN: "present",
      SLACK_SIGNING_SECRET: "",
    });

    expect(code).toBe(1);
    expect(stderr).toContain("Missing required env var: SLACK_SIGNING_SECRET");
  });

  it("exits with code 1 when both env vars are missing", async () => {
    const { code, stderr } = await runBot({
      SLACK_BOT_TOKEN: "",
      SLACK_SIGNING_SECRET: "",
    });

    expect(code).toBe(1);
    // First check fires, so we see the first error
    expect(stderr).toContain("Missing required env var: SLACK_BOT_TOKEN");
  });
});
