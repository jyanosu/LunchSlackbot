import { getToday, removeSuggestion } from "../store";
import { add, check } from "../confirmations";

export default async function handleRemove({
  say,
  args,
  userId,
  channelId,
}: {
  say: (text: string) => Promise<unknown>;
  args?: string;
  userId?: string;
  channelId?: string;
}) {
  const place = args?.trim();

  if (!place) {
    await say("Usage: @LunchSlackBot remove <place>");
    return;
  }

  const today = getToday();

  if (!today?.started) {
    await say(
      "Lunch suggestions haven't started yet. Use @LunchSlackBot begin to start."
    );
    return;
  }

  if (!today.suggestions.some((s) => s.toLowerCase() === place.toLowerCase())) {
    await say(`*${place}* is not in today's suggestions.`);
    return;
  }

  if (!userId || !channelId) {
    await say("Sorry, I couldn't determine your user or channel. Try again.");
    return;
  }

  add(userId, channelId, "remove", place);
  await say(
    `Remove *${place}* from today's suggestions? Reply with "yes" to confirm.`
  );
}

/**
 * Shared confirmation listener for both `begin` and `remove` commands.
 * Skips bot messages, checks for "yes" reply, executes pending action.
 */
export async function handleConfirmation({
  event,
  say,
  ack,
}: {
  event: { user?: string; channel?: string; text?: string; bot?: boolean };
  say: (text: string) => Promise<unknown>;
  ack?: () => Promise<void>;
}) {
  if (ack) await ack();
  console.log("[confirmation] message event received", {
    text: event.text,
    bot: event.bot,
    user: event.user,
    channel: event.channel,
  });

  // Skip bot messages to avoid self-triggering
  if (event.bot) {
    console.log("[confirmation] skipping bot message");
    return;
  }

  if (!event.user || !event.channel) {
    console.log("[confirmation] missing user or channel");
    return;
  }

  const text = (event.text ?? "").trim().toLowerCase();
  if (text !== "yes") {
    console.log(`[confirmation] text "${text}" is not "yes", ignoring`);
    return;
  }

  // Check begin confirmation
  const beginEntry = check(event.user, event.channel, "begin");
  if (beginEntry) {
    console.log("[confirmation] begin confirmed");
    const today = new Date().toISOString().split("T")[0];
    const { setToday } = await import("../store");
    setToday({
      date: today,
      suggestions: [],
      deadline: "11:00 AM",
      started: true,
    });
    await say(
      "🍱 Lunch suggestions are open! Use @LunchSlackBot suggest <place> to add a place. Deadline: 11:00 AM EST."
    );
    return;
  }

  // Check remove confirmation
  const removeEntry = check(event.user, event.channel, "remove");
  if (removeEntry) {
    console.log("[confirmation] remove confirmed");
    const place = removeEntry.payload as string;
    const removed = removeSuggestion(place);
    if (removed) {
      await say(`✅ Removed *${place}* from today's suggestions.`);
    } else {
      await say(`Sorry, *${place}* was not found in today's suggestions.`);
    }
    return;
  }

  // No pending confirmation — ignore
  console.log("[confirmation] no pending confirmation for this user/channel");
}
