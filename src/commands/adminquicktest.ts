import { getToday, startToday, startVoting, addSuggestion, endPoll, setPollMessageTs } from "../store";
import { getClient } from "../cron";

export default async function handleAdminQuickTest({
  say,
  channelId,
}: {
  say: (text: string) => Promise<unknown>;
  args?: string;
  userId?: string;
  channelId?: string;
}) {
  if (!channelId) {
    await say("Sorry, I couldn't determine your channel. Try again.");
    return;
  }

  const client = getClient();
  if (!client) {
    await say("Bot client not available. Try again.");
    return;
  }

  // Check if a round is already in progress
  const today = getToday();
  if (today?.started) {
    await say("A lunch round is already in progress. Use @LunchSlackBot adminreset first.");
    return;
  }

  await say("🧪 *Quick test started!* Timeline:\n- 1 min: Suggestions open\n- 6 min: Voting open\n- 11 min: Winner announced");

  // Phase 1: Begin (1 min)
  setTimeout(async () => {
    try {
      const day = startToday();
      if (!day) {
        console.error("[adminquicktest] startToday failed");
        return;
      }

      addSuggestion("Taco Bell");
      addSuggestion("Chipotle");
      addSuggestion("Panda Express");

      await client.chat.postMessage({
        channel: channelId,
        text: `🍱 *[TEST] Lunch suggestions are open!* Deadline: ${day.deadline || "11:00 AM EST"}.`,
      });
    } catch (err) {
      console.error("[adminquicktest] begin phase error:", err);
    }
  }, 60_000);

  // Phase 2: Vote (6 min)
  setTimeout(async () => {
    try {
      const today = getToday();
      if (!today?.started) {
        console.error("[adminquicktest] vote phase — round not started");
        return;
      }

      const day = startVoting();
      if (!day) {
        console.error("[adminquicktest] startVoting failed");
        return;
      }

      const { buildPollBlocks } = await import("./vote");

      const blocks = await buildPollBlocks(day.suggestions, undefined, client);

      await client.chat.postMessage({
        channel: channelId,
        text: "🗳️ *[TEST] Voting is open!* Vote using the buttons below.",
      });

      const message = await client.chat.postMessage({
        channel: channelId,
        text: `🗳️ *[TEST] Voting is open!*`,
        blocks,
      });

      if (message?.ts) {
        setPollMessageTs(message.ts);
      }
    } catch (err) {
      console.error("[adminquicktest] vote phase error:", err);
    }
  }, 360_000);

  // Phase 3: End (11 min)
  setTimeout(async () => {
    try {
      const result = endPoll();
      if (!result) {
        console.error("[adminquicktest] endPoll failed");
        return;
      }

      const tieNote = result.isTie ? " (tiebreaker: random)" : "";
      let resultsText = "**Final results:**\n";

      for (const r of result.results) {
        const winnerIcon = r.place === result.winner.place ? "🏆 " : "";
        resultsText += `${r.rank}. ${winnerIcon}${r.place} — ${r.votes} vote${r.votes !== 1 ? "s" : ""}\n`;
      }

      const announcement = `🥳 *[TEST] Lunch is decided!*${tieNote}

🏆 *${result.winner.place}* — ${result.winner.votes} vote${result.winner.votes !== 1 ? "s" : ""}

---

${resultsText.trim()}`;

      await client.chat.postMessage({
        channel: channelId,
        text: announcement,
      });
    } catch (err) {
      console.error("[adminquicktest] end phase error:", err);
    }
  }, 660_000);
}
