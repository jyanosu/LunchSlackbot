import cron, { ScheduledTask } from "node-cron";
import { App } from "@slack/bolt";
import {
  getSchedule,
  startToday,
  startVoting,
  endPoll,
  getToday,
  type LunchSchedule,
} from "./store";
import { routeCommand } from "./handlers";

const TZ = "America/New_York";

let beginJob: ScheduledTask | null = null;
let voteJob: ScheduledTask | null = null;
let endJob: ScheduledTask | null = null;
let boltApp: App | null = null;

function buildCronExpression(time: string, days: string): string {
  const [hours, minutes] = time.split(":");
  return `${minutes} ${hours} * * ${days}`;
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

  const deadline = day.deadline || "11:00 AM EST";
  await client.chat.postMessage({
    channel,
    text: `🍱 Lunch suggestions are open! Use @LunchSlackBot suggest <place> to add a place. Deadline: ${deadline}.`,
  });
  console.log(`[cron] begin — suggestions open, deadline: ${deadline}`);
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
  const { setPollMessageTs } = await import("./store");

  const deadline = day.deadline || "11:45 AM";
  const blocks = await buildPollBlocks(day.suggestions, undefined, client);

  await client.chat.postMessage({
    channel,
    text: "🗳️ Voting is open! Check the poll below and vote using the buttons.",
  });

  const message = await client.chat.postMessage({
    channel,
    text: `🗳️ *Voting is open!* Deadline: ${deadline} EST`,
    blocks,
  });

  if (message?.ts) {
    setPollMessageTs(message.ts);
  }

  console.log(`[cron] vote — voting open, deadline: ${deadline}`);
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
  let resultsText = "*Final results:**\n";

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

export function stopSchedule(): void {
  if (beginJob) { beginJob.stop(); beginJob = null; }
  if (voteJob) { voteJob.stop(); voteJob = null; }
  if (endJob) { endJob.stop(); endJob = null; }
}

export function setBoltApp(app: App): void {
  boltApp = app;
}

export function restartSchedule(): void {
  if (!boltApp) {
    console.warn("[schedule] cannot restart — app not set");
    return;
  }
  stopSchedule();
  initSchedule(boltApp);
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

  console.log(`[schedule] cron jobs registered: begin=${schedule.beginTime}, vote=${schedule.voteTime}, end=${schedule.endTime}, days=${schedule.days}`);
}
