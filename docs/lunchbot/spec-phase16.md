# Phase 16: Prune History Older Than 3 Months

## What

Automatically remove winner history entries older than 3 months (90 days) to prevent unbounded growth of `winners.json`.

## Context

Winner history is append-only and grows indefinitely. Over time `winners.json` becomes large. `getPickCounts(28)` already filters by date, so old entries provide no value.

## Requirements

- Entries older than 90 days are pruned on load
- Pruning happens once at startup (`loadWinners()`)
- `showhistory` only shows entries within 3 months
- `getPickCounts` unaffected (already date-filtered)

## Design

### loadWinners() pruning

After loading winners from file, filter out entries older than 90 days and save the trimmed list.

```typescript
export function loadWinners(): void {
  // ... existing load logic ...
  pruneOldWinners();
}

function pruneOldWinners(): void {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  winnersStore.winners = winnersStore.winners.filter(w => w.date >= cutoffStr);
  saveWinners();
}
```

### showhistory

No change needed — `getWinners()` returns in-memory store which is already pruned.

## Decisions

| Decision | Rationale |
|---|---|
| Prune on load (not on add) | Single point, no missed entries |
| 90-day window | Reasonable retention, matches common log policies |
| Fixed window (not configurable) | Simpler, no user-facing setting needed |
| Prune silently (no log) | Routine maintenance, no user impact |

## Invariants

- `winners.json` never grows beyond ~90 entries (daily polls)
- `adminreset` preserves winners (unchanged — pruning already applied)
- `getPickCounts(28)` unaffected (90-day window supersedes 28-day window)

## Error Behavior

- Corrupt JSON → load fails silently, empty winners (unchanged)
- `saveWinners()` fails (read-only disk) → pruning best-effort, old entries remain in file until next successful save
- Future dates → kept (no filtering)
- Debug log: `[store] pruned N old winners` (visible in container logs)

## Testing Strategy

- `loadWinners()` removes entries older than 90 days
- `loadWinners()` keeps entries within 90 days
- Boundary: entry exactly 90 days old is kept, 91 days is removed
- Empty history → no crash

## Out of Scope

- Configurable retention period
- Archival of old entries
- Pruning master list (not needed — bounded by real restaurants)
