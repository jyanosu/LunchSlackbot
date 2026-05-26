# Fix Message Confirmation Handler Crash

## What

`handleConfirmation` is registered via `app.message(/.*/, ...)` and calls `await ack()`. This listener fires on every channel message and the `ack` behavior is unreliable for `app.message` handlers, causing crashes on normal Slack messages.

## Context

- **Registration:** `src/bot.ts:38` — `app.message(/.*/, handleConfirmation as any)`
- **Handler:** `src/commands/remove.ts:56-110` — calls `await ack()` on line 1
- **All 4 confirmation types** (`begin`, `remove`, `adminreset`, `clearsuggestions`) already have fully functional **button-based** confirmations via `handleBlockAction` (registered with `app.action(/confirm_/, ...)`)
- The message path is a legacy fallback: user types `yes` after a confirmation prompt

## Requirements

1. Normal Slack messages in the channel do not throw or log errors
2. Button confirmations (`confirm_begin`, `confirm_remove`, `confirm_adminreset`, `confirm_clearsuggestions`) continue to work unchanged
3. Typed `yes` message confirmations are removed from the UX (button is the canonical path)
4. Tests cover the removal / verify no regression

## Design

### Remove the message confirmation path entirely

**Rationale:** Button confirmations are the canonical, reliable path. The message path adds no unique value — it requires the user to type exactly `yes` in the same channel within 60 seconds, which is fragile and undocumented in the UX (no prompt tells users to type `yes`).

### Changes

**`src/bot.ts`:**
- Remove `import { handleConfirmation } from "./commands/remove"`
- Remove `app.message(/.*/, handleConfirmation as any)`

**`src/commands/remove.ts`:**
- Remove `export async function handleConfirmation(...)` and its body
- Keep `handleBlockAction` unchanged

**`src/commands/remove.test.ts`:**
- Remove the `describe("handleConfirmation", ...)` test block
- Keep `handleBlockAction` tests unchanged

**`src/confirmations.ts`:**
- No changes — the `add`/`check` map is still used by button confirmations

## Invariants

- `handleBlockAction` remains registered via `app.action(/confirm_/, ...)` and handles all 4 confirmation types
- The `confirmations` module (`add`/`check`) remains unchanged and functional
- No other code imports or references `handleConfirmation`

## Testing Strategy

- Existing `handleBlockAction` tests in `remove.test.ts` cover all 4 confirmation types — ensure they still pass
- Existing `confirmations.test.ts` unit tests cover the add/check/timeout logic — ensure they still pass
- No new tests needed (removing dead code path)

## Out of Scope

- Adding a new typed-message confirmation mechanism
- Changing button confirmation behavior
- Changes to `adminreset` or `adminclearsuggestions` confirmation prompts (they already use buttons)
