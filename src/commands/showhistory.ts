import { getWinners } from "../store";

export default async function handleShowHistory({
  say,
}: {
  say: (text: string) => Promise<unknown>;
  args?: string;
  userId?: string;
  channelId?: string;
}) {
  const winners = getWinners();

  if (winners.length === 0) {
    await say("📋 *Lunch History*\n\nNo winners yet. End a poll with @LunchSlackBot endpoll to start tracking.");
    return;
  }

  // Sort reverse-chronologically (newest first)
  const sorted = [...winners].sort((a, b) => b.date.localeCompare(a.date));

  const lines: string[] = [];
  for (const w of sorted) {
    lines.push(`${w.date}: 🏆 ${w.place} (${w.voteCount} votes)`);
    if (w.runnersUp && w.runnersUp.length > 0) {
      for (const r of w.runnersUp) {
        lines.push(`  ${r.place} — ${r.votes} vote${r.votes !== 1 ? "s" : ""}`);
      }
    }
  }

  await say("📋 *Lunch History*\n\n" + lines.join("\n"));
}
