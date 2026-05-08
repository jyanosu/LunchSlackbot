# Phase 14 Plan: Full Results History & Smart Suggestions

## Dependency Graph

```
P14-1 (store) → P14-2 (endPoll)
              → P14-3 (showhistory)
              → P14-4 (suggestfrommasterlist)
```

P14-1 first. P14-2, P14-3, P14-4 run in parallel after.

---

## Shared Decisions

- `WinnerEntry` gains optional `runnersUp?: Array<{ place: string; votes: number }>` — backward compatible
- `getPickCounts(lastDays)` returns `Map<string, number>` — counts appearances as winner or runner-up
- 4-week (28-day) lookback window — fixed, not configurable
- Old history entries without `runnersUp` display normally (graceful degradation)

---

## Task P14-1: Store — runners-up + getPickCounts

**Goal:** Extend data model and add pick frequency helper.

**Context:** `store.ts` has `WinnerEntry`, `addWinner()`, `getWinners()`, `endPoll()`. Winners persist in `data/winners.json`.

**Proposed Approach:**
- Add `runnersUp?: Array<{ place: string; votes: number }>` to `WinnerEntry`
- Add `getPickCounts(lastDays = 28): Map<string, number>` — iterates winners, filters by ISO date string comparison (`entry.date >= cutoffDate`), counts appearances (winner + runners-up)
- `addWinner()` signature unchanged — it accepts `WinnerEntry` which now includes `runnersUp`

**Acceptance Criteria:**
- `WinnerEntry` includes optional `runnersUp` field
- `getPickCounts(28)` returns correct counts for entries within/outside window
- `getPickCounts` handles empty history, missing runnersUp, places never in history
- `winners.json` schema is backward compatible (old entries load without error)

**Spec:** full (`spec-phase14.md`)

**Verify:** `npm test -- store.test.ts`

**Out of Scope:** Pruning old entries, configurable window.

---

## Task P14-2: endPoll — save runners-up

**Goal:** Save full results to history when poll ends.

**Context:** `endPoll()` in `store.ts` computes results, picks winner, calls `addWinner()` with winner-only entry.

**Proposed Approach:**
- After computing results in `endPoll()`, build `runnersUp` array from non-winning results (sorted by votes desc)
- Pass `runnersUp` to `addWinner()`
- Tests: verify runners-up saved, empty when only one suggestion

**Acceptance Criteria:**
- `endPoll()` saves runners-up with vote counts to history
- Runners-up sorted by votes descending
- Single suggestion → empty runnersUp
- Winner does not appear in runnersUp

**Spec:** full (`spec-phase14.md`)

**Verify:** `npm test -- endpoll.test.ts store.test.ts`

---

## Task P14-3: showhistory — display runners-up

**Goal:** Show runners-up indented below each winner entry.

**Context:** `showhistory.ts` iterates `getWinners()` and formats each entry as `📅 date — 🏆 place (votes)`.

**Proposed Approach:**
- After winner line, append runners-up indented with `  place — votes`
- Handle missing `runnersUp` gracefully (old entries)
- Tests: display format, backward compat with old entries

**Acceptance Criteria:**
- Runners-up displayed indented below winner, sorted by votes desc
- Old entries without runnersUp display normally (just winner line)
- Empty runnersUp → no extra lines

**Spec:** full (`spec-phase14.md`)

**Verify:** `npm test -- showhistory.test.ts`

---

## Task P14-4: suggestfrommasterlist — smart picks

**Goal:** Prioritize places least picked in the past 4 weeks.

**Context:** `suggestfrommasterlist.ts` picks randomly from master list. No awareness of history.

**Proposed Approach:**
- Import `getPickCounts(28)` from store
- Sort master list by pick count ascending (least picked first)
- Among ties, shuffle randomly
- Take top N from sorted list
- Add via existing `addSuggestion()` (already skips duplicates suggested today)
- Tests: least-picked selected first, ties shuffled, empty history = random

**Acceptance Criteria:**
- Places with fewer picks in 4-week window are selected first
- Places never picked are treated as 0 picks (highest priority)
- Ties in pick count are broken randomly
- Empty history → pure random (no crash)
- Already-suggested places for today are excluded

**Spec:** full (`spec-phase14.md`)

**Verify:** `npm test -- suggestfrommasterlist.test.ts`
