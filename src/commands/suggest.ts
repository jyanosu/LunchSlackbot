import { getToday, addSuggestion } from "../store";

export default async function handleSuggest({
  say,
  args,
}: {
  say: (text: string) => Promise<unknown>;
  args?: string;
  userId?: string;
  channelId?: string;
}) {
  const place = args?.trim();

  if (!place) {
    await say("Usage: @LunchSlackBot suggest <place>");
    return;
  }

  const today = getToday();

  if (!today?.started) {
    await say(
      "Lunch suggestions haven't started yet. Use @LunchSlackBot begin to start."
    );
    return;
  }

  const added = addSuggestion(place);

  if (!added) {
    await say(`*${place}* is already suggested.`);
    return;
  }

  const updated = getToday();
  const list = updated?.suggestions.map((s) => `• ${s}`).join("\n") ?? "";
  await say(`✅ Added *${place}*.\n\nCurrent suggestions:\n${list}`);
}
