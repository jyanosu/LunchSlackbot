# Phase 15: Auto-Pick Suggestions When Voting Starts With None

## What

When the voting phase begins (cron or manual `vote` command) and there are **no suggestions**, automatically pick 5 places from the master list using smart-pick logic (least picked in 4 weeks), then start voting.

## Context

Currently `startVoting()` returns `undefined` when `suggestions.length === 0` — voting silently skips. Users get no lunch poll.

## Requirements

- `startVoting()` auto-picks 5 places from master list when suggestions are empty
- Uses same smart-pick logic as `suggestfrommasterlist` (least picked in 4 weeks, shuffle ties)
- If master list is also empty, skip voting (no places to pick) — **only case returning `undefined` now**
- If master list has fewer than 5 places, pick all available
- Pick result is visible in cron log (`[startVoting] auto-picked 5 places from master list`) and `vote` command output
- `autoPicked` flag reset by `startToday()` (new day = clean state)

## Design

### startVoting() Flow

```
startVoting()
  → suggestions empty?
    → master list empty? → return undefined (skip)
    → getPickCounts(28), sort ascending, shuffle ties, take min(5, available)
    → add to today.suggestions
    → mark votingStarted = true
    → return today
```

### vote command output

When auto-pick triggers, `vote` command shows:

```
⚠️ No suggestions received — auto-picked 5 places from master list.
🗳️ Voting is open! Closes at 11:15 AM EST.
```

### Cron behavior

Cron calls `startVoting()` which auto-picks internally. Logs: `[startVoting] auto-picked 5 places from master list`. No separate cron job needed.

### Interactions

- If `suggestfrommasterlist` runs before voting, suggestions won't be empty → auto-pick skipped (expected)
- `adminquicktest` already adds suggestions before `startVoting()` — no change needed
- Shared `pickFromMasterList(count): string[]` helper extracts sort-by-count-then-shuffle logic (used by both `startVoting()` and `suggestfrommasterlist`)

## Decisions

| Decision | Rationale |
|---|---|
| Auto-pick in `startVoting()` | Single source of truth, both cron and manual `vote` get same behavior |
| 5 places default | Matches `suggestfrommasterlist` default |
| Smart-pick logic | Consistent with Phase 14 priorities |
| Skip if master list empty | Nothing to pick from, no crash |
| No separate command | Existing `vote` command handles it |

## Invariants

- `startVoting()` is idempotent (guard checks unchanged)
- `startVoting()` returns `LunchDay` when auto-pick succeeds, `undefined` only when master list also empty
- Auto-picked suggestions are real suggestions (stored in `today.suggestions`)
- `autoPicked` flag reset by `startToday()` (new day = clean state)
- Master list is not modified (read-only)
- `pollEnded` guard unchanged

## Error Behavior

- Master list empty → return undefined, skip voting
- Fewer than 5 places → pick all available, start voting
- `getPickCounts` fails → treat all as 0 picks (pure random)

## Testing Strategy

- `startVoting()` auto-picks when suggestions empty, master list has entries
- `startVoting()` skips when both suggestions and master list empty
- `startVoting()` picks all when master list < 5
- Smart-pick ordering used (least picked first)
- `vote` command shows auto-pick message

## Winner Display Fix (Pre-existing Bug)

**Pre-existing issue:** When a tie occurs and winner is selected randomly, the winner must appear **first** in the final results tally. Currently results are sorted by votes desc then name asc, so the randomly-selected winner may not be at position 0.

**Fix:** After picking winner, reorder `results` array so winner is first, remaining places keep their original sort order. `runnersUp` is built after reordering (filter out winner from reordered results).

**Example:**
```
Before (tie, Taco Bell won randomly):
1. Chipotle — 3 votes
1. Taco Bell — 3 votes

After (winner first):
1. Taco Bell — 3 votes  🏆
1. Chipotle — 3 votes
```

## Out of Scope

- Configurable auto-pick count
- Notification that auto-pick occurred (beyond vote command output)
- Manual override of auto-pick behavior
