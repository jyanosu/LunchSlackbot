# Phase 8 Plan — Channel Announcements

Shared decisions (from spec): Announce to channel when suggestion phase begins and when voting begins. Plain mrkdwn text. Best-effort (phase still starts if announcement fails).

## Task P8-1: Add channel announcements for begin and vote

**Goal:** Post channel announcements when suggestion phase begins and when voting begins.

**Context:**
- `commands/begin.ts` sends confirmation button
- `commands/remove.ts` `handleBlockAction` handles `confirm_begin` → calls `setToday()`
- `commands/vote.ts` `handleVote` marks voting started, posts poll message
- `client.chat.postMessage()` sends messages to a channel
- `channelId` available from confirmation context and vote command context

**Proposed Approach:**
- In `commands/remove.ts` `handleBlockAction` for `confirm_begin`:
  - After `setToday()` and after updating the confirmation message, post announcement via `client.chat.postMessage(channelId, text)`
  - Message order: update confirmation → post announcement
  - `client` is already available in the handler signature
  - Text: `🍱 Lunch suggestions are open! Use @LunchSlackBot suggest <place> to add a place. Deadline: <deadline> EST.`
  - Deadline from `getToday().deadline` or default `11:00 AM`
  - Best-effort: wrap in try/catch, silently ignore failures
- In `commands/vote.ts` `handleVote`:
  - Before posting poll message, post announcement via `say()`
  - Text: `🗳️ Voting is open! Check the poll below and vote using the buttons.`
  - Deadline is in the poll message itself (not duplicated in announcement)
  - Slash command `/lsb-vote` routes through same handler, announcement posted for both

**Acceptance Criteria:**
- `begin` confirmation posts announcement after confirmation update, with deadline and usage hint
- `vote` command posts announcement before poll message (no deadline duplication)
- Suggestion announcement includes deadline
- Missing channelId skips announcement gracefully
- Announcement failure doesn't block phase start
- Double invocation doesn't post duplicate announcements (existing flags protect)

**Spec:** `none` (defined in spec.md Phase 8)

**Verify:** `npm run build && npm test`

**Out of Scope:**
- Announcing individual suggestions
- Announcing voting results
- Customizable announcement text
- DM announcements

## Dependency Graph

```
P8-1 (channel announcements)
```

Single task — self-contained.

---

