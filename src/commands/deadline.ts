import { getToday, setDeadline } from "../store";

/**
 * Parse a time string like "10:30 AM", "10:30", "11:30 PM".
 * Returns normalized "HH:MM AM/PM" or null if invalid.
 */
function parseTime(input: string): string | null {
  const trimmed = input.trim();

  // Match HH:MM with optional AM/PM
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!match) return null;

  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase() ?? "AM";

  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
}

export default async function handleDeadline({
  say,
  args,
}: {
  say: (text: string) => Promise<unknown>;
  args?: string;
  userId?: string;
  channelId?: string;
}) {
  const timeInput = args?.trim();

  if (!timeInput) {
    await say(
      "Usage: @LunchSlackBot suggestiondeadline <time> (e.g., 10:30 AM)"
    );
    return;
  }

  const today = getToday();

  if (!today) {
    await say(
      "Lunch suggestions haven't started yet. Use @LunchSlackBot begin to start."
    );
    return;
  }

  const parsed = parseTime(timeInput);

  if (!parsed) {
    await say(
      "Usage: @LunchSlackBot suggestiondeadline <time> (e.g., 10:30 AM)"
    );
    return;
  }

  setDeadline(parsed);
  await say(`⏰ Deadline set to ${parsed} EST.`);
}
