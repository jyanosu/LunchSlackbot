# Phase 14: Save Full Results History & Smart Suggestions

## What

1. Save **all poll results** (not just the winner) to history with vote counts.
2. When `suggestfrommasterlist` picks places, prioritize those **least picked in the past 4 weeks**.

## Context

Currently only the winner is saved to `winners.json`. Non-winners and their vote counts are lost. `suggestfrommasterlist` picks randomly with no awareness of past selections.

## Requirements

- `WinnerEntry` extended with `runnersUp: Array<{ place: string; votes: number }>` (all non-winners, sorted by votes desc)
- `endPoll()` saves runners-up to history alongside the winner
- `showhistory` displays runners-up below each winner entry
- `suggestfrommasterlist` weights picks toward places least selected in past 4 weeks
- 4-week window is computed from current time at moment of suggestion
- Places never picked are treated as 0 picks (highest priority)
- If all places have equal pick counts, fall back to random

## Design

### History Data Model

```typescript
interface WinnerEntry {
  date: string;
  place: string;
  voteCount: number;
  totalVotes: number;
  runnersUp?: Array<{ place: string; votes: number }>;  // new
}
```

### Store Functions

- `getPickCounts(lastDays?: number)`: Returns `Map<string, number>` — how many times each place appeared as winner or runner-up in the given window (default 28 days). Date comparison uses ISO string comparison (`entry.date >= cutoffDate`) since `WinnerEntry.date` is `YYYY-MM-DD`.
- Called by `suggestfrommasterlist` to weight the shuffle.

### suggestfrommasterlist Logic

1. Get master list.
2. Call `getPickCounts(28)` to get pick frequency.
3. Sort places by pick count ascending (least picked first).
4. Among places with the same pick count, shuffle randomly.
5. Take top N from the sorted list.
6. Add to today's suggestions (existing `addSuggestion()` skips duplicates already suggested today).

### showhistory Display

```
📜 *Lunch History*

📅 2025-05-05 — 🏆 Taco Bell (5 votes)
  Chipotle — 3 votes
  Panda Express — 2 votes
```

Runners-up shown indented below the winner, sorted by votes descending.

## Decisions

| Decision | Rationale |
|---|---|
| Store runners-up in `WinnerEntry` | Single source of truth, no separate file |
| 4-week lookback window | Balances recency with enough data |
| Count both winners and runners-up | A place suggested often should be deprioritized regardless of outcome |
| Sort by pick count, then shuffle | Deterministic ordering with randomness for ties |
| Backfill: old entries have no runners-up | Graceful — display works without them |

## Invariants

- `winners.json` schema change is backward compatible (runnersUp is optional)
- Old history entries without runnersUp display normally (just the winner)
- `adminreset` preserves winners (unchanged)
- `getPickCounts` returns 0 for places never in history

## Error Behavior

- Missing `winners.json` → empty history, all places equal priority
- Corrupt JSON → load fails silently, empty history
- No history in 4-week window → all places treated as 0 picks (pure random)

## Testing Strategy

- `getPickCounts` returns correct counts for entries within/outside window
- `getPickCounts` handles empty history, missing runnersUp
- `suggestfrommasterlist` prioritizes least-picked places
- `showhistory` displays runners-up correctly
- `endPoll` saves runners-up to history
- Backward compat: old entries without runnersUp load/display fine

## Out of Scope

- Weighting by vote count (only counts appearances, not votes)
- Pruning old history entries
- Configurable lookback window (fixed at 28 days)
