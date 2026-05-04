import { getToday, getVotes, hasVoted, toggleVote, setVotingStarted, setPollMessageTs, setUserName, getUserNames } from "../store";

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
  const blocks: Array<Record<string, unknown>> = [];
  const allVoterIds = new Set<string>();

  // Collect all voter IDs across all suggestions
  for (const place of suggestions) {
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

  for (const place of suggestions) {
    const votes = getVotes(place);
    const voteCount = votes.size;
    const voterNames = Array.from(votes)
      .map((uid) => userNames.get(uid) ?? uid)
      .join(", ");

    // Check if clicking user voted for this place
    const userVoted = clickingUserId ? hasVoted(place, clickingUserId) : false;
    const buttonIcon = userVoted ? "✅" : "☐";

    // Header block: suggestion name + count
    blocks.push({
      type: "header",
      text: {
        type: "plain_text",
        text: `*${place}* (${voteCount})`,
      },
    });

    // Actions block: toggle button
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: `${buttonIcon} ${place}`,
          },
          value: place,
          action_id: "vote_toggle",
        },
      ],
    });

    // Section block: voter list
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: voteCount > 0 ? `— ${voterNames}` : "(no votes)",
      },
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

  // Mark voting as started
  setVotingStarted(true);

  // Build poll message
  const deadline = today.deadline || DEFAULT_DEADLINE;
  const blocks = await buildPollBlocks(today.suggestions, client);

  const message = await (say as any)({
    text: `🗳️ *Voting is open!* Deadline: ${deadline} EST`,
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
  const deadline = today.deadline || DEFAULT_DEADLINE;
  const blocks = await buildPollBlocks(today.suggestions, userId, client);

  await client.chat.update({
    channel: channelId,
    ts: messageTs,
    text: `🗳️ *Voting is open!* Deadline: ${deadline} EST`,
    blocks,
  });
}
