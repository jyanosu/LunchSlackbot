import { setSchedule } from "../store";
import { restartSchedule } from "../cron";
import { parseTime, formatTime12 } from "../time-util";

export default async function handleScheduleEnd({
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
    await say("Usage: @LunchSlackBot scheduleend <time> (e.g., 11:15 AM)");
    return;
  }

  const time24 = parseTime(input);
  if (!time24) {
    await say("Usage: @LunchSlackBot scheduleend <time> (e.g., 11:15 AM)");
    return;
  }

  setSchedule({ endTime: time24 });
  restartSchedule();
  await say(`End time set to ${formatTime12(time24)} EST.`);
}
