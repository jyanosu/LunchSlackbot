# Phase 6 Plan — Admin Reset

Shared decisions (from spec): `adminreset` clears days/votes/userNames but **preserves masterList**, requires button confirmation (`action_id: confirm_adminreset`), not listed in help, no slash command equivalent.

## Task P6-1: Add resetStore to store and create adminreset command

**Goal:** Add `resetStore()` to clear daily state and create the `adminreset` command with button confirmation.

**Context:**
- `store.ts` has `LunchStore` with `days`, `votes`, `userNames`, `masterList`
- Store persists to `data/lunch.json` via `saveStore()`
- `confirmations.ts` manages pending confirmations keyed by `${userId}:${channelId}:${action}`
- `commands/remove.ts` has the confirmation button pattern to follow
- `handlers.ts` routes commands via `routeCommand`

**Proposed Approach:**
- Add `resetStore()` to `store.ts` — clears `days`, `votes`, `userNames` to empty state, **preserves `masterList`**, saves to JSON
- Create `commands/adminreset.ts` — sends confirmation button, handles `confirm_adminreset` block_action
- Add `adminreset` to `KNOWN_COMMANDS` + `routeCommand` in `handlers.ts`
- Register `app.action('confirm_adminreset', ...)` in `bot.ts`
- Do **not** add to `help.ts` or `slash.ts`

**Acceptance Criteria:**
- `resetStore` clears days, votes, userNames to empty state
- `resetStore` preserves masterList
- `resetStore` saves state to JSON
- `adminreset` handler sends confirmation button
- Confirmation button click executes reset and replies
- Command is routable via `@LunchSlackBot adminreset`
- Help output does not include `adminreset`

**Spec:** `none` (defined in spec.md Phase 6)

**Verify:** `npm run build && npm test`

**Out of Scope:**
- Admin authentication or role checks
- Partial resets
- Slash command equivalent

## Dependency Graph

```
P6-1 (resetStore + adminreset command)
```

Single task — self-contained.

---

