import { getMasterList } from "../store";

export default async function handleShowmasterlist({
  say,
}: {
  say: (text: string) => Promise<unknown>;
  args?: string;
  userId?: string;
  channelId?: string;
}) {
  const list = getMasterList();

  if (list.size === 0) {
    await say(
      "No places in the master list yet. Use @LunchSlackBot suggest <place> to add one."
    );
    return;
  }

  const items = Array.from(list)
    .sort()
    .map((place, i) => `${i + 1}. ${place}`)
    .join("\n");

  await say(`📋 *Master Suggestion List* (${list.size} places):\n${items}`);
}
