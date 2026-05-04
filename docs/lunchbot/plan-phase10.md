# Phase 10 Plan — Automated Scheduling

## Tasks

### P10-1: Extract store functions + cron infrastructure (sequential)

Install `node-cron`. Extract core logic from `begin`, `vote`, `endpoll` handlers into store functions: `startToday()`, `startVoting()`, `endPoll()`. Refactor existing handlers to call these store functions and handle the UI layer (confirmation, posting). Extend store with `LunchSchedule` config (`beginTime`, `voteTime`, `endTime`, `days`, `enabled`). Create `src/cron.ts` with `initSchedule(app)` that reads config, builds cron expressions (timezone: `America/New_York`), and registers three cron jobs that call the same store functions. `startVoting` returns `undefined` when no suggestions exist. Call `initSchedule(app)` in `bot.ts` after `loadStore`/`loadWinners`.

**Deliverables:**
- `src/cron.ts` — cron setup, job handlers calling shared store functions, `initSchedule(app)`
- `src/cron.test.ts` — cron expressions, timezone, idempotency, missing channel, no-suggestions skip
- `store.ts` — `startToday()`, `startVoting()`, `endPoll()`, `LunchSchedule` in `LunchStore`, load/save
- `commands/begin.ts` — refactored to call `startToday()`
- `commands/vote.ts` — refactored to call `startVoting()`
- `commands/endpoll.ts` — refactored to call `endPoll()`
- `bot.ts` — `initSchedule(app)` call
- `package.json` — `node-cron` dependency

**Tests:** 12+ (store function tests + cron tests + regression tests for refactored handlers)

---

### P10-2: Schedule commands + slash routing (after P10-1)

Create `schedulebegin`, `schedulevote`, `scheduleend`, `showschedule` commands (command name: `schedule`). Parse time strings, update store config, restart cron jobs. `schedule enable`/`schedule disable` toggle `enabled` flag and stop/restart cron. Register in `handlers.ts`. Add slash commands `/lsb-schedulebegin`, `/lsb-schedulevote`, `/lsb-scheduleend`, `/lsb-schedule`. Update help.

**Deliverables:**
- `src/commands/schedulebegin.ts` + test
- `src/commands/schedulevote.ts` + test
- `src/commands/scheduleend.ts` + test
- `src/commands/showschedule.ts` (command name: `schedule`) + test
- `handlers.ts` — route new commands
- `slash.ts` — register new slash commands
- `help.ts` — new entries

**Tests:** 14+

---

## Dependency graph

```
P10-1 (store + cron)
  └── P10-2 (commands)
```

## Shared decisions

- Cron library: `node-cron`, timezone: `America/New_York`
- Channel: `LUNCH_CHANNEL_ID` env var, skip if missing
- Architecture: shared store functions (`startToday`, `startVoting`, `endPoll`) — manual handlers + cron both call them, handlers add UI layer
- `begin` confirmation: handler-only (cron calls `startToday` directly)
- `vote` with no suggestions: `startVoting` returns `undefined`, caller skips silently
- Idempotency: guard checks inside store functions (single source of truth)
- Default: every day at 9:30 / 10:30 / 11:15 AM EST
- Persistence: `LunchStore.schedule` → `data/lunch.json`
- Pause/resume: `schedule enable` / `schedule disable` commands
