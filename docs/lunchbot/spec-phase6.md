# Phase 6 — Admin Reset

## What

Add an `adminreset` command that clears daily state (suggestions, votes, userNames) and resets to initial empty state. The master list is **preserved**. Intended for admin use only — not listed in help output.

## Context

- Phase 5: master list, voting, daily suggestions all stored in `LunchStore`.
- Store persists to `data/lunch.json` as in-memory + JSON backup.
- Render filesystem is ephemeral — reset provides a clean state without waiting for redeploy.
- Command is accessible via `@LunchSlackBot adminreset` (app_mention only, no slash command).
- Confirmation system uses button-based `block_actions` (Phase 2 pattern).

## Requirements

1. **`@LunchSlackBot adminreset`** — Prompts for confirmation. On confirmation, clears `days`, `votes`, `userNames` but **preserves `masterList`**. Saves state to JSON. Replies confirming the reset.
2. Not listed in `help` output.
3. Requires button confirmation (`action_id: confirm_adminreset`) before executing.
4. No slash command equivalent.

## Design

### Command

`@LunchSlackBot adminreset` → sends button: `Reset LunchBot? This will clear today's suggestions, votes, and user data. Master list will be preserved.` with Yes button (`action_id: confirm_adminreset`).

On confirmation → clear state and **update the confirmation message in-place** (`chat.update`): `🗑️ LunchBot has been reset. Master list preserved.`

### Store function

Add `resetStore()` to `store.ts`:
- Clears `days`, `votes`, `userNames` to empty initial state.
- **Preserves** `masterList`.
- Saves state to `data/lunch.json`.

### Confirmation

Uses the existing confirmation map pattern from Phase 2:
- Key: `${userId}:${channelId}:adminreset`
- Pending confirmation expires after 60 seconds (shared behavior).
- On timeout or no response, do nothing.

### Routing

- Add `adminreset` to `KNOWN_COMMANDS` + `routeCommand` in `handlers.ts`.
- No slash command registration.
- No help entry.

### File structure

```
src/
  store.ts              — add resetStore()
  commands/
    adminreset.ts       — handleAdminreset, handleAdminResetConfirm (block_actions)
  handlers.ts           — add adminreset to KNOWN_COMMANDS + routeCommand
```

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Confirmation required | Button click | Prevents accidental resets |
| Master list preserved | Not cleared | Master list is the accumulated knowledge base; resetting it defeats its purpose |
| No slash command | app_mention only | Reduces surface area; admins use @mention anyway |
| Not in help | Hidden command | Discourages casual use; admins know the command |

## Invariants

- `masterList` is never cleared by `resetStore`.
- `data/lunch.json` is written with cleared state (preserving masterList) after reset.
- Help output does not reference `adminreset`.
- Confirmation must come from the same user/channel that invoked the command.

## Error Behavior

- `resetStore` file write failure → best-effort, silently ignored (matches existing store pattern).
- Confirmation button click with no pending confirmation → return early silently.
- Confirmation button click from different user/channel → no match (keyed by `${userId}:${channelId}:adminreset`).

## Testing Strategy

- Unit test: `resetStore` clears days, votes, userNames to empty state.
- Unit test: `resetStore` preserves masterList.
- Unit test: `resetStore` saves state to JSON.
- Unit test: `adminreset` handler sends confirmation button.
- Unit test: confirmation handler executes reset and replies.
- Unit test: `help` output does not include `adminreset`.

## Out of Scope (Phase 6)

- Admin authentication or role checks.
- Partial resets (e.g., clear only votes).
- Slash command equivalent.

---

