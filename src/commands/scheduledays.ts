import { setSchedule } from "../store";
import { restartSchedule } from "../cron";

const DAYS_REGEX = /^\*$|^\d{1,2}([-,\d]*)$/;

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

  if (!DAYS_REGEX.test(input)) {
    await say("Invalid format. Use cron day-of-week: * (every day), 0/7 (Sun), 1 (Mon), 2-3 (Tue-Wed), 1,3,5 (Mon/Wed/Fri), 1-5 (Mon-Fri).");
    return;
  }

  setSchedule({ days: input });
  restartSchedule();
  await say(`Days set to ${input}.`);
}
