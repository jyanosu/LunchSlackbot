# Phase 19 Plan: Schedule Days Command

## Tasks

| Task | Description | Depends On |
|---|---|---|
| P19-1 | Create `scheduledays` command + routing + help | — |

Single task.

---

## Task P19-1: scheduledays command

**Goal:** Allow setting schedule days via command.

**Context:**
- `store.ts` — `setSchedule({ days })` persists to `data/lunch.json`
- `cron.ts` — `restartSchedule()` rebuilds cron jobs with new days
- `commands/schedulebegin.ts` — pattern for schedule commands
- `handlers.ts` — KNOWN_COMMANDS + handler import
- `slash.ts` — slash command registration
- `help.ts` — help entries
- `slash-commands-manifest.json` — manifest

**Proposed Approach:**
- Create `commands/scheduledays.ts` — parse args, validate format (`^\*$` or `^\d{1,2}([-,\d]*)$`), call `setSchedule({ days })`, `restartSchedule()`
- Add `scheduledays` to KNOWN_COMMANDS + handler import in `handlers.ts`
- Add `/lsb-scheduledays` to `slash.ts`
- Add help entry in `help.ts`
- Add manifest entry in `slash-commands-manifest.json`
- Tests: sets days, usage hint, invalid format

**Acceptance Criteria:**
- Command sets days and restarts schedule
- Usage hint when no args
- Invalid format rejected with examples
- Help includes entry
- Slash command registered
- Manifest updated

**Spec:** full (`spec-phase19.md`)

**Verify:** `npm test -- scheduledays.test.ts`

**Out of Scope:** Day name parsing, schedule persistence changes.
