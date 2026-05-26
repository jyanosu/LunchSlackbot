# Plan: Fix Message Confirmation Handler Crash

## Task 1: Remove message confirmation path

**Goal:** Eliminate the crash-prone `handleConfirmation` message listener and its tests.

**Context:** `handleConfirmation` is registered as `app.message(/.*/, ...)` in `bot.ts` and calls `await ack()`, which is unreliable for message handlers. All 4 confirmation types already work via button-based `handleBlockAction`. References exist in exactly 3 files: `bot.ts`, `remove.ts`, `remove.test.ts`.

**Proposed Approach:**
1. `src/bot.ts` — remove the `handleConfirmation` import and `app.message(/.*/, ...)` line
2. `src/commands/remove.ts` — remove `export async function handleConfirmation(...)` and its body (lines ~56–110)
3. `src/commands/remove.test.ts` — remove the `describe("handleConfirmation", ...)` block and the `handleConfirmation` import

**Acceptance Criteria:**
- `npm test` passes with no failures
- `grep handleConfirmation src/` returns no results
- Button confirmations still work (covered by existing `handleBlockAction` tests)

**Spec:** `full` — `docs/lunchbot/spec-fix-confirmation-crash.md`

**Verify:**
```bash
npm run build && npm test
grep -rn "handleConfirmation" src/
```

**Out of Scope:**
- `src/confirmations.ts` — unchanged, still used by button confirmations
- `handleBlockAction` — unchanged
- Admin command files — unchanged
