import { add } from "../confirmations";
import { getToday } from "../store";

export default async function handleAdminClearSuggestions({
  say,
  userId,
  channelId,
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

  if (today.suggestions.length === 0) {
    await say("No suggestions to clear.");
    return;
  }

  if (!userId || !channelId) {
    await say("Sorry, I couldn't determine your user or channel. Try again.");
    return;
  }

  add(userId, channelId, "clearsuggestions", null);
  await (say as any)({
    text: `Clear all ${today.suggestions.length} suggestions?`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Clear all ${today.suggestions.length} suggestions? Votes and master list will be preserved.`,
        },
        accessory: {
          type: "button",
          text: { type: "plain_text", text: "Yes", emoji: false },
          action_id: "confirm_clearsuggestions",
          style: "danger",
        },
      },
    ],
  });
}
