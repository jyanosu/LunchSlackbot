# Phase 4 — Voting

## What

Add voting to lunch suggestions. After suggestions begin, users vote by clicking buttons on a poll message. Each suggestion gets a single toggle button (vote/unvote). A `showpoll` command redisplays the poll.

## Context

- Phase 2: suggestions collected via `@LunchSlackBot suggest <place>`
- Phase 3: slash commands `/lsb-*` as alternative
- `begin` command starts the suggestion round and posts an announcement
- Store tracks `LunchDay` with `suggestions[]`, `deadline`, `started`
- Render filesystem is ephemeral — votes are in-memory + JSON backup
- Bolt `block_actions` handles button clicks

## Requirements

1. `vote` command starts voting and posts a poll announcement message to the channel.
2. Announcement includes: voting has begun, deadline time (default: `11:45 AM EST`), and one toggle button per suggestion.
3. Only suggestions that exist when `vote` is called are included — new suggestions after voting starts are ignored.
4. Each button toggles vote/unvote for that suggestion (single button, label changes).
5. Users can vote for multiple suggestions.
6. No prevention for voting after deadline (warning only, future phase).
7. `showpoll` command redisplays the current poll message.
8. Slash command `/lsb-showpoll` as equivalent.

## Design

### Data model

Extend `LunchDay` in `store.ts`:

```typescript
export interface LunchDay {
  date: string;
  suggestions: string[];
  deadline: string;
  started: boolean;
  votingStarted: boolean;
  pollMessageTs?: string;  // ts of the poll announcement message
}
```

Votes are stored in-memory as `Map<string, Set<string>>` keyed by `date:suggestion` with user IDs. On JSON persist, Sets are converted to arrays. On load, arrays are converted back to Sets.

```typescript
// store.ts
export interface VoteStore {
  [key: string]: Set<string>;  // "date:suggestion" → set of user IDs
}
```

User name cache: `Map<string, string>` (userId → name), persisted alongside votes.

### Poll announcement message

Posted to the channel when `vote` is called. Single message with block kit layout:

```
🗳️ *Voting is open!* Deadline: 11:45 AM EST

[header] *Taco Bell* (2)
[actions] ☐ Taco Bell  ← button
[section] — Alice, Bob

[header] *Chipotle* (1)
[actions] ✅ Chipotle  ← button
[section] — Charlie

[header] *In-N-Out* (0)
[actions] ☐ In-N-Out  ← button
[section] (no votes)
```

Block structure per suggestion: `header` (suggestion name + count) → `actions` (toggle button) → `section` (voter list). Button `text` is plain text (Slack limit: 75 chars, no mrkdwn). Vote count and voter names are in separate blocks.

Button fields:

- `action_id`: `vote_toggle` (single action_id for all buttons — handler extracts place from `value`)
- `text`: "✅ Taco Bell" (clicker voted) or "☐ Taco Bell" (clicker not voted)
- `value`: place name as plain string (e.g., `"Taco Bell"`). Place names are unique within a day (enforced by `addSuggestion` duplicate check).

**User name resolution:** Votes are stored as user IDs. On poll message build, resolve user IDs to names via `client.users.info(userId)`. Cache resolved names in memory (`Map<string, string>`) to avoid repeated API calls. If `users.info` fails, fall back to user ID.

### Vote toggle handler

`block_actions` listener for `vote_toggle` action ID (registered via `app.action('vote_toggle', ...)`):

1. Extract place name from button `value` field.
2. Toggle user's vote in the vote store.
3. Rebuild poll message with updated button labels reflecting current vote counts.
4. `client.chat.update` the poll message using `pollMessageTs`.

Buttons show aggregate vote count, not per-user state (Slack block kit buttons are shared across all viewers). Label format: `☐ Taco Bell (3)` or `✅ Taco Bell (3)` where the number is the vote count and ✅/☐ reflects the clicking user's own vote.

### Showpoll command

`@LunchSlackBot showpoll` → repost the poll message with current vote states. Updates `pollMessageTs` to the new message so subsequent vote toggles update the latest message.

### When voting begins

**Decision**: Manual (`@LunchSlackBot vote`). Keeps suggestion gathering and voting as separate phases.

- `vote` captures the current list of suggestions and freezes it for voting.
- New suggestions after voting starts are stored but not added to the poll.
- `vote` with no suggestions → error: "No suggestions yet. Use `suggest <place>` to add some."
- `vote` already started → error: "Voting has already started for today."

### File structure

```
src/
  store.ts              — add VoteStore, votingStarted, pollMessageTs
  commands/
    vote.ts             — handleVote (start voting, post poll), handleVoteToggle (block_actions)
    showpoll.ts         — handleShowpoll (repost poll)
  handlers.ts           — add vote, showpoll to routeCommand
```

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Voting trigger | Manual (`vote` command) | Separate suggestion gathering from voting |
| Vote storage | In-memory `Map` + JSON backup | Matches existing store pattern |
| Button style | Single toggle per suggestion | Clean UI, no extra clicks |
| Poll update | `chat.update` on the original message | Keeps one poll message, avoids spam |
| Vote visibility | Public — usernames listed under each suggestion | Transparency; users know who voted for what |
| Button state | ✅/☐ reflects clicking user's own vote | Slack buttons are shared across viewers; per-user labels aren't possible |
| Deadline | `11:45 AM` default (voting) vs `11:00 AM` (suggestions) | Voting deadline is separate from suggestion deadline |
| After-deadline | No prevention | Future phase |
| Suggestions after vote starts | Stored but not added to poll | Freeze poll at vote start; suggestions still accepted |

## Invariants

- Poll message buttons reflect current vote state for all viewers.
- Button label shows ✅ if the clicking user voted, ☐ if not.
- Voter usernames are listed below each suggestion and updated on each toggle.
- Vote count shown next to each suggestion name.
- `showpoll` produces an identical poll message to the original.
- Vote store persists across page views (stored in memory, not per-request).
- Suggestions list is frozen when voting starts — new suggestions don't appear in the poll.

## Error Behavior

- `vote` with no suggestions → "No suggestions yet. Use `suggest <place>` to add some."
- `vote` already started → "Voting has already started for today."
- `showpoll` with voting not started → "Voting hasn't started yet. Use `@LunchSlackBot vote` to begin."
- Vote toggle with missing fields → return early silently.
- Vote toggle for unknown place → return early silently (stale button click).

## Testing Strategy

- Unit test: `handleVote` posts poll with correct buttons for each suggestion.
- Unit test: `handleVote` rejects when already started / no suggestions.
- Unit test: vote toggle flips vote state correctly.
- Unit test: `handleShowpoll` reposts poll with current state.
- Unit test: `handleShowpoll` rejects when voting not started.
- Unit test: store vote operations (add/remove vote).

## Out of Scope (Phase 4)

- Preventing voting after deadline.
- Anonymous voting (votes are public — usernames visible).
- Per-user poll view (all users see the same buttons).
- Win announcement / results.
- Auto-starting voting when suggestions hit zero (the `vote` command rejects with no suggestions, returning an error message).

---

