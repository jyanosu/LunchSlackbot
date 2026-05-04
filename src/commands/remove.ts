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
  await (say as any)({
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Remove *${place}* from today's suggestions?`,
        },
        accessory: {
          type: "button",
          text: { type: "plain_text", text: "Yes", emoji: false },
          action_id: "confirm_remove",
          style: "danger",
        },
      },
    ],
  });
}

/**
 * Shared confirmation listener for both `begin` and `remove` commands.
 */
export async function handleConfirmation({
  event,
  client,
  ack,
}: {
  event: { type: string; user?: string; channel?: string; text?: string; bot_id?: string };
  client: any;
  ack: () => Promise<void>;
}) {
  await ack();

  console.log("[confirmation] message event received", {
    text: event.text,
    bot_id: event.bot_id,
    user: event.user,
    channel: event.channel,
  });

  // Skip bot messages
  if (event.bot_id) {
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
    await client.chat.postMessage({
      channel: event.channel,
      text: "🍱 Lunch suggestions are open! Use @LunchSlackBot suggest <place> to add a place. Deadline: 11:00 AM EST.",
    });
    return;
  }

  // Check remove confirmation
  const removeEntry = check(event.user, event.channel, "remove");
  if (removeEntry) {
    console.log("[confirmation] remove confirmed");
    const place = removeEntry.payload as string;
    const removed = removeSuggestion(place);
    if (removed) {
      await client.chat.postMessage({
        channel: event.channel,
        text: `✅ Removed *${place}* from today's suggestions.`,
      });
    } else {
      await client.chat.postMessage({
        channel: event.channel,
        text: `Sorry, *${place}* was not found in today's suggestions.`,
      });
    }
    return;
  }

  console.log("[confirmation] no pending confirmation for this user/channel");
}

/**
 * Button-based confirmation handler (block_actions).
 * More reliable than message events.
 */
export async function handleBlockAction({
  ack,
  body,
  client,
}: {
  ack: () => Promise<void>;
  body: {
    user?: { id?: string };
    channel?: { id?: string };
    actions?: Array<{
      action_id: string;
      message?: { ts?: string };
    }>;
  };
  client: any;
}) {
  await ack();

  const userId = body.user?.id;
  const channelId = body.channel?.id;
  const actionId = body.actions?.[0]?.action_id;
  const messageTs = body.actions?.[0]?.message?.ts;

  console.log("[block_action] received", {
    actionId,
    userId,
    channelId,
  });

  if (!userId || !channelId || !actionId) {
    console.log("[block_action] missing required fields");
    return;
  }

  // Handle begin confirmation
  if (actionId === "confirm_begin") {
    const beginEntry = check(userId, channelId, "begin");
    if (beginEntry) {
      console.log("[block_action] begin confirmed");
      const today = new Date().toISOString().split("T")[0];
      const { setToday } = await import("../store");
      setToday({
        date: today,
        suggestions: [],
        deadline: "11:00 AM",
        started: true,
      });
      await client.chat.update({
        channel: channelId,
        ts: messageTs,
        text: "🍱 Lunch suggestions are open! Use @LunchSlackBot suggest <place> to add a place. Deadline: 11:00 AM EST.",
      });
      return;
    }
  }

  // Handle remove confirmation
  if (actionId === "confirm_remove") {
    const removeEntry = check(userId, channelId, "remove");
    if (removeEntry) {
      console.log("[block_action] remove confirmed");
      const place = removeEntry.payload as string;
      const removed = removeSuggestion(place);
      if (removed) {
        await client.chat.update({
          channel: channelId,
          ts: messageTs,
          text: `✅ Removed *${place}* from today's suggestions.`,
        });
      } else {
        await client.chat.update({
          channel: channelId,
          ts: messageTs,
          text: `Sorry, *${place}* was not found in today's suggestions.`,
        });
      }
      return;
    }
  }

  console.log("[block_action] no pending confirmation for this user/channel");
}
