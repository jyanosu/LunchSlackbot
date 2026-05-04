import { parseCommand } from "./parser";

export const KNOWN_COMMANDS = new Set([
  "begin",
  "suggest",
  "suggestiondeadline",
  "remove",
  "list",
  "help",
  "vote",
  "showpoll",
  "showmasterlist",
  "removefrommasterlist",
  "adminreset",
  "seedmasterlist",
  "suggestfrommasterlist",
  "endpoll",
  "showhistory",
  "history",
  "schedulebegin",
  "schedulevote",
  "scheduleend",
  "schedule",
  "adminquicktest",
]);

export interface CommandContext {
  say: (text: string) => Promise<unknown>;
  args?: string;
  userId?: string;
  channelId?: string;
}

export async function loadCommandHandlers(): Promise<Record<string, Function>> {
  const handlers: Record<string, Function> = {};

  handlers.begin = (await import("./commands/begin")).default;
  handlers.suggest = (await import("./commands/suggest")).default;
  handlers.suggestiondeadline = (await import("./commands/deadline")).default;
  handlers.remove = (await import("./commands/remove")).default;
  handlers.list = (await import("./commands/list")).default;
  handlers.help = (await import("./commands/help")).default;
  handlers.vote = (await import("./commands/vote")).default;
  handlers.showpoll = (await import("./commands/showpoll")).default;
  handlers.showmasterlist = (await import("./commands/showmasterlist")).default;
  handlers.removefrommasterlist = (await import("./commands/removefrommasterlist")).default;
  handlers.adminreset = (await import("./commands/adminreset")).default;
  handlers.seedmasterlist = (await import("./commands/seedmasterlist")).default;
  handlers.suggestfrommasterlist = (await import("./commands/suggestfrommasterlist")).default;
  handlers.endpoll = (await import("./commands/endpoll")).default;
  handlers.showhistory = (await import("./commands/showhistory")).default;
  handlers.history = handlers.showhistory; // alias
  handlers.schedulebegin = (await import("./commands/schedulebegin")).default;
  handlers.schedulevote = (await import("./commands/schedulevote")).default;
  handlers.scheduleend = (await import("./commands/scheduleend")).default;
  handlers.schedule = (await import("./commands/showschedule")).default;
  handlers.adminquicktest = (await import("./commands/adminquicktest")).default;

  return handlers;
}

export async function routeCommand(
  command: string,
  context: CommandContext
): Promise<void> {
  const handlers = await loadCommandHandlers();
  const handler = handlers[command];
  if (handler) {
    await handler(context);
  }
}

export async function handleAppMention({
  say,
  event,
}: {
  say: (text: string) => Promise<unknown>;
  event?: { text?: string; user?: string; channel?: string };
}) {
  console.log("[app_mention] received", { text: event?.text, user: event?.user });
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

  await routeCommand(command, {
    say,
    args,
    userId: event?.user,
    channelId: event?.channel,
  });
}
