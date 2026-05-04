export interface ParsedCommand {
  command: string;
  args: string;
}

/**
 * Extract subcommand and arguments from app_mention text.
 * Strips any mention prefix (e.g., @LunchSlackBot), trims,
 * splits on first whitespace → command (lowercased) + args.
 * Returns empty strings when no subcommand is present.
 */
export function parseCommand(text: string): ParsedCommand {
  // Strip mention prefix: anything starting with @ (handles @LunchSlackBot, <@U...>, etc.)
  const stripped = text.replace(/^<@[^>]*>\s*/, "").replace(/^@\S+\s*/, "");

  const trimmed = stripped.trim();
  if (!trimmed) {
    return { command: "", args: "" };
  }

  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) {
    // Only a command, no args
    return { command: trimmed.toLowerCase(), args: "" };
  }

  return {
    command: trimmed.substring(0, spaceIndex).toLowerCase(),
    args: trimmed.substring(spaceIndex + 1).trim(),
  };
}
