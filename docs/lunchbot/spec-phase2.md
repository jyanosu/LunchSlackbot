# Phase 2 — Lunch Suggestions & Poll Management

## What

After Phase 1's bot skeleton, Phase 2 adds lunch suggestion collection, deadline management, persistent storage, and suggestion removal. The bot parses subcommands from `app_mention` text to drive a daily lunch poll workflow.

## Context

- Phase 1 bot is deployed on Render, responding to `app_mention` with a title message.
- `src/handlers.ts` contains the single `handleAppMention` function.
- No persistent storage exists yet — everything is in-memory or nonexistent.
- Slack Bolt handles event delivery; no OAuth flow changes needed.

## Requirements

1. **`@LunchSlackBot begin`** — Starts a new lunch suggestion round for the day. Prompts the user to confirm before starting. If a round is already active for today, notifies the user it's already been started.
2. **`@LunchSlackBot suggest <place>`** — Adds `<place>` to today's suggestion list. Replies confirming the addition and listing all current suggestions.
3. **`@LunchSlackBot suggestiondeadline <time>`** — Sets or overrides the suggestion deadline for the day. Defaults to `11:00 AM EST`. Accepts a time string (e.g., `10:30 AM`, `11:30`).
4. **`@LunchSlackBot remove <place>`** — Removes `<place>` from today's suggestions. Prompts the user with a confirmation reply before removing.
5. **`@LunchSlackBot list`** — Shows today's lunch suggestions as a numbered list with the deadline. If suggestions haven't started, prompts the user to run `begin`. If no suggestions exist yet, prompts the user to add one.
6. **`@LunchSlackBot help`** — Lists all available commands with brief descriptions. Reply format:
   ```
   🍱 *LunchBot Commands:*
   begin - start the lunch poll for the day
   suggest <place> - add a lunch place to today's poll
   suggestiondeadline <time> - set the suggestion deadline (default 11:00 AM EST)
   remove <place> - remove a suggestion from today's poll
   list - show today's lunch suggestions
   help - show this message
   ```
7. **Persistence** — Suggestions survive bot restarts. Saved suggestions are available the next day if needed.

## Design

### Command parsing

The `app_mention` handler extracts text after `@LunchSlackBot` and parses it case-insensitively:

| Input | Action |
|---|---|
| `@LunchSlackBot begin` | Start suggestion round |
| `@LunchSlackBot suggest Taco Bell` | Add "Taco Bell" |
| `@LunchSlackBot suggestiondeadline 10:30 AM` | Set deadline |
| `@LunchSlackBot remove Taco Bell` | Remove with confirmation prompt |
| `@LunchSlackBot list` | Show today's suggestions |
| `@LunchSlackBot help` | List all commands |
| `@LunchSlackBot` (no subcommand) | Show title (Phase 1 behavior) |

Parsing: strip the mention, trim, split on first whitespace → command + args.

### Data model

```typescript
interface LunchDay {
  date: string;           // ISO date, e.g. "2025-01-15"
  suggestions: string[];  // place names, order preserved
  deadline: string;       // ISO datetime, default "11:00 AM EST" that day
  started: boolean;       // true after /begin
}

interface LunchStore {
  days: Record<string, LunchDay>;  // keyed by ISO date
}
```

### Storage

- **In-memory store** — suggestions live in process memory during the bot's uptime.
- On startup, attempt to seed from `data/lunch.json` if it exists (best-effort, no crash if missing).
- On every mutation, write to `data/lunch.json` as a backup (best-effort).
- `data/` is added to `.gitignore`.
- **Known limitation:** Render's filesystem is ephemeral. Data resets on every deploy/restart. This is acceptable for Phase 2 testing. Persistent storage (database) is a Phase 3 concern.

### Confirmation system

Both `begin` and `remove` require user confirmation via button clicks (`block_actions`). A shared confirmation map keyed by `${userId}:${channelId}:${action}` prevents collisions between pending actions.

**Shared behavior:**
- Pending confirmation expires after 60 seconds.
- On button click, execute the pending action, clear the entry, and update the message in place.
- If no response or timeout, do nothing (no follow-up nag).

**`begin` flow:**
1. If a round is **already active for today** → reply: `Lunch suggestions are already open for today. Use @LunchSlackBot suggest <place> to add a place.`
2. If **no round is active** → send button: `Start lunch suggestions for today?` with Yes button (`action_id: confirm_begin`)
3. Store pending begin keyed by `${userId}:${channelId}:begin`.
4. On confirmation → start the round and update message: `🍱 Lunch suggestions are open! Use @LunchSlackBot suggest <place> to add a place. Deadline: 11:00 AM EST.`

**`remove` flow:**
1. Validate place exists in today's suggestions → "not found" reply if not.
2. Send button: `Remove *<place>* from today's suggestions?` with Yes button (`action_id: confirm_remove`)
3. Store pending removal keyed by `${userId}:${channelId}:remove`.
4. On confirmation → remove the place and update message.

### Deadline handling

- Default: `11:00 AM EST` on the current day.
- `suggestiondeadline` overrides for the current day only.
- Time parsing: accept `HH:MM AM/PM` or bare `HH:MM` (defaults to AM). Invalid time → reply with usage hint.
- Deadline is informational in Phase 2 — bot warns when deadline approaches but does not enforce it (no auto-poll generation).

### File structure

```
src/
  bot.ts              — entry point, Bolt app init
  handlers.ts         — app_mention command router + handlers
  store.ts            — LunchStore: read/write JSON, CRUD ops
  commands/
    begin.ts          — start suggestion round
    suggest.ts        — add suggestion
    deadline.ts       — set/override deadline
    remove.ts         — remove with confirmation
    list.ts           — list today's suggestions
    help.ts           — list commands
```

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Storage | In-memory + JSON backup | In-memory for speed; JSON written as backup; data resets on Render deploy (acceptable for Phase 2) |
| Command parsing | Text split from app_mention | Reuses existing event; no slash command setup needed |
| Confirmation | Button-based (`block_actions`) | More reliable than message events; in-place message update |
| Confirmation keying | `${userId}:${channelId}:${action}` | Prevents collisions when multiple pending actions exist |
| Timezone | EST (fixed) | Matches default; no DST logic needed |
| Duplicate suggestions | Rejected | Bot replies that the place is already suggested |

## Invariants

- Suggestions are scoped to a **single day** — `begin` resets the list for that date.
- The `data/` directory and `data/lunch.json` are never committed to git.
- Bot never crashes on missing `data/lunch.json` — creates it with empty state.
- Only one active suggestion round per day per channel (re-running `begin` on the same day resets suggestions — no undo, data is lost).

## Error Behavior

- Unknown subcommand → reply: `Unknown command. Try @LunchSlackBot help for a list of commands.`
- `suggest` with no place name → reply: `Usage: @LunchSlackBot suggest <place>`
- `suggestiondeadline` with invalid time → reply: `Usage: @LunchSlackBot suggestiondeadline <time> (e.g., 10:30 AM)`
- `remove` with non-existent place → reply: `*<place>* is not in today's suggestions.`
- File read/write error → log error, reply: `Sorry, something went wrong saving data. Try again.`

## Testing Strategy

- Unit test: command parser extracts correct command + args from mention text.
- Unit test: store CRUD — create, read, update, delete suggestions from JSON.
- Unit test: deadline parsing accepts valid formats, rejects invalid.
- Unit test: `begin` requires confirmation before starting; already-started round skips confirmation.
- Unit test: remove handler requires confirmation before deleting.
- Unit test: confirmation map keys are unique per action (begin vs. remove don't collide).
- Unit test: `list` shows numbered suggestions with deadline, prompts to begin if not started, prompts to suggest if none exist.
- Manual: full flow in Slack — begin → suggest → deadline → remove → list → verify persistence after restart.

## Out of Scope (Phase 2)

- Auto-generating a poll when deadline passes (Phase 3).
- Voting mechanism (Phase 3).
- Multi-channel support — single channel only.
- Slash commands — all commands via `app_mention`.
- Persistent storage across deploys — Render filesystem is ephemeral (Phase 3 database).

### Slack Permissions

- Phase 2 requires the `channels:history` scope (to listen to `message_events` for remove confirmations). The Slack app must be re-installed after deploying Phase 2 to grant this scope.

---

