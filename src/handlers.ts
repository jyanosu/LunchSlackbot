import { parseCommand } from "./parser";

const KNOWN_COMMANDS = new Set([
  "begin",
  "suggest",
  "suggestiondeadline",
  "remove",
  "help",
]);

export async function handleAppMention({
  say,
  event,
}: {
  say: (text: string) => Promise<unknown>;
  event?: { text?: string; user?: string; channel?: string };
}) {
  const text = event?.text ?? "";
  const { command, args } = parseCommand(text);

  if (!command) {
    // No subcommand → Phase 1 title message
    await say("🍱 *Lunchbot* — lunch suggestion bot");
    return;
  }

  if (!KNOWN_COMMANDS.has(command)) {
    await say(
      `Unknown command. Try @LunchSlackBot help for a list of commands.`
    );
    return;
  }

  // Route to command handler
  const handlers: Record<string, Function> = {};

  const importBegin = (await import("./commands/begin")).default;
  handlers.begin = importBegin;

  const importSuggest = (await import("./commands/suggest")).default;
  handlers.suggest = importSuggest;

  const importDeadline = (await import("./commands/deadline")).default;
  handlers.suggestiondeadline = importDeadline;

  const importRemove = (await import("./commands/remove")).default;
  handlers.remove = importRemove;

  const importHelp = (await import("./commands/help")).default;
  handlers.help = importHelp;

  const handler = handlers[command];
  if (handler) {
    await handler({ say, args, userId: event?.user, channelId: event?.channel });
  }
}
