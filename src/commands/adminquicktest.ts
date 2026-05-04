import { getToday, startToday, startVoting, addSuggestion, endPoll, setPollMessageTs, setDeadline } from "../store";
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

  await say("🧪 *Quick test started!* Timeline:\n- 1 min: Suggestions open\n- 6 min: Suggestion reminder\n- 7 min: Voting open\n- 12 min: Voting reminder\n- 13 min: Winner announced");

  // Phase 1: Begin (1 min) — set deadline 6 min from now so reminder fires
  setTimeout(async () => {
    try {
      const day = startToday();
      if (!day) {
        console.error("[adminquicktest] startToday failed");
        return;
      }

      // Set deadline to 7 min from now so suggestion reminder fires at 6 min (5 min before deadline)
      const now = new Date();
      now.setMinutes(now.getMinutes() + 7);
      const deadline = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} EST`;
      setDeadline(deadline);

      addSuggestion("Taco Bell");
      addSuggestion("Chipotle");
      addSuggestion("Panda Express");

      await client.chat.postMessage({
        channel: channelId,
        text: `🍱 *[TEST] Lunch suggestions are open!* Deadline: ${day.deadline || deadline}.`,
      });
    } catch (err) {
      console.error("[adminquicktest] begin phase error:", err);
    }
  }, 60_000);

  // Phase 2: Vote (7 min)
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
      const { getSchedule } = await import("../store");

      const schedule = getSchedule();
      const endTime = schedule.endTime ? `${schedule.endTime} EST` : "not set";
      const blocks = await buildPollBlocks(day.suggestions, undefined, client);

      await client.chat.postMessage({
        channel: channelId,
        text: `🗳️ *[TEST] Voting is open!* Vote using the buttons below. Closes at ${endTime}.`,
      });

      const message = await client.chat.postMessage({
        channel: channelId,
        text: `🗳️ *[TEST] Voting is open!* Closes at ${endTime}`,
        blocks,
      });

      if (message?.ts) {
        setPollMessageTs(message.ts);
      }
    } catch (err) {
      console.error("[adminquicktest] vote phase error:", err);
    }
  }, 420_000);

  // Phase 2.5: Voting reminder (12 min — 5 min before end)
  setTimeout(async () => {
    try {
      const today = getToday();
      if (!today?.votingStarted || today.pollEnded) {
        console.log("[adminquicktest] voting reminder skipped — phase changed");
        return;
      }

      await client.chat.postMessage({
        channel: channelId,
        text: "⏰ *[TEST] Reminder:* Voting closes in 5 minutes! Vote now using the poll buttons below.",
      });
      console.log("[adminquicktest] voting reminder posted");
    } catch (err) {
      console.error("[adminquicktest] voting reminder error:", err);
    }
  }, 720_000);

  // Phase 3: End (13 min)
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
  }, 780_000);
}
