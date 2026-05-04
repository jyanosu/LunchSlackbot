# Phase 10 — Automated Scheduling

## What

Add cron-based automation so lunch phases trigger automatically at configured times. Each scheduled step is idempotent — if already started manually, it skips silently. Commands let admins override the times and pause/resume the schedule.

## Context

- Bot runs on Render, process stays up between deploys.
- Existing commands: `begin` (suggestion phase), `vote` (voting phase), `endpoll` (winner).
- No cron library installed yet — need `node-cron`.
- Scheduled events need a target channel to post to (no user interaction).
- Render server timezone is UTC; times are specified in EST. Cron must run in `America/New_York`.
- `begin` requires button confirmation for user-triggered calls — cron bypasses confirmation.

## Requirements

1. **Automatic `begin`** — Starts suggestion phase at configured time. Default: `9:30 AM EST`. Posts announcement to configured channel. Bypasses button confirmation.
2. **Automatic `vote`** — Starts voting phase at configured time. Default: `10:30 AM EST`. Posts poll to configured channel. Skips silently if no suggestions exist yet.
3. **Automatic `endpoll`** — Ends voting and announces winner at configured time. Default: `11:15 AM EST`. Posts results to configured channel.
4. **Days configuration** — Which days the schedule runs. Default: every day (`*`).
5. **Idempotent** — If a phase has already started (manually or scheduled), the cron job skips without error or duplicate message.
6. **Commands to override times**:
   - `schedulebegin <time>` — set automatic begin time (e.g., `9:00 AM`)
   - `schedulevote <time>` — set automatic vote time
   - `scheduleend <time>` — set automatic end time
   - `schedule` — show current schedule
   - `schedule enable` — enable the schedule (default state)
   - `schedule disable` — disable the schedule (cron jobs stop firing)
7. **Slash commands**: `/lsb-schedulebegin`, `/lsb-schedulevote`, `/lsb-scheduleend`, `/lsb-schedule`
8. **Persistence** — Schedule config survives restart (saved to `data/lunch.json`).

## Design

### Cron library

`node-cron` — lightweight, standard for Node.js scheduling. Cron expression format: `minute hour * * day-of-week`. Timezone set to `America/New_York` via `node-cron` options.

### Schedule config

```typescript
interface LunchSchedule {
  beginTime: string;    // "HH:MM" 24h, default "09:30"
  voteTime: string;     // "HH:MM" 24h, default "10:30"
  endTime: string;      // "HH:MM" 24h, default "11:15"
  days: string;         // cron day-of-week, default "*" (every day)
  enabled: boolean;     // default true
}
```

Stored in `LunchStore.schedule`, persisted via `saveStore()`, loaded via `loadStore()`.

### Cron expressions

Built from config: `${minute} ${hour} * * ${days}`, timezone: `America/New_York`.

Example: `30 9 * * *` → every day at 9:30 AM EST.
Example: `30 9 * * 2,3` → Tue + Wed at 9:30 AM.

### Channel targeting

`LUNCH_CHANNEL_ID` env var — Slack channel ID where scheduled messages are posted. Required for scheduling to work. If missing, `initSchedule()` logs a warning and cron jobs are not registered.

### Shared store functions

Core logic is extracted from `begin`, `vote`, `endpoll` handlers into store functions. Both manual handlers and cron jobs call the same functions — handlers wrap them with UI (confirmation buttons, channel posting), cron wraps them with scheduled execution.

| Store function | Responsibility | Called by |
|---|---|---|
| `startToday()` | Creates today's LunchDay (deadline: `11:00 AM EST`, `started: true`), returns `LunchDay` or `undefined` if already started. Calls `setToday()` internally. | `begin` handler, cron |
| `startVoting()` | Marks `votingStarted=true`, returns `LunchDay` or `undefined` if already started/no suggestions | `vote` handler, cron |
| `endPoll()` | Computes winner, saves history, marks `pollEnded=true`, returns `PollResult` or `undefined` if already ended | `endpoll` handler, cron |

Return types:

```typescript
interface PollResult {
  winner: { place: string; votes: number };
  results: Array<{ place: string; votes: number; rank: number }>;
  isTie: boolean;
  totalVotes: number;
}
```

Manual handlers check the return value and post the appropriate Slack message. Cron checks the return value and posts via `client.chat.postMessage`. No logic duplication.

### `startVoting` with no suggestions

Returns `undefined` and logs a warning. Both manual handler and cron skip silently — no message posted.

### Client access

`initSchedule(app)` receives the Bolt `App` instance, giving cron jobs access to `app.client` for `chat.postMessage` calls.

### File structure

```
src/
  cron.ts              — cron setup, schedule config, cron job handlers
  cron.test.ts         — unit tests
  commands/
    schedulebegin.ts   — set begin time
    schedulevote.ts    — set vote time
    scheduleend.ts     — set end time
    showschedule.ts    — show current schedule (command name: "schedule")
  bot.ts               — call initSchedule(app) after loadStore/loadWinners
```

### Idempotency

Each scheduled handler checks the same guards as the manual command:

| Cron | Guard | Skip if |
|---|---|---|
| begin | `today?.started` | Round already started today |
| vote | `today?.votingStarted` | Voting already started |
| endpoll | `today?.pollEnded` | Poll already ended |
| vote (extra) | `suggestions.length === 0` | No suggestions yet (skip silently) |

### Commands

**`@LunchSlackBot schedulebegin <time>`**
- Accepts `HH:MM AM/PM` or `HH:MM`. Invalid → usage hint.
- Updates config, restarts cron jobs, confirms: `Begin time set to 9:00 AM EST.`

**`@LunchSlackBot schedulevote <time>`**
- Same pattern. Confirms: `Vote time set to 10:00 AM EST.`

**`@LunchSlackBot scheduleend <time>`**
- Same pattern. Confirms: `End time set to 11:00 AM EST.`

**`@LunchSlackBot schedule`**
- Shows current schedule:
  ```
  📅 *Lunch Schedule:* (enabled)
  Days: every day
  Begin: 9:30 AM EST
  Vote: 10:30 AM EST
  End: 11:15 AM EST
  ```

**`@LunchSlackBot schedule enable`**
- Enables schedule, restarts cron jobs. Confirms: `Schedule enabled.`

**`@LunchSlackBot schedule disable`**
- Disables schedule, stops cron jobs. Confirms: `Schedule disabled.`

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Cron library | `node-cron` | Lightweight, standard, simple API |
| Cron timezone | `America/New_York` | Render runs UTC; times specified in EST |
| Channel target | `LUNCH_CHANNEL_ID` env var | Reliable, no runtime discovery needed |
| Shared store functions | `startToday()`, `startVoting()`, `endPoll()` | Manual handlers + cron both call same functions; handlers add UI layer |
| `vote` with no suggestions | Skip silently | No point starting vote with nothing to vote on |
| Idempotency | Guard checks (same as manual) | No duplicate messages, safe to overlap |
| Schedule persistence | `data/lunch.json` | Consistent with existing store pattern |
| Timezone | EST (fixed) | Matches existing defaults |
| Days config | Cron day-of-week string | Flexible: `*`, `2,3`, `1-5`, etc. |
| Default days | Every day (`*`) | Easier to test; user can change via env |
| Pause/resume | `schedule enable/disable` commands | No redeploy needed |
| Restart cron on change | Stop + recreate jobs | Clean, no stale jobs |

## Invariants

- Cron jobs never crash the bot — wrapped in try/catch.
- Scheduled events use dedicated store functions, not command handlers.
- If `LUNCH_CHANNEL_ID` is missing, `initSchedule()` skips registration with a log warning.
- Schedule config defaults are always available (never null/undefined).
- `startVoting` returns `undefined` when no suggestions exist (no error message posted).

## Error Behavior

- `schedulebegin` with invalid time → `Usage: @LunchSlackBot schedulebegin <time> (e.g., 9:00 AM)`
- `schedule` when not configured → shows defaults
- `schedule enable` when already enabled → `Schedule is already enabled.`
- `schedule disable` when already disabled → `Schedule is already disabled.`
- Cron job throws → log error, do not crash
- Missing `LUNCH_CHANNEL_ID` → log warning on startup, skip scheduled events
- `startVoting` with no suggestions → returns `undefined`, log warning, skip silently (no message posted)

## Testing Strategy

- Unit test: cron expressions built correctly from config
- Unit test: cron timezone is `America/New_York`
- Unit test: `startToday()` creates LunchDay with correct defaults
- Unit test: `startToday()` returns undefined when already started
- Unit test: `startVoting()` returns undefined when already started
- Unit test: `startVoting()` returns undefined when no suggestions
- Unit test: `endPoll()` returns PollResult with correct shape
- Unit test: `endPoll()` returns undefined when already ended
- Unit test: `begin` handler confirmation flow still works (regression)
- Unit test: `vote` handler still posts poll message (regression)
- Unit test: `endpoll` handler still posts announcement (regression)
- Unit test: schedule commands parse valid times
- Unit test: schedule commands reject invalid times
- Unit test: `schedule` shows current config with enabled/disabled state
- Unit test: `schedule enable`/`schedule disable` toggle and guard
- Unit test: `stopSchedule()` stops all cron jobs
- Unit test: `initSchedule` skips when `LUNCH_CHANNEL_ID` missing

## Out of Scope

- Day-of-week configuration via command (set via env or code default only).
- DST handling — `America/New_York` handles DST automatically via IANA timezone.
- Multi-channel scheduling — single channel only.
- Per-day schedule overrides — single schedule applies to all active days.
