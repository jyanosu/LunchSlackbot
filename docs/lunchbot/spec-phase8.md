# Phase 8 — Channel Announcements

## What

Announce to the entire channel when the suggestion phase begins and when voting begins, so everyone knows the bot is active.

## Context

- Phase 2: `begin` command starts suggestion round after button confirmation (private confirmation flow).
- Phase 4: `vote` command starts voting and posts poll message.
- `say()` sends messages to the originating channel (Slack Bolt context).
- `channelId` is available from the event/body.
- Announcements are plain text mrkdwn messages (no blocks needed).

## Requirements

1. **When suggestion phase begins** — After `begin` confirmation succeeds, post a channel announcement: `🍱 Lunch suggestions are open! Use @LunchSlackBot suggest <place> to add a place. Deadline: <deadline> EST.`
2. **When voting begins** — After `vote` command starts voting, post a channel announcement before the poll message: `🗳️ Voting is open! Deadline: <deadline> EST. Use the buttons below to vote.`

## Design

### Suggestion phase announcement

In `commands/remove.ts` `handleBlockAction` for `confirm_begin`:
- After `setToday()` and after updating the confirmation message, post announcement via `client.chat.postMessage(channelId, announcementText)`.
- Message order: update confirmation → post announcement.
- `client` is already available in the `handleBlockAction` handler signature.
- Announcement text: `🍱 Lunch suggestions are open! Use @LunchSlackBot suggest <place> to add a place. Deadline: <deadline> EST.`
- Deadline from `getToday().deadline` or default `11:00 AM`.
- Note: `@LunchSlackBot` in the announcement is plain text (won't mention the bot).

### Voting announcement

In `commands/vote.ts`, before posting the poll message:
- Post announcement: `🗳️ Voting is open! Check the poll below and vote using the buttons.`
- Deadline defaults to `11:45 AM` (included in poll message, not announcement).
- Then post the poll message as before.
- Slash command `/lsb-vote` routes through the same handler, so announcement is posted for both @mention and slash command invocations.

### File structure

```
src/
  commands/
    begin.ts            — unchanged (sends confirmation button)
    remove.ts           — add announcement after begin confirmation in handleBlockAction
    vote.ts             — add announcement before poll message
```

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Announcement format | Plain mrkdwn text | Simple, readable, no blocks needed |
| Suggestion announcement | After confirmation | Only announce when round actually starts |
| Voting announcement | Separate message before poll | Keeps poll message clean; announcement is visible |
| Include deadline | Yes | Reminds users of the time limit |
| Include usage hint | Yes (suggestion phase) | Helps new users know how to participate |

## Invariants

- Announcements are sent to the same channel that invoked the command.
- Announcements are only sent once per phase (not on re-invocation).
- If announcement fails (API error), the phase still starts (best-effort).

## Error Behavior

- `chat.postMessage` failure → best-effort, silently ignored (phase still starts).
- Missing `channelId` → skip announcement, phase still starts.
- `begin` already started → no announcement (existing behavior).
- `vote` already started → no announcement (existing behavior).

## Testing Strategy

- Unit test: `begin` confirmation posts announcement to channel after confirmation update.
- Unit test: `vote` command posts announcement before poll message.
- Unit test: announcement includes deadline (suggestion phase).
- Unit test: announcement includes usage hint (suggestion phase).
- Unit test: missing channelId skips announcement gracefully.
- Unit test: double invocation of `begin` doesn't post duplicate announcement (existing `started` flag protects).
- Unit test: double invocation of `vote` doesn't post duplicate announcement (existing `votingStarted` flag protects).

## Out of Scope (Phase 8)

- Announcing individual suggestions as they are added.
- Announcing voting results.
- Customizable announcement text.
- DM announcements.

---

