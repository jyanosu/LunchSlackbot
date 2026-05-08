# Phase 11 — Deadline Reminders

## What

Post reminder messages to the channel 5 minutes before the suggestion deadline and 5 minutes before voting ends, so team members know time is running out. Sort suggestion and voting lists alphabetically for consistent display.

## Context

- `LunchDay.deadline` stores the suggestion deadline (default: "11:00 AM EST").
- Voting ends at `schedule.endTime` (default: "11:15 AM EST").
- Cron jobs already run in `America/New_York` timezone.
- Channel target: `LUNCH_CHANNEL_ID` (same as scheduled events).
- Manual `begin` command sets deadline via `suggestiondeadline <time>`.

## Requirements

1. **Suggestion reminder** — Post 5 minutes before suggestion deadline: "⏰ *Reminder:* Lunch suggestions close in 5 minutes! Use @LunchSlackBot suggest <place> to add one."
2. **Voting reminder** — Post 5 minutes before voting ends: "⏰ *Reminder:* Voting closes in 5 minutes! Vote now using the poll buttons below."
3. **Idempotent** — Each reminder fires at most once per round. If the phase has already ended, skip silently.
4. **Hybrid scheduling** — Voting reminder is cron-based (fixed time). Suggestion reminder is setTimeout-based (deadline varies per round).
5. **Alphabetical order** — Suggestions, poll buttons, and list output are sorted alphabetically (case-insensitive).

## Design

### Reminder cron jobs

Two additional cron jobs in `cron.ts`:

| Job | Fires at | Message |
|---|---|---|
| `suggestReminder` | `deadline - 5min` | ⏰ Suggestions close in 5 min |
| `voteReminder` | `endTime - 5min` | ⏰ Voting closes in 5 min |

Cron expressions built from config:
- Suggestion: derived from `LunchDay.deadline` (parsed to HH:MM)
- Voting: derived from `schedule.endTime - 5min`

### Registration

`initSchedule()` registers all 5 jobs: begin, vote, end, suggestReminder, voteReminder.

Reminder jobs check guards before posting:
- Suggestion reminder: skip if `!today?.started` or `today.votingStarted` or `today.pollEnded`
- Voting reminder: skip if `!today?.votingStarted` or `today.pollEnded`

### Hybrid approach

- **Voting reminder:** Cron-based. `endTime` is fixed in schedule config, so cron fires at `endTime - 5min`.
- **Suggestion reminder:** `setTimeout`-based. Deadline is set per-round (can vary), so when `startToday()` is called, a setTimeout is computed from the deadline wall-clock time. Does not survive restart.

### Deadline parsing

`parseTime()` from `time-util.ts` converts deadline strings ("11:00 AM EST", "11:00 AM", "23:00") → `"HH:MM"` 24h. Reminder cron expression is built from this: 5 min before.

No change to `LunchDay.deadline` storage format — keeps existing display code working.

### Alphabetical sorting

`getToday().suggestions` is stored in insertion order. Display functions (`list`, `buildPollBlocks`, `showmasterlist`) sort alphabetically (case-insensitive) before rendering. Storage order unchanged.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Reminder timing | 5 min before deadline | Explicit user request |
| Channel | `LUNCH_CHANNEL_ID` | Consistent with scheduled events |
| Manual rounds | setTimeout for suggestion, cron for voting | Deadline varies per round; endTime is fixed |
| One-time fire | Cron with day-of-week guard | Fires once per day, idempotent check |
| Missed deadline | No catch-up | If bot was down, reminder is moot |

## Invariants

- Reminders never post after the phase has ended.
- Each reminder fires at most once per round.
- Reminders are best-effort — phase still ends on schedule if reminder fails.

## Error Behavior

- Deadline parsing fails → log warning, skip reminder
- Channel post fails → log error, do not crash
- `LUNCH_CHANNEL_ID` missing → skip reminders (same as other cron jobs)

## Testing Strategy

- Unit: deadline parsing converts "11:00 AM EST" → correct cron expression
- Unit: suggestion reminder skips when voting already started
- Unit: voting reminder skips when poll already ended
- Unit: reminder posts correct message text

## Out of Scope

- Configurable reminder timing (fixed at 5 min)
- Multiple reminders (e.g., 10 min + 5 min)
- Threaded reminders
- Suggestion reminder surviving restart (setTimeout-based)
- Reminder for rounds without `LUNCH_CHANNEL_ID` set
