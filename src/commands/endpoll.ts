import { getToday } from "../store";

export default async function handleEndpoll({
  say,
}: {
  say: (text: string) => Promise<unknown>;
  args?: string;
  userId?: string;
  channelId?: string;
}) {
  const today = getToday();

  if (!today?.started) {
    await say("Lunch suggestions haven't started yet. Use @LunchSlackBot begin to start.");
    return;
  }

  if (!today.votingStarted) {
    await say("Voting hasn't started yet. Use @LunchSlackBot vote to begin voting.");
    return;
  }

  if (today.pollEnded) {
    await say("Poll has already ended for today.");
    return;
  }

  // End poll via shared store function
  const { endPoll } = await import("../store");
  const result = endPoll();

  if (!result) {
    await say("Could not end poll. Poll may have already ended.");
    return;
  }

  // Build final announcement
  const tieNote = result.isTie ? " (tiebreaker: random)" : "";
  let resultsText = "*Final results:**\n";

  for (const r of result.results) {
    const winnerIcon = r.place === result.winner.place ? "🏆 " : "";
    resultsText += `${r.rank}. ${winnerIcon}${r.place} — ${r.votes} vote${r.votes !== 1 ? "s" : ""}\n`;
  }

  const announcement = `🥳 *Lunch is decided!*${tieNote}

🏆 *${result.winner.place}* — ${result.winner.votes} vote${result.winner.votes !== 1 ? "s" : ""}

---

${resultsText.trim()}`;

  await say(announcement);
}
