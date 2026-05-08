# Phase 17 Plan: Admin Clear Suggestions Command

## Tasks

| Task | Description | Depends On |
|---|---|---|
| P17-1 | `adminclearsuggestions` command + store function | — |

Single task.

---

## Shared Decisions

- Follows `adminreset` pattern: button confirmation, hidden from help, no slash command
- Confirmation type: `"clearsuggestions"`, action_id: `confirm_clearsuggestions`
- Handler registered in `remove.ts` `handleBlockAction` (shared confirmation handler pattern)
- Routing added in `handlers.ts` `loadCommandHandlers()`

---

## Task P17-1: adminclearsuggestions command

**Goal:** Clear all suggestions for the current day with button confirmation.

**Context:**
- `adminreset.ts` — confirmation pattern: sends confirmation button via `confirmations.ts`, handled in `remove.ts`
- `confirmations.ts` — type union `"begin" | "remove" | "adminreset"`, key format `${userId}:${channelId}:${type}`
- `remove.ts` `handleBlockAction` — handles `confirm_begin`, `confirm_remove`, `confirm_adminreset`
- `handlers.ts` — `KNOWN_COMMANDS` array, `routeCommand()` dispatches handlers
- `store.ts` — `getToday()`, `setToday()`, `saveStore()`

**Proposed Approach:**
- **Store:** Add `clearSuggestions(): boolean` — clears `today.suggestions = []`, saves, returns `true` if cleared, `false` if no round or already empty
- **Command:** Create `commands/adminclearsuggestions.ts` — checks round state, sends confirmation button
- **Confirmation:** Add `"clearsuggestions"` to confirmations type union
- **Handler:** Add `confirm_clearsuggestions` case to `remove.ts` `handleBlockAction` — calls `clearSuggestions()`, updates message
- **Routing:** Add `adminclearsuggestions` to `KNOWN_COMMANDS` and handler map in `handlers.ts`
- **Tests:** clears suggestions, no round error, already empty info, confirmation flow, not in help

**Acceptance Criteria:**
- Clears suggestions when round active
- Returns error when no round started
- Returns info when already empty (no confirmation)
- Confirmation button flow works (in-place message update)
- Not listed in help output
- No slash command registered in `slash.ts`

**Spec:** full (`spec-phase17.md`)

**Verify:** `npm test -- adminclearsuggestions.test.ts store.test.ts`

**Out of Scope:** Slash command, help entry, voting/poll state changes.
