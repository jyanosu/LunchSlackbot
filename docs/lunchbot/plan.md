# LunchBot — Phase 2 Plan

Shared decisions (from spec): In-memory store + JSON backup (`data/lunch.json`), commands parsed from `app_mention` text, single channel, duplicates rejected, deadline warning-only, remove confirmed by replying "yes".

---

## Task 1 — In-memory store with JSON backup

**Goal:** In-memory store for daily lunch data with best-effort JSON backup to `data/lunch.json`.

**Context:** No storage layer exists. All Phase 2 commands depend on this. Render's filesystem is ephemeral — data resets on deploy.

**Proposed Approach:**
- Create `src/store.ts` with `LunchDay` and `LunchStore` interfaces from spec.
- Primary store: in-memory `Map<string, LunchDay>`.
- On startup, seed from `data/lunch.json` if it exists (best-effort, no crash if missing).
- On every mutation, write to `data/lunch.json` (best-effort, no crash on failure).
- Functions: `loadStore()` (seed from JSON), `saveStore()` (write JSON), `getToday()`, `setToday()`, `addSuggestion()`, `removeSuggestion()`, `setDeadline()`.
- `addSuggestion` rejects duplicates (case-insensitive compare).
- Add `data/` to `.gitignore`.

**Acceptance Criteria:**
- Store starts with empty state when `data/lunch.json` doesn't exist.
- Store seeds from `data/lunch.json` on startup if file exists.
- `addSuggestion` adds a place and rejects duplicates.
- `removeSuggestion` removes a place by name (case-insensitive).
- `setDeadline` updates the deadline for today.
- File errors are caught silently (best-effort, no crash).

**Spec:** full (`docs/lunchbot/spec.md` § Phase 2).

**Verify:**
```
npm test -- store
```

---

## Task 2 — Command parser

**Goal:** Extract subcommand and arguments from `app_mention` text.

**Context:** `handleAppMention` currently ignores the mention text. Need to route to subcommands.

**Proposed Approach:**
- Create `src/parser.ts` with `parseCommand(text: string) → { command: string, args: string }`.
- Strip `@LunchSlackBot` (or any mention prefix), trim, split on first whitespace.
- Command is lowercased. Args are everything after the first space.
- Returns `{ command: '', args: '' }` when no subcommand is present.

**Acceptance Criteria:**
- `@LunchSlackBot begin` → `{ command: 'begin', args: '' }`
- `@LunchSlackBot suggest Taco Bell` → `{ command: 'suggest', args: 'Taco Bell' }`
- `@LunchSlackBot suggestiondeadline 10:30 AM` → `{ command: 'suggestiondeadline', args: '10:30 AM' }`
- `@LunchSlackBot remove Taco Bell` → `{ command: 'remove', args: 'Taco Bell' }`
- `@LunchSlackBot` (no subcommand) → `{ command: '', args: '' }`
- Parsing is case-insensitive.

**Spec:** full (`docs/lunchbot/spec.md` § Phase 2 Design → Command parsing).

**Verify:**
```
npm test -- parser
```

---

## Task 3 — Command router + confirmation system

**Goal:** Route parsed commands to handler functions, fall back to Phase 1 title message, and create the shared confirmation system.

**Context:** Parser exists (Task 2). Individual command handlers don't exist yet — stub them. Tasks 4 and 7 both need the confirmation map.

**Proposed Approach:**
- Update `src/handlers.ts` to import `parseCommand` and route: `begin`, `suggest`, `suggestiondeadline`, `remove`, `help`.
- Unknown command → reply with usage hint.
- No command → Phase 1 title message.
- Create `src/confirmations.ts` with:
  - `pendingConfirmations: Map<string, { type: 'begin' | 'remove', payload: any, timeout: NodeJS.Timeout }>`
  - `key(userId, channelId, action) → string`
  - `add(userId, channelId, action, payload)` — stores entry, sets 60s timeout
  - `check(userId, channelId, action)` — returns entry or undefined, clears on match
- Create stub files in `src/commands/`: `begin.ts`, `suggest.ts`, `deadline.ts`, `remove.ts`, `help.ts` — each exports an async function accepting `{ say, store }`.

**Acceptance Criteria:**
- Mention with no subcommand → Phase 1 title message.
- Mention with known command → routed to corresponding handler.
- Mention with unknown command → usage hint reply.
- All command stubs exist and are importable.
- `src/confirmations.ts` exports `add` and `check` functions.
- Confirmation keys are unique per `${userId}:${channelId}:${action}`.

**Spec:** short (routing logic defined in spec § Command parsing table).

**Verify:**
```
npm run build   # compiles with no errors
npm test        # existing tests still pass
```

---

## Task 4 — `begin` command with confirmation

**Goal:** Start a suggestion round for the day after user confirms, or notify if already started.

**Context:** Router and confirmation system exist (Task 3). `begin` is the entry point for the daily workflow.

**Proposed Approach:**
- Implement `src/commands/begin.ts`:
  - If today's round is **already started** (`started === true`) → reply: `Lunch suggestions are already open for today. Use @LunchSlackBot suggest <place> to add a place.`
  - If **not started** → reply: `Start lunch suggestions for today? Reply with "yes" to confirm.`
  - Call `confirmations.add(userId, channelId, 'begin', null)` to register pending confirmation.
  - Task 7's `handleConfirmation` will check for `begin` type and call `store.setToday(...)` on confirmation.

**Acceptance Criteria:**
- `begin` when already started today → notifies user it's already open.
- `begin` when not started → prompts for confirmation.
- Replying "yes" within 60s → round starts, confirmation reply with usage hint and deadline.
- Replying anything else or timing out → no change, no nag.

**Spec:** full (`docs/lunchbot/spec.md` § Requirements #1).

**Verify:**
```
npm test -- begin
```

---

## Task 5 — `suggest` command

**Goal:** Add a lunch place to today's suggestions, reject duplicates.

**Context:** Store has `addSuggestion` with dedup. Router routes `suggest` command.

**Proposed Approach:**
- Implement `src/commands/suggest.ts`:
  - Validate args are non-empty → usage hint if missing.
  - Check `begin` was called (today's `started` is true) → prompt to begin if not.
  - Call `store.addSuggestion(place)` → reject if duplicate.
  - Reply: `✅ Added *<place>*. Current suggestions: <list>`.

**Acceptance Criteria:**
- Valid place name → added to today's list, confirmation reply with full list.
- No place name → usage hint.
- Duplicate place → reply that it's already suggested.
- `begin` not called yet → prompt to run `begin` first.

**Spec:** full (`docs/lunchbot/spec.md` § Requirements #2).

**Verify:**
```
npm test -- suggest
```

---

## Task 6 — `suggestiondeadline` command

**Goal:** Set or override the suggestion deadline for the day.

**Context:** Store has `setDeadline`. Router routes `suggestiondeadline` command.

**Proposed Approach:**
- Implement `src/commands/deadline.ts`:
  - Parse time string: accept `HH:MM AM/PM` or bare `HH:MM` (defaults to AM).
  - Invalid time → usage hint.
  - Call `store.setDeadline(parsedTime)`.
  - Reply: `⏰ Deadline set to <time> EST.`

**Acceptance Criteria:**
- Valid time → deadline updated, confirmation reply.
- Invalid time → usage hint with example.
- No time provided → usage hint.
- Bare `HH:MM` (e.g., `11:30`) defaults to AM.

**Spec:** full (`docs/lunchbot/spec.md` § Requirements #3).

**Verify:**
```
npm test -- deadline
```

---

## Task 7 — `remove` command + confirmation listener

**Goal:** Remove a suggestion after user confirms by replying "yes", and wire the shared `message_events` listener in `bot.ts`.

**Context:** Store has `removeSuggestion`. Confirmation system exists (Task 3). Requires `message_events` listener and the `channels:history` Slack scope.

**Proposed Approach:**
- Implement `src/commands/remove.ts`:
  - Validate place name exists in today's suggestions → "not found" reply if not.
  - Reply: `Remove *<place>* from today's suggestions? Reply with "yes" to confirm.`
  - Call `confirmations.add(userId, channelId, 'remove', place)` to register pending confirmation.
- Export `handleConfirmation(event)` from `src/commands/remove.ts` that:
  - Skips bot messages (`event.bot === true`).
  - Checks if message text is "yes" (case-insensitive).
  - Checks `confirmations.check(event.user, event.channel, 'begin')` → if match, start round.
  - Checks `confirmations.check(event.user, event.channel, 'remove')` → if match, remove place.
  - If no match → ignore.
- In `bot.ts`, import and register: `app.event('message', handleConfirmation)`.

**Acceptance Criteria:**
- Valid place → confirmation prompt sent.
- Replying "yes" within 60s → place removed, confirmation reply.
- Replying anything else or timing out → no change, no nag.
- Non-existent place → "not in suggestions" reply.
- Bot's own messages are skipped (no self-triggering).
- `message_events` listener is registered in `bot.ts`.
- Begin and remove confirmations can coexist without collision.

**Spec:** full (`docs/lunchbot/spec.md` § Requirements #4, Suggestion removal confirmation).

**Verify:**
```
npm test -- remove
npm run build   # compiles with bot.ts + remove.ts
```

---

## Task 8 — Integration tests + deploy + Slack re-install

**Goal:** Verify the full flow works end-to-end, deploy to Render, and re-install the Slack app.

**Context:** All commands implemented. Need integration tests, live deploy, and Slack app re-install for the new `channels:history` scope.

**Proposed Approach:**
- Add integration test: simulate full flow — begin → suggest → suggest duplicate → deadline → remove + confirm → verify store state.
- Push to GitHub, verify Render deploys successfully.
- Re-install the Slack app in [api.slack.com](https://api.slack.com/apps) to grant the `channels:history` scope.
- Manual test in Slack: run through all commands.

**Acceptance Criteria:**
- `npm test` passes all unit and integration tests.
- `npm run build` succeeds.
- Render deploys without errors.
- Slack app re-installed with `channels:history` scope.
- All 5 commands work in live Slack.

**Spec:** none.

**Verify:**
```
npm test
npm run build
git push
# Check Render Events tab for successful deploy
# Test in Slack: @LunchSlackBot begin, suggest, suggestiondeadline, remove
```

---

## Dependency order

```
Task 1 (store) → Task 2 (parser) → Task 3 (router)
                                        ↓
              Tasks 4, 5, 6, 7 (parallel)
                                        ↓
                               Task 8 (tests + deploy)
```

Tasks 1–3 are sequential. Tasks 4–7 run in parallel after Task 3. Task 8 is last.
