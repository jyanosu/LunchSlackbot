# Phase 20 Plan: Split Days and Votes into Separate Files

## Tasks

| Task | Description | Depends On |
|---|---|---|
| P20-1 | Split store into three files with migration + pruning | — |
| P20-2 | Add `prune` command to configure retention period | P20-1 |

Single task — all changes are in `store.ts` + tests.

---

## Shared Decisions

- `data/days.json` — `days` only
- `data/votes.json` — `votes` + `userNames`
- `data/lunch.json` — `masterList` + `schedule` only
- Migration: on `loadStore()`, extract `days`/`votes` from old `lunch.json` to new files
- All store function signatures unchanged

---

## Task P20-1: Split store into three files with migration

**Goal:** Move days and votes to separate JSON files.

**Context:**
- `store.ts` — `LUNCH_FILE`, `loadStore()`, `saveStore()`, all store functions
- `LUNCH_FILE` = `data/lunch.json` — currently holds everything
- `resetStore()` — clears days, votes, userNames; preserves masterList
- Tests: `store.test.ts` — 70+ tests, all use `loadStore()`/`saveStore()`

**Proposed Approach:**
- Add `DAYS_FILE`, `VOTES_FILE` constants
- Add `loadDays()`, `saveDays()`, `loadVotes()`, `saveVotes()` internal helpers
- Add `pruneOldDays()`, `pruneOldVotes()` — filter entries older than `pruneDays` from schedule, log count
- Update `loadStore()` — load from all three files, migrate old data if present, then prune
- Update `saveStore()` — write to correct files
- Update `resetStore()` — write empty objects to days/votes files
- Tests: split files, migration from old format, empty defaults, reset behavior, pruning

**Acceptance Criteria:**
- `data/days.json` contains only `days`
- `data/votes.json` contains `votes` + `userNames`
- `data/lunch.json` contains only `masterList` + `schedule`
- Old `lunch.json` with days/votes migrated automatically
- Days older than 120 days pruned on load
- Votes older than 120 days pruned on load
- All existing store functions work unchanged
- All existing tests pass

**Spec:** full (`spec-phase20.md`)

**Verify:** `npm test -- store.test.ts`

**Out of Scope:** Database migration.

---

## Task P20-2: prune command

**Goal:** Allow configuring the prune retention period.

**Context:**
- `store.ts` — `getSchedule()`, `setSchedule()`, `LunchSchedule.pruneDays`
- `commands/schedulebegin.ts` — pattern for schedule commands
- `handlers.ts` — KNOWN_COMMANDS + handler import
- `slash.ts` — slash command registration
- `help.ts` — help entries

**Proposed Approach:**
- Create `commands/prune.ts` — with args: validate (min 7), set `pruneDays`, persist; without args: show current setting
- Add `prune` to KNOWN_COMMANDS + handler import in `handlers.ts`
- Add `/lsb-prune` to `slash.ts`
- Add help entry in `help.ts`
- Add manifest entry in `slash-commands-manifest.json`
- Tests: sets pruneDays, shows current, rejects below 7, rejects non-numeric

**Acceptance Criteria:**
- Command sets pruneDays and persists
- Shows current setting when no args
- Invalid input rejected with usage hint
- Help includes entry
- Slash command registered

**Spec:** full (`spec-phase20.md`)

**Verify:** `npm test -- prune.test.ts`

**Out of Scope:** Database migration.
