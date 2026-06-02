import { getToday, getVotes, toggleVote, setVotingStarted, setPollMessageTs, setUserName, getUserNames, getSchedule, getExpandedSuggestions } from "../store";

export interface VoteCommandContext {
  say: (text: string) => Promise<unknown>;
  args?: string;
  userId?: string;
  channelId?: string;
  client?: any;
}

/**
 * Build the poll message blocks for all suggestions.
 */
export async function buildPollBlocks(
  suggestions: string[],
  clickingUserId?: string,
  client?: any,
  expandedSuggestions?: Set<string>
): Promise<Array<Record<string, unknown>>> {
  const sorted = [...suggestions].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "accent" }));
  const blocks: Array<Record<string, unknown>> = [];
  const allVoterIds = new Set<string>();

  // Collect all voter IDs across all suggestions
  for (const place of sorted) {
    const votes = getVotes(place);
    for (const uid of votes) {
      allVoterIds.add(uid);
    }
  }

  // Load cached user names
  const userNames = getUserNames();

  // Resolve any missing user IDs
  for (const uid of allVoterIds) {
    if (!userNames.has(uid)) {
      try {
        const resp = await client?.users.info({ user: uid });
        if (resp?.ok && resp?.user?.real_name) {
          userNames.set(uid, resp.user.real_name);
          setUserName(uid, resp.user.real_name);
        } else {
          userNames.set(uid, uid);
        }
      } catch {
        userNames.set(uid, uid);
      }
    }
  }

  for (const place of sorted) {
    const votes = getVotes(place);
    const voteCount = votes.size;
    const voterNames = Array.from(votes)
      .map((uid) => userNames.get(uid) ?? uid)
      .join(", ");

    // Actions block: toggle button + optional ? button
    const elements: Record<string, unknown>[] = [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: `${place} (${voteCount})`,
        },
        value: place,
        action_id: "vote_toggle",
      },
    ];

    // Add ? button if there are votes
    if (voteCount > 0) {
      elements.push({
        type: "button",
        text: { type: "plain_text", text: "?" },
        value: place,
        action_id: "expand_voters",
      });
    }

    blocks.push({ type: "actions", elements });

    // Show voter list if expanded
    if (expandedSuggestions?.has(place) && voteCount > 0) {
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: `— ${voterNames}` },
      });
    }
  }

  return blocks;
}

export default async function handleVote({
  say,
  userId,
  channelId,
  client,
}: VoteCommandContext) {
  const today = getToday();

  if (!today?.started) {
    await say("Lunch suggestions haven't started yet. Use @LunchSlackBot begin to start.");
    return;
  }

  if (today.votingStarted) {
    await say("Voting has already started for today.");
    return;
  }

  if (today.suggestions.length === 0) {
    await say("No suggestions yet. Use @LunchSlackBot suggest <place> to add some.");
    return;
  }

  if (!channelId) {
    await say("Sorry, I couldn't determine your channel. Try again.");
    return;
  }

  // Start voting via shared store function
  const { startVoting } = await import("../store");
  const votingDay = startVoting();

  if (!votingDay) {
    await say("Could not start voting. Suggestions may be empty or voting may have already started.");
    return;
  }

  // Post channel announcement
  const schedule = getSchedule();
  const endTime = schedule.endTime ? `${schedule.endTime} EST` : "not set";

  if (votingDay.autoPicked) {
    await say(`⚠️ No suggestions received — auto-picked ${votingDay.suggestions.length} places from master list.`);
  }

  await say(`🗳️ Voting is open! Check the poll below and vote using the buttons. Voting closes at ${endTime}.`);

  // Build poll message
  const blocks = await buildPollBlocks(votingDay.suggestions, client, undefined, getExpandedSuggestions());

  const message = await (say as any)({
    text: `🗳️ *Voting is open!* Closes at ${endTime}`,
    blocks,
  });

  // Save the message ts and channel for updates
  if (message?.ts) {
    setPollMessageTs(message.ts);
    const { setPollChannelId } = await import("../store");
    setPollChannelId(channelId);
  }
}

/**
 * Handle vote_toggle block action: toggle vote and update poll message.
 */
export async function handleVoteToggle({
  ack,
  body,
  client,
}: {
  ack: () => Promise<void>;
  body: {
    user?: { id?: string };
    channel?: { id?: string };
    message?: { ts?: string; channel?: string };
    actions?: Array<{
      action_id: string;
      value?: string;
    }>;
  };
  client: any;
}) {
  await ack();

  const userId = body.user?.id;
  const channelId = body.channel?.id;
  const messageTs = body.message?.ts;
  const place = body.actions?.[0]?.value;

  console.log("[vote_toggle] received", {
    userId,
    channelId,
    place,
  });

  if (!userId || !channelId || !messageTs || !place) {
    console.log("[vote_toggle] missing required fields");
    return;
  }

  const today = getToday();
  if (!today?.votingStarted || !today.suggestions.includes(place)) {
    console.log("[vote_toggle] voting not started or unknown place");
    return;
  }

  if (today.pollEnded) {
    console.log("[vote_toggle] poll has ended, voting frozen");
    return;
  }

  // Toggle vote
  toggleVote(place, userId);

  // Resolve user name
  const cachedNames = getUserNames();
  if (!cachedNames.has(userId)) {
    try {
      const resp = await client?.users.info({ user: userId });
      if (resp?.ok && resp?.user?.real_name) {
        setUserName(userId, resp.user.real_name);
      } else {
        setUserName(userId, userId);
      }
    } catch {
      setUserName(userId, userId);
    }
  }

  // Rebuild poll message
  const schedule2 = getSchedule();
  const endTime2 = schedule2.endTime ? `${schedule2.endTime} EST` : "not set";
  const blocks = await buildPollBlocks(today.suggestions, userId, client, getExpandedSuggestions());

  await client.chat.update({
    channel: channelId,
    ts: messageTs,
    text: `🗳️ *Voting is open!* Closes at ${endTime2}`,
    blocks,
  });
}

/**
 * Rebuild poll blocks from current suggestions and update the saved poll message.
 * No-op when voting is not active, pollMessageTs is missing, channelId is missing, or client is unavailable.
 * Falls back to posting a fresh poll if the saved message cannot be updated.
 */
export async function updatePollMessage(): Promise<void> {
  const today = getToday();
  if (!today?.votingStarted || today.pollEnded) {
    return;
  }

  const pollMessageTs = today.pollMessageTs;
  if (!pollMessageTs) {
    console.log("[updatePollMessage] no pollMessageTs set, skipping");
    return;
  }

  const channelId = today.pollChannelId;
  if (!channelId) {
    console.warn("[updatePollMessage] pollChannelId not set, skipping");
    return;
  }

  const { getClient } = await import("../app-context");
  const client = getClient();
  if (!client) {
    console.warn("[updatePollMessage] no client available, skipping");
    return;
  }

  const schedule = getSchedule();
  const endTime = schedule.endTime ? `${schedule.endTime} EST` : "not set";

  let blocks: Array<Record<string, unknown>>;

  if (today.suggestions.length === 0) {
    blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "No suggestions. Use @LunchSlackBot suggest <place> to add one.",
        },
      },
    ];
  } else {
    blocks = await buildPollBlocks(
      today.suggestions,
      undefined,
      client,
      getExpandedSuggestions()
    );
  }

  try {
    await client.chat.update({
      channel: channelId,
      ts: pollMessageTs,
      text: `🗳️ *Voting is open!* Closes at ${endTime}`,
      blocks,
    });
    console.log("[updatePollMessage] poll updated");
  } catch {
    console.log("[updatePollMessage] update failed, posting fresh poll");
    try {
      const message = await client.chat.postMessage({
        channel: channelId,
        text: `🗳️ *Voting is open!* Closes at ${endTime}`,
        blocks,
      });
      if (message?.ts) {
        setPollMessageTs(message.ts);
      }
    } catch (err) {
      console.error("[updatePollMessage] fresh post also failed:", err);
    }
  }
}
