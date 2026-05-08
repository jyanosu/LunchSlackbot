# Phase 19: Schedule Days Command

## What

Add `scheduledays` command to set which days the schedule runs.

## Context

Schedule is persisted in `data/lunch.json` and loads on startup. `LunchSchedule.days` accepts cron day-of-week values (default `*` = every day). No command exists to change it.

## Requirements

- Command: `@LunchSlackBot scheduledays <days>` (e.g., `2-3` for Tue-Wed)
- Slash command: `/lsb-scheduledays`
- Help entry: `scheduledays <days> (/lsb-scheduledays) - set which days the schedule runs (e.g., 2-3 for Tue-Wed)`
- `showschedule` already displays days (unchanged)
- Schedule persists automatically via existing `setSchedule()`

## Design

### Command

- Parse args as cron day-of-week string
- Validate: must match `^\*$` or `^\d{1,2}([-,,\d]*)$` (e.g., `*`, `2`, `2-3`, `1,3,5`)
- Call `setSchedule({ days })`, `restartSchedule()`
- Response: `Days set to {days} (e.g., Tue-Wed).`

### Cron day mapping

| Value | Meaning |
|---|---|
| `*` | Every day |
| `0` or `7` | Sunday |
| `1` | Monday |
| `2-3` | Tuesday-Wednesday |
| `1,3,5` | Mon, Wed, Fri |
| `1-5` | Monday-Friday |
| `1-6` | Monday-Saturday |

### Files

- `commands/scheduledays.ts` — handler
- `handlers.ts` — add to KNOWN_COMMANDS + handler import
- `slash.ts` — add `/lsb-scheduledays`
- `help.ts` — add entry
- `slash-commands-manifest.json` — add manifest entry

## Decisions

| Decision | Rationale |
|---|---|
| Accept raw cron format | Simple, matches cron.ts usage |
| No day name parsing | Avoids ambiguity, keeps it simple |
| Validate format only | Cron will handle invalid values |

## Invariants

- Schedule persists automatically (existing `setSchedule()` saves)
- `showschedule` displays days (unchanged)
- Cron restarts with new days (via `restartSchedule()`)

## Error Behavior

- Invalid format → usage hint with examples
- No args → usage hint

## Testing Strategy

- Sets days and restarts schedule
- Shows usage when no args
- Rejects invalid format
- Help includes entry

## Out of Scope

- Day name parsing (e.g., "Mon-Fri")
- Changing schedule persistence (already works)
