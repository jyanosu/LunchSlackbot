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
  await say('Start lunch suggestions for today? Reply with "yes" to confirm.');
}
