# Phase 18 Plan: Show Voting Start Time Instead of Suggestion Deadline

## Tasks

| Task | Description | Depends On |
|---|---|---|
| P18-1 | Replace deadline references with voting start time in messages | — |

Single task — message text changes across 3 files.

---

## Task P18-1: Replace "Deadline" with "Voting starts at" in messages

**Goal:** Show when voting starts instead of suggestion deadline in announcements.

**Context:**
- `remove.ts` line 111, 189: announcement with `day.deadline`
- `cron.ts` line 54: begin announcement with `day.deadline`
- `cron.ts` line 59: console.log with `deadline`
- `list.ts` line 23, 29: list output with `today.deadline`
- `vote.ts` line 146: unused `deadline` variable + `DEFAULT_DEADLINE` constant
- `cron.ts` exports `getSchedule()` → `{ beginTime, voteTime, endTime }`
- `time-util.ts` exports `formatTime12("HH:MM")` → "10:30 AM"

**Proposed Approach:**
- Import `getSchedule` from `cron.ts` in `remove.ts`, `cron.ts`, `list.ts`
- Import `formatTime12` from `time-util.ts`
- Replace `day.deadline` / `today.deadline` with `formatTime12(getSchedule().voteTime)`
- Update text: "Voting starts at {voteTime} EST"
- Update `cron.ts` console.log to say "voting starts at" instead of "deadline"
- Remove unused `deadline` variable and `DEFAULT_DEADLINE` from `vote.ts`
- Tests: update existing test assertions

**Acceptance Criteria:**
- Announcement shows "Voting starts at {voteTime} EST"
- List command shows voting start time
- Console log says "voting starts at" instead of "deadline"
- Default voteTime "10:30 AM" used when schedule not configured
- `suggestiondeadline` command unchanged
- No unused `deadline` variable in `vote.ts`

**Spec:** full (`spec-phase18.md`)

**Verify:** `npm test`

**Out of Scope:** Removing deadline field, removing suggestiondeadline command.
