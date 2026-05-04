import { describe, it, expect, vi } from "vitest";
import handleHelp from "./help";

describe("help command", () => {
  it("lists all commands with descriptions", async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    await handleHelp({ say });

    expect(say).toHaveBeenCalledWith(
      [
        "🍱 *LunchBot Commands:*",
        "begin - start the lunch poll for the day",
        "suggest <place> - add a lunch place to today's poll",
        "suggestiondeadline <time> - set the suggestion deadline (default 11:00 AM EST)",
        "remove <place> - remove a suggestion from today's poll",
        "help - show this message",
      ].join("\n")
    );
  });
});
