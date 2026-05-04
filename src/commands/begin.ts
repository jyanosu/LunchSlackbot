import { getToday } from "../store";
import { add } from "../confirmations";

export default async function handleBegin({
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

  if (today?.started) {
    await say(
      "Lunch suggestions are already open for today. Use @LunchSlackBot suggest <place> to add a place."
    );
    return;
  }

  if (!userId || !channelId) {
    await say("Sorry, I couldn't determine your user or channel. Try again.");
    return;
  }

  add(userId, channelId, "begin", null);
  await (say as any)({
    text: "Start lunch suggestions for today?",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Start lunch suggestions for today?",
        },
        accessory: {
          type: "button",
          text: { type: "plain_text", text: "Yes", emoji: false },
          action_id: "confirm_begin",
          style: "primary",
        },
      },
    ],
  });
}
