# Phase 16 Plan: Prune History Older Than 3 Months

## Tasks

| Task | Description | Depends On |
|---|---|---|
| P16-1 | Add `pruneOldWinners()` to `loadWinners()` | — |

Single task.

---

## Task P16-1: Prune old winners on load

**Goal:** Remove winner entries older than 90 days at startup.

**Context:** `loadWinners()` in `store.ts` (line 311) loads winners from `data/winners.json` into `winnersStore.winners`.

**Proposed Approach:**
- Add `pruneOldWinners()` — filters `winnersStore.winners` by date >= 90-day cutoff, calls `saveWinners()`, logs `[store] pruned N old winners`
- Call from `loadWinners()` after loading
- Tests: removes old entries, keeps recent, boundary at 90 days, empty history

**Acceptance Criteria:**
- Entries older than 90 days removed on load
- Entries within 90 days preserved
- Entry exactly 90 days old is kept, 91 days is removed
- Empty history → no crash

**Spec:** full (`spec-phase16.md`)

**Verify:** `npm test -- store.test.ts`
