import { setSchedule } from "../store";
import { restartSchedule } from "../cron";
import { parseTime, formatTime12 } from "../time-util";

export default async function handleScheduleVote({
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
    await say("Usage: @LunchSlackBot schedulevote <time> (e.g., 10:30 AM)");
    return;
  }

  const time24 = parseTime(input);
  if (!time24) {
    await say("Usage: @LunchSlackBot schedulevote <time> (e.g., 10:30 AM)");
    return;
  }

  setSchedule({ voteTime: time24 });
  restartSchedule();
  await say(`Vote time set to ${formatTime12(time24)} EST.`);
}
