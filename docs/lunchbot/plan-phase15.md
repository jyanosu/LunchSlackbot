# Phase 15 Plan: Auto-Pick Suggestions When Voting Starts With None

## Dependency Graph

```
P15-1 (startVoting auto-pick + winner display fix) → P15-2 (vote command message)
```

P15-1 first, then P15-2.

---

## Shared Decisions

- `LunchDay` gains optional `autoPicked?: boolean` — flags when suggestions were auto-picked, reset by `startToday()`
- Auto-pick uses existing `getPickCounts(28)` and `getMasterList()` from Phase 14
- 5 places default, clamped to available
- Contract change: `startVoting()` returns `LunchDay` when auto-pick succeeds, `undefined` only when master list also empty (was: no suggestions → `undefined`)
- Shared `pickFromMasterList(count): string[]` helper extracts sort-by-count-then-shuffle logic

---

## Task P15-1: startVoting() auto-picks + winner display fix

**Goal:** Auto-pick 5 places from master list when suggestions empty; fix winner display order on tie.

**Context:** `startVoting()` in `store.ts` (line 403) returns `undefined` when `suggestions.length === 0`. Callers: `vote.ts` (line 128), `cron.ts` (line 69).

**Proposed Approach:**
- **Auto-pick (in `startVoting()`):**
  - Extract `pickFromMasterList(count): string[]` — shared helper for sort-by-count-then-shuffle
  - When `suggestions.length === 0`, call `pickFromMasterList(5)`, push results to `today.suggestions`
  - Set `today.autoPicked = true`
  - If master list also empty, return `undefined` (skip)
  - Mark `votingStarted = true`, save, return `today`
  - `startToday()` resets `autoPicked` to `undefined` (new day = clean state)
  - Console.log: `[startVoting] auto-picked N places from master list`
  - Tests: auto-pick when empty, skip when master list empty, pick all when < 5, smart-pick ordering, autoPicked flag set
- **Winner display fix (in `endPoll()`):** Pre-existing bug fix
  - After picking winner, reorder `results` so winner is first, rest keep original sort
  - `runnersUp` built after reordering (filter out winner from reordered results)
  - Tests: winner appears first in results on tie, non-tie unaffected

**Acceptance Criteria:**
- `startVoting()` picks 5 places from master list when suggestions empty
- Uses smart-pick logic (least picked first, shuffle ties)
- Skips when master list also empty (returns `undefined`)
- Picks all available when master list < 5
- `today.autoPicked` is `true` after auto-pick
- Winner appears first in `results` array (even on tie)
- Non-tie results ordering unchanged

**Spec:** full (`spec-phase15.md`)

**Verify:** `npm test -- store.test.ts`

**Out of Scope:** Configurable auto-pick count, master list modification.

---

## Task P15-2: vote command shows auto-pick message

**Goal:** Notify user when auto-pick triggered.

**Context:** `vote.ts` (line 128) calls `startVoting()`, checks result, posts voting open message via `buildPollBlocks`.

**Proposed Approach:**
- Check `votingDay?.autoPicked` after `startVoting()` call
- When true, prepend `⚠️ No suggestions received — auto-picked 5 places from master list.\n` to voting message
- Tests: message shown when auto-picked, not shown when suggestions existed

**Acceptance Criteria:**
- `vote` command shows auto-pick warning when `autoPicked` is true
- Normal voting message shown when suggestions already existed
- Cron-triggered voting works (no message needed, just auto-picks)

**Spec:** full (`spec-phase15.md`)

**Verify:** `npm test -- vote.test.ts`
