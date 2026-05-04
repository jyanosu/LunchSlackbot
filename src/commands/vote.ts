import { getToday, getVotes, hasVoted, toggleVote, setVotingStarted, setPollMessageTs, setUserName, getUserNames, getSchedule } from "../store";

const DEFAULT_DEADLINE = "11:45 AM";

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
  client?: any
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

    // Check if clicking user voted for this place
    const userVoted = clickingUserId ? hasVoted(place, clickingUserId) : false;
    const buttonIcon = userVoted ? "✅" : "☐";

    // Voter text for confirm dialog
    const voterText = voteCount > 0
      ? `*${voteCount} vote${voteCount > 1 ? "s" : ""}* — ${voterNames}`
      : "No votes yet. Be the first!";

    // Actions block: toggle button with name + count + confirm dialog
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: `${buttonIcon} ${place} (${voteCount})`,
          },
          value: place,
          action_id: "vote_toggle",
          confirm: {
            title: { type: "plain_text", text: `Vote for ${place}?` },
            text: { type: "mrkdwn", text: voterText },
            confirm_text: { type: "plain_text", text: "Vote" },
            deny_text: { type: "plain_text", text: "Cancel" },
          },
        },
      ],
    });
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
  await say(`🗳️ Voting is open! Check the poll below and vote using the buttons. Voting closes at ${endTime}.`);

  // Build poll message
  const deadline = votingDay.deadline || DEFAULT_DEADLINE;
  const blocks = await buildPollBlocks(votingDay.suggestions, client);

  const message = await (say as any)({
    text: `🗳️ *Voting is open!* Closes at ${endTime}`,
    blocks,
  });

  // Save the message ts for updates
  if (message?.ts) {
    setPollMessageTs(message.ts);
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
  const blocks = await buildPollBlocks(today.suggestions, userId, client);

  await client.chat.update({
    channel: channelId,
    ts: messageTs,
    text: `🗳️ *Voting is open!* Closes at ${endTime2}`,
    blocks,
  });
}
