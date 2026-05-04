import { removeFromMasterList } from "../store";

export default async function handleRemoveFromMasterlist({
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
    await say("Usage: @LunchSlackBot removefrommasterlist <place>");
    return;
  }

  const removed = removeFromMasterList(place);

  if (!removed) {
    await say(`*${place}* is not in the master list.`);
    return;
  }

  await say(`Removed *${place}* from the master list.`);
}
