import { add } from "../confirmations";

export default async function handleAdminreset({
  say,
  userId,
  channelId,
}: {
  say: (text: string) => Promise<unknown>;
  args?: string;
  userId?: string;
  channelId?: string;
}) {
  if (!userId || !channelId) {
    await say("Sorry, I couldn't determine your user or channel. Try again.");
    return;
  }

  add(userId, channelId, "adminreset", null);
  await (say as any)({
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Reset LunchBot? This will clear today's suggestions, votes, and user data. Master list will be preserved.",
        },
        accessory: {
          type: "button",
          text: { type: "plain_text", text: "Yes", emoji: false },
          action_id: "confirm_adminreset",
          style: "danger",
        },
      },
    ],
  });
}
