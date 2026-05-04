import { getToday, addSuggestion, getMasterList } from "../store";

export default async function handleSuggestFromMasterlist({
  say,
  args,
}: {
  say: (text: string) => Promise<unknown>;
  args?: string;
  userId?: string;
  channelId?: string;
}) {
  const today = getToday();

  if (!today?.started) {
    await say(
      "Lunch suggestions haven't started yet. Use @LunchSlackBot begin to start."
    );
    return;
  }

  const masterList = getMasterList();
  const places = Array.from(masterList);

  if (places.length === 0) {
    await say(
      "Master list is empty. Use @LunchSlackBot suggest <place> or seedmasterlist to add places."
    );
    return;
  }

  // Parse count from args, default to 5
  let count = 5;
  if (args?.trim()) {
    const parsed = parseInt(args.trim(), 10);
    if (!isNaN(parsed) && parsed > 0) {
      count = parsed;
    }
  }

  // Clamp to available
  count = Math.min(count, places.length);

  // Shuffle and pick
  const shuffled = places.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  // Add each to today's suggestions (skip duplicates)
  const added: string[] = [];
  const skipped: string[] = [];

  for (const place of selected) {
    const result = addSuggestion(place);
    if (result) {
      added.push(place);
    } else {
      skipped.push(place);
    }
  }

  const updated = getToday();
  const list = updated?.suggestions.map((s) => `• ${s}`).join("\n") ?? "";

  let message = `🎲 Picked ${added.length} places from master list.\n`;
  if (added.length > 0) {
    message += `\nAdded:\n${added.map((p) => `• ${p}`).join("\n")}`;
  }
  if (skipped.length > 0) {
    message += `\n\nAlready suggested (skipped):\n${skipped.map((p) => `• ${p}`).join("\n")}`;
  }
  message += `\n\nCurrent suggestions:\n${list}`;

  await say(message);
}
