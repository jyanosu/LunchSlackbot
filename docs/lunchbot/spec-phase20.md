# Phase 20: Split Days and Votes into Separate Files

## What

Move `days` and `votes` from `data/lunch.json` into separate files: `data/days.json` and `data/votes.json`.

## Context

`data/lunch.json` currently holds everything: `days`, `votes`, `userNames`, `masterList`, `schedule`. Over time `days` (one entry per day, never pruned) and `votes` (accumulates per vote) grow unbounded. `masterList` and `schedule` are small and stable.

## Requirements

- `data/days.json` — stores `days` (Record<string, LunchDay>)
- `data/votes.json` — stores `votes` (Record<string, string[]>) and `userNames` (Record<string, string>)
- `data/lunch.json` — stores only `masterList` and `schedule`
- All existing store functions unchanged (transparent to callers)
- Backward compatible: if old `lunch.json` exists, migrate data to new files

## Design

### File layout

| File | Contents |
|---|---|
| `data/lunch.json` | `masterList`, `schedule` (includes `pruneDays`) |
| `data/days.json` | `days` |
| `data/votes.json` | `votes`, `userNames` |

### LunchSchedule

Add optional `pruneDays?: number` (default 120) to `LunchSchedule` interface.

### Store constants

```typescript
const LUNCH_FILE = path.join(DATA_DIR, "lunch.json");
const DAYS_FILE = path.join(DATA_DIR, "days.json");
const VOTES_FILE = path.join(DATA_DIR, "votes.json");
```

### Load/save functions

- `loadStore()` — loads from all three files
- `saveStore()` — saves `days` to `days.json`, `votes`+`userNames` to `votes.json`, `masterList`+`schedule` to `lunch.json`
- `loadDays()` / `saveDays()` — internal helpers
- `loadVotes()` / `saveVotes()` — internal helpers

### Migration

On `loadStore()`, if old `lunch.json` contains `days` or `votes`:
1. Extract and save to new files (all data, no filtering)
2. Apply pruning to new files based on `pruneDays`
3. Remove those fields from `lunch.json`
4. Save cleaned `lunch.json`

### Pruning details

- `days` — keyed by date string (`"2025-01-15"`), compare directly
- `votes` — keyed by `"date:place"` (e.g., `"2025-01-15:Taco Bell"`), extract date prefix before comparing
- `pruneDays` minimum 7, validated on set; 0 or negative rejected with error

### Backward compatibility

- If new files don't exist, start with empty defaults
- If old `lunch.json` exists with `days`/`votes`, migrate automatically

## Decisions

| Decision | Rationale |
|---|---|
| Votes + userNames together | Both grow with voting activity, same lifecycle |
| MasterList + schedule in lunch.json | Small, stable, same file as before |
| Silent migration | No user action needed, happens on startup |
| Migrate then prune | Extract all data first, then apply retention window |
| pruneDays minimum 7 | Prevent accidental data loss |
| pruneDays default 120 | ~4 months, reasonable retention |

## Invariants

- All store functions (`getToday`, `startToday`, `addSuggestion`, etc.) work unchanged
- `resetStore()` clears days and votes (writes empty objects to new files)
- `adminreset` preserves masterList (unchanged)
- Data persists across restarts

## Error Behavior

- Missing file → use defaults (unchanged)
- Corrupt JSON → load fails silently, use defaults (unchanged)
- Migration fails → best-effort, original file preserved

## Testing Strategy

- `loadStore()` loads from three separate files
- `saveStore()` writes to correct files
- Migration: old `lunch.json` with days/votes → split to new files
- Empty defaults when no files exist
- `resetStore()` clears days and votes files

## Pruning

- `days` — entries older than `pruneDays` (default 120) pruned on `loadStore()`
- `votes` — entries with date prefix older than `pruneDays` pruned on `loadStore()`
- `userNames` — preserved (small, needed for historical display)
- Prune silently, log count: `[store] pruned N old days, M old votes`
- `pruneDays` stored in `LunchSchedule` as `pruneDays?: number` (default 120)

### Commands

- `prune <days>` — set prune retention period (e.g., `@LunchSlackBot prune 90`)
- `prune` (no args) — show current prune setting
- Slash: `/lsb-prune`
- Help entry: `prune [days] (/lsb-prune) - set prune retention period in days (default 120)`

## Out of Scope

- Database migration
- Compression or archival
