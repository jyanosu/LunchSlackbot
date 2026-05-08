# Phase 18: Show Voting Start Time Instead of Suggestion Deadline

## What

Replace "Deadline: 11:00 AM EST" with "Voting starts at {voteTime} EST" in suggestion announcements.

## Context

Announcements say "Deadline: 11:00 AM EST" but suggestions are actually allowed until voting ends. Showing when voting starts is more useful — it tells users when they can start voting.

## Requirements

- Announcement text: "🍱 Lunch suggestions are open! Use @LunchSlackBot suggest <place> to add a place. Voting starts at {voteTime} EST."
- `list.ts`: show "Voting starts at {voteTime} EST" instead of deadline
- Keep `deadline` field on `LunchDay` (still used internally)
- Keep `suggestiondeadline` command (still sets the internal deadline)
- `voteTime` comes from schedule config

## Design

### Messages

- `remove.ts` announcement: use `getSchedule().voteTime` formatted as 12h
- `cron.ts` begin: same
- `list.ts`: show voting start time
- `cron.ts` console.log: update to say "voting starts at" instead of "deadline"

### Getting voteTime

- Use `getSchedule()` from `cron.ts` to read `schedule.voteTime`
- Format with `formatTime12()` from `time-util.ts`

## Decisions

| Decision | Rationale |
|---|---|
| Keep deadline field | Used internally, removing is separate change |
| Show voteTime | More actionable than suggestion deadline |
| Format as 12h | Consistent with existing messages |

## Invariants

- Suggestions still gated by `started` and `pollEnded` (unchanged)
- Schedule times unchanged
- `suggestiondeadline` command unchanged

## Error Behavior

- No schedule set → show default "10:30 AM" (from schedule defaults)

## Testing Strategy

- Announcement shows "Voting starts at {voteTime} EST"
- List command shows voting start time
- Default voteTime used when schedule not configured

## Out of Scope

- Removing deadline field entirely
- Removing suggestiondeadline command

## Cleanup

- Remove unused `const deadline` variable from `vote.ts` line 146
- Remove unused `DEFAULT_DEADLINE` constant from `vote.ts`
