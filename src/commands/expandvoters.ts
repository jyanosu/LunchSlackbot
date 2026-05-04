import { getToday, toggleExpandedSuggestion, getExpandedSuggestions } from "../store";
import { buildPollBlocks } from "./vote";

export async function handleExpandVoters({
  ack,
  body,
  client,
}: {
  ack: () => Promise<void>;
  body: any;
  client: any;
}): Promise<void> {
  await ack();

  const place = body.actions?.[0]?.value;
  const channelId = body.channel?.id;
  const messageTs = body.message?.ts;

  if (!place || !channelId || !messageTs) {
    return;
  }

  const today = getToday();
  if (!today?.votingStarted || today.pollEnded) {
    return;
  }

  // Toggle expanded state
  toggleExpandedSuggestion(place);

  // Rebuild poll with updated expanded state
  const expanded = getExpandedSuggestions();
  const blocks = await buildPollBlocks(today.suggestions, undefined, client, expanded);

  await client.chat.update({
    channel: channelId,
    ts: messageTs,
    text: `🗳️ *Voting is open!*`,
    blocks,
  });
}
