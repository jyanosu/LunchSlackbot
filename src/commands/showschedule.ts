import { getSchedule, setSchedule } from "../store";
import { restartSchedule, stopSchedule } from "../cron";
import { formatTime12 } from "../time-util";

export default async function handleShowSchedule({
  say,
  args,
}: {
  say: (text: string) => Promise<unknown>;
  args?: string;
  userId?: string;
  channelId?: string;
}) {
  const input = (args ?? "").trim().toLowerCase();
  const schedule = getSchedule();

  if (input === "enable") {
    if (schedule.enabled) {
      await say("Schedule is already enabled.");
      return;
    }
    setSchedule({ enabled: true });
    restartSchedule();
    await say("Schedule enabled.");
    return;
  }

  if (input === "disable") {
    if (!schedule.enabled) {
      await say("Schedule is already disabled.");
      return;
    }
    setSchedule({ enabled: false });
    stopSchedule();
    await say("Schedule disabled.");
    return;
  }

  // Show current schedule
  const enabledText = schedule.enabled ? "enabled" : "disabled";
  const daysText = schedule.days === "*" ? "every day" : `days: ${schedule.days}`;

  await say(
    [
      `📅 *Lunch Schedule:* (${enabledText})`,
      `Days: ${daysText}`,
      `Begin: ${formatTime12(schedule.beginTime)} EST`,
      `Vote: ${formatTime12(schedule.voteTime)} EST`,
      `End: ${formatTime12(schedule.endTime)} EST`,
    ].join("\n")
  );
}
