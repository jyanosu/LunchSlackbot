import { getToday, getSchedule } from "../store";
import { buildPollBlocks } from "./vote";

const DEFAULT_DEADLINE = "11:45 AM";

export interface ShowpollCommandContext {
  say: (text: string) => Promise<unknown>; // also accepts { text, blocks }
  args?: string;
  userId?: string;
  channelId?: string;
  client?: any;
}

export default async function handleShowpoll({
  say,
  userId,
  channelId,
  client,
}: ShowpollCommandContext) {
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

  const schedule = getSchedule();
  const endTime = schedule.endTime ? `${schedule.endTime} EST` : "not set";
  const blocks = await buildPollBlocks(today.suggestions, userId, client);

  const message = await (say as any)({
    text: `🗳️ *Voting is open!* Closes at ${endTime}`,
    blocks,
  });

  // Save the message ts for future updates
  if (message?.ts) {
    const { setPollMessageTs } = await import("../store");
    setPollMessageTs(message.ts);
  }
}
