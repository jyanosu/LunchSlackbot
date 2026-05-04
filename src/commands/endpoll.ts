import { getToday, getVotes, setPollEnded, addWinner } from "../store";

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

  // Compute results: count votes per suggestion
  const results: Array<{ place: string; votes: number }> = today.suggestions.map((place) => ({
    place,
    votes: getVotes(place).size,
  }));

  // Sort: descending by vote count, ascending by name for ties
  results.sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    return a.place.localeCompare(b.place);
  });

  // Pick winner: first in sorted list
  const topVotes = results[0].votes;
  const tiedWinners = results.filter((r) => r.votes === topVotes);
  const isTie = tiedWinners.length > 1;

  // If tie, pick randomly; otherwise first place wins
  const winner = isTie
    ? tiedWinners[Math.floor(Math.random() * tiedWinners.length)]
    : tiedWinners[0];
  const totalVotes = results.reduce((sum, r) => sum + r.votes, 0);

  // Save winner to history
  addWinner({
    date: today.date,
    place: winner.place,
    voteCount: winner.votes,
    totalVotes,
  });

  // Mark poll as ended
  setPollEnded();

  // Build final announcement
  const tieNote = isTie ? " (tiebreaker: random)" : "";
  let resultsText = "*Final results:**\n";

  let rank = 1;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    // If tied with previous, keep same rank
    if (i > 0 && r.votes === results[i - 1].votes) {
      // same rank as previous
    } else {
      rank = i + 1;
    }
    const winnerIcon = r.place === winner.place ? "🏆 " : "";
    resultsText += `${rank}. ${winnerIcon}${r.place} — ${r.votes} vote${r.votes !== 1 ? "s" : ""}\n`;
  }

  const announcement = `🥳 *Lunch is decided!*${tieNote}

🏆 *${winner.place}* — ${winner.votes} vote${winner.votes !== 1 ? "s" : ""}

---

${resultsText.trim()}`;

  await say(announcement);
}
