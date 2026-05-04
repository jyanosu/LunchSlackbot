import { getToday } from "../store";
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

  const deadline = today.deadline || DEFAULT_DEADLINE;
  const blocks = await buildPollBlocks(today.suggestions, undefined, client);

  const message = await (say as any)({
    text: `🗳️ *Voting is open!* Deadline: ${deadline} EST`,
    blocks,
  });

  // Save the message ts for future updates
  if (message?.ts) {
    const { setPollMessageTs } = await import("../store");
    setPollMessageTs(message.ts);
  }
}
