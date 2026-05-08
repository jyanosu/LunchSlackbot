import { setSchedule } from "../store";
import { restartSchedule } from "../cron";
import { parseTime, formatTime12 } from "../time-util";

export default async function handleScheduleBegin({
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
    await say("Usage: @LunchSlackBot schedulebegin <time> (e.g., 9:00 AM)");
    return;
  }

  const time24 = parseTime(input);
  if (!time24) {
    await say("Usage: @LunchSlackBot schedulebegin <time> (e.g., 9:00 AM)");
    return;
  }

  setSchedule({ beginTime: time24 });
  restartSchedule();
  await say(`Begin time set to ${formatTime12(time24)} EST.`);
}
