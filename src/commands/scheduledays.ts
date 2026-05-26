import { setSchedule } from "../store";
import { restartSchedule } from "../cron";

function validateDays(input: string): boolean {
  if (input === '*') return true;
  const tokens = input.split(',');
  for (const token of tokens) {
    if (!token) return false;
    if (/^[0-7]$/.test(token)) continue;
    const rangeMatch = token.match(/^([0-7])-([0-7])$/);
    if (rangeMatch) {
      const low = parseInt(rangeMatch[1], 10);
      const high = parseInt(rangeMatch[2], 10);
      if (low < high) continue;
      return false;
    }
    return false;
  }
  return true;
}

export default async function handleScheduleDays({
  say,
  args,
}: {
  say: (text: string) => Promise<unknown>;
  args?: string;
  userId?: string;
  channelId?: string;
}) {
  const input = (args ?? "").trim();

  if (!input) {
    await say("Usage: @LunchSlackBot scheduledays <days> (e.g., 2-3 for Tue-Wed, 1,3,5 for Mon/Wed/Fri, * for every day)");
    return;
  }

  if (!validateDays(input)) {
    await say("Invalid format. Use cron day-of-week: * (every day), 0/7 (Sun), 1 (Mon), 2-3 (Tue-Wed), 1,3,5 (Mon/Wed/Fri), 1-5 (Mon-Fri).");
    return;
  }

  setSchedule({ days: input });
  await restartSchedule();
  await say(`Days set to ${input}.`);
}
