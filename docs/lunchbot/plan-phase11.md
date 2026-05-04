# Phase 11 Plan — Deadline Reminders

## Tasks

### P11-1: Reminder jobs + alphabetical sorting (single task)

Add voting reminder cron job to `cron.ts`: fires at `endTime - 5min`, posts reminder, skips if poll ended or voting not started. Add suggestion reminder as setTimeout in `store.ts` `startToday()`: computes ms until `deadline - 5min`, posts via `getClient()`, skips if voting started. Sort suggestions alphabetically (case-insensitive) in `list.ts`, `vote.ts` `buildPollBlocks`, `showmasterlist.ts`, and `showpoll.ts`. Update `adminquicktest.ts` timing: 6 min for suggestions, 6 min for voting (so 5-min reminders fire during test).

**Deliverables:**
- `src/cron.ts` — voting reminder cron job
- `src/store.ts` — suggestion reminder setTimeout in `startToday()`
- `src/cron.test.ts` — voting reminder guard checks
- `src/store.test.ts` — suggestion reminder setTimeout behavior

**Tests:** 6+

---

## Dependency graph

```
P11-1 (self-contained)
```

## Shared decisions

- Reminder timing: fixed at 5 minutes before deadline
- Channel: `LUNCH_CHANNEL_ID` (same as scheduled events)
- Approach: cron-based (wall-clock time), same for manual and scheduled rounds
- Guards: skip if phase already ended
- Idempotent: one-time fire per day via cron expression
