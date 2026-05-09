import { getSchedule, setSchedule } from "../store";

export default async function handlePrune({
  say,
  args,
}: {
  say: (text: string) => Promise<unknown>;
  args?: string;
  userId?: string;
  channelId?: string;
}) {
  const input = (args ?? "").trim();

  // No args: show current setting
  if (!input) {
    const schedule = getSchedule();
    const pruneDays = schedule.pruneDays ?? 120;
    await say(`Prune retention: ${pruneDays} days (default: 120). Use @LunchSlackBot prune <days> to change.`);
    return;
  }

  // Parse and validate
  const days = parseInt(input, 10);
  if (isNaN(days) || days < 7) {
    await say("Prune retention must be at least 7 days. Usage: @LunchSlackBot prune <days> (e.g., 90)");
    return;
  }

  setSchedule({ pruneDays: days });
  await say(`Prune retention set to ${days} days.`);
}
