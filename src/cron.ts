import cron, { ScheduledTask } from "node-cron";
import { App } from "@slack/bolt";
import {
  getSchedule,
  startToday,
  startVoting,
  endPoll,
  getToday,
  getExpandedSuggestions,
  type LunchSchedule,
} from "./store";
import { formatTime12 } from "./time-util";
import { routeCommand } from "./handlers";
import { buildPollBlocks } from "./commands/vote";

const TZ = "America/New_York";

let beginJob: ScheduledTask | null = null;
let voteJob: ScheduledTask | null = null;
let endJob: ScheduledTask | null = null;
let suggestReminderJob: ScheduledTask | null = null;
let voteReminderJob: ScheduledTask | null = null;

function buildCronExpression(time: string, days: string): string {
  const [hours, minutes] = time.split(":");
  return `${minutes} ${hours} * * ${days}`;
}

/**
 * Subtract minutes from a "HH:MM" time string. Returns "HH:MM".
 */
function subtractMinutes(time: string, mins: number): string {
  let [hours, minutes] = time.split(":").map(Number);
  minutes -= mins;
  while (minutes < 0) {
    minutes += 60;
    hours -= 1;
  }
  if (hours < 0) hours += 24;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

async function runBegin(client: any, channel: string): Promise<void> {
  const today = getToday();
  if (today?.started) {
    console.log("[cron] begin skipped — round already started");
    return;
  }

  const day = startToday();
  if (!day) {
    console.log("[cron] begin failed — startToday returned undefined");
    return;
  }

  const voteTime = formatTime12(getSchedule().voteTime);
  await client.chat.postMessage({
    channel,
    text: `🍱 Lunch suggestions are open! Use @LunchSlackBot suggest <place> to add a place. Voting starts at ${voteTime} EST.`,
  });
  console.log(`[cron] begin — suggestions open, voting starts at ${voteTime} EST`);
}

async function runVote(client: any, channel: string): Promise<void> {
  const today = getToday();
  if (today?.votingStarted) {
    console.log("[cron] vote skipped — voting already started");
    return;
  }

  const day = startVoting();
  if (!day) {
    console.log("[cron] vote skipped — no suggestions or voting already started");
    return;
  }

  // Import buildPollBlocks dynamically to avoid circular deps
  const { buildPollBlocks } = await import("./commands/vote");
  const { setPollMessageTs, getSchedule, getExpandedSuggestions } = await import("./store");

  const schedule = getSchedule();
  const endTime = schedule.endTime ? `${schedule.endTime} EST` : "not set";
  const blocks = await buildPollBlocks(day.suggestions, undefined, client, getExpandedSuggestions());

  await client.chat.postMessage({
    channel,
    text: `🗳️ Voting is open! Check the poll below and vote using the buttons. Voting closes at ${endTime}.`,
  });

  const message = await client.chat.postMessage({
    channel,
    text: `🗳️ *Voting is open!* Closes at ${endTime}`,
    blocks,
  });

  if (message?.ts) {
    setPollMessageTs(message.ts);
    const { setPollChannelId } = await import("./store");
    setPollChannelId(channel);
  }

  console.log(`[cron] vote — voting open, closes at ${endTime}`);
}

async function runEnd(client: any, channel: string): Promise<void> {
  const today = getToday();
  if (today?.pollEnded) {
    console.log("[cron] end skipped — poll already ended");
    return;
  }

  const result = endPoll();
  if (!result) {
    console.log("[cron] end skipped — poll not ready to end");
    return;
  }

  const tieNote = result.isTie ? " (tiebreaker: random)" : "";
  let resultsText = "**Final results:**\n";

  for (const r of result.results) {
    const winnerIcon = r.place === result.winner.place ? "🏆 " : "";
    resultsText += `${r.rank}. ${winnerIcon}${r.place} — ${r.votes} vote${r.votes !== 1 ? "s" : ""}\n`;
  }

  const announcement = `🥳 *Lunch is decided!*${tieNote}

🏆 *${result.winner.place}* — ${result.winner.votes} vote${result.winner.votes !== 1 ? "s" : ""}

---

${resultsText.trim()}`;

  await client.chat.postMessage({
    channel,
    text: announcement,
  });

  console.log(`[cron] end — winner: ${result.winner.place} (${result.winner.votes} votes)`);
}

async function runVoteReminder(client: any, channel: string): Promise<void> {
  const today = getToday();
  if (!today?.votingStarted) {
    console.log("[cron] vote reminder skipped — voting not started");
    return;
  }
  if (today.pollEnded) {
    console.log("[cron] vote reminder skipped — poll already ended");
    return;
  }

  const blocks = await buildPollBlocks(today.suggestions, undefined, client, getExpandedSuggestions());
  const reminderBlocks: Array<Record<string, unknown>> = [
    {
      type: "section",
      text: { type: "mrkdwn", text: "⏰ *Reminder:* Voting closes in 5 minutes!" },
    },
    ...blocks,
  ];
  await client.chat.postMessage({
    channel,
    text: "⏰ *Reminder:* Voting closes in 5 minutes!",
    blocks: reminderBlocks,
  });
  console.log("[cron] vote reminder posted");
}

async function runSuggestionReminder(client: any, channel: string): Promise<void> {
  const today = getToday();
  if (!today?.started) {
    console.log("[cron] suggestion reminder skipped — round not started");
    return;
  }
  if (today.votingStarted) {
    console.log("[cron] suggestion reminder skipped — voting already started");
    return;
  }
  if (today.pollEnded) {
    console.log("[cron] suggestion reminder skipped — poll already ended");
    return;
  }

  const list = today.suggestions.length > 0
    ? `\nCurrent suggestions: ${today.suggestions.sort((a, b) => a.localeCompare(b)).join(", ")}`
    : "\nNo suggestions yet.";

  await client.chat.postMessage({
    channel,
    text: `⏰ *Reminder:* Voting opens in 5 minutes! Use @LunchSlackBot suggest <place> to add a suggestion.${list}`,
  });
  console.log("[cron] suggestion reminder posted");
}

export function stopSchedule(): void {
  if (beginJob) { beginJob.stop(); beginJob = null; }
  if (voteJob) { voteJob.stop(); voteJob = null; }
  if (endJob) { endJob.stop(); endJob = null; }
  if (suggestReminderJob) { suggestReminderJob.stop(); suggestReminderJob = null; }
  if (voteReminderJob) { voteReminderJob.stop(); voteReminderJob = null; }
}

export async function restartSchedule(): Promise<void> {
  const { getClient } = await import("./app-context");
  const app = getClient();
  if (!app) {
    console.warn("[schedule] cannot restart — app not set");
    return;
  }
  stopSchedule();
  initSchedule(app);
}

export function initSchedule(app: App): void {
  const channel = process.env.LUNCH_CHANNEL_ID;
  if (!channel) {
    console.warn("[schedule] LUNCH_CHANNEL_ID not set — cron jobs not registered");
    return;
  }

  stopSchedule();

  const schedule = getSchedule();
  if (!schedule.enabled) {
    console.log("[schedule] schedule disabled — cron jobs not registered");
    return;
  }

  const client = app.client;

  beginJob = cron.schedule(
    buildCronExpression(schedule.beginTime, schedule.days),
    async () => {
      try {
        await runBegin(client, channel);
      } catch (err) {
        console.error("[cron] begin error:", err);
      }
    },
    { timezone: TZ }
  );

  voteJob = cron.schedule(
    buildCronExpression(schedule.voteTime, schedule.days),
    async () => {
      try {
        await runVote(client, channel);
      } catch (err) {
        console.error("[cron] vote error:", err);
      }
    },
    { timezone: TZ }
  );

  endJob = cron.schedule(
    buildCronExpression(schedule.endTime, schedule.days),
    async () => {
      try {
        await runEnd(client, channel);
      } catch (err) {
        console.error("[cron] end error:", err);
      }
    },
    { timezone: TZ }
  );

  // Suggestion reminder: 5 min before voting opens
  const suggestReminderTime = subtractMinutes(schedule.voteTime, 5);
  suggestReminderJob = cron.schedule(
    buildCronExpression(suggestReminderTime, schedule.days),
    async () => {
      try {
        await runSuggestionReminder(client, channel);
      } catch (err) {
        console.error("[cron] suggestion reminder error:", err);
      }
    },
    { timezone: TZ }
  );

  // Vote reminder: 5 min before end
  const voteReminderTime = subtractMinutes(schedule.endTime, 5);
  voteReminderJob = cron.schedule(
    buildCronExpression(voteReminderTime, schedule.days),
    async () => {
      try {
        await runVoteReminder(client, channel);
      } catch (err) {
        console.error("[cron] vote reminder error:", err);
      }
    },
    { timezone: TZ }
  );

  console.log(`[schedule] cron jobs registered: begin=${schedule.beginTime}, vote=${schedule.voteTime}, end=${schedule.endTime}, days=${schedule.days}`);
}
