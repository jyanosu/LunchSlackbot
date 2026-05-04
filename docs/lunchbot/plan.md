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

## Task 6b — `list` command

**Goal:** Show today's lunch suggestions as a numbered list with the deadline.

**Context:** Store has `getToday`. Router routes `list` command. Users need a quick way to see current suggestions without scrolling.

**Proposed Approach:**
- Implement `src/commands/list.ts`:
  - Check `begin` was called (today's `started` is true) → prompt to begin if not.
  - If no suggestions → reply: `No suggestions yet. Use @LunchSlackBot suggest <place> to add one.`
  - If suggestions exist → reply using a **mrkdwn block** (not plain text `\n`) so Slack renders line breaks correctly:
    ```
    🍱 *Today's lunch suggestions* (deadline: <deadline>):
    1. <place1>
    2. <place2>
    ```
  - Remove unused `userId` and `channelId` from handler signature — `list` doesn't need them.
- Create `src/commands/list.test.ts` with three cases:
  - `begin` not started → prompts to begin
  - No suggestions → prompts to add one
  - Suggestions exist → returns numbered list with deadline

**Acceptance Criteria:**
- Suggestions exist → numbered list rendered correctly in Slack (mrkdwn block, not escaped `\n`).
- No suggestions yet → prompt to add one.
- `begin` not called yet → prompt to run `begin` first.
- Unit tests cover all three paths.
- Handler signature only includes parameters that are actually used.

**Spec:** full (`docs/lunchbot/spec.md` § Requirements #5).

**Verify:**
```
npm test -- list
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
- All 6 commands work in live Slack (begin, suggest, suggestiondeadline, remove, list, help).

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

## Task 4 — Render deployment config

**Goal:** Add files needed for Render to build and run the bot automatically.

**Context:** Bot code and tests exist (Tasks 1–3). No deployment config yet.

**Proposed Approach:**
- Create `Procfile` with `web: node dist/bot.js` (Render Web Service entry point).
- Add `render.yaml` (optional, for future multi-service setups — skip for now, use Render dashboard instead).
- Ensure `package.json` has `build` command (`tsc`) and `start` command (`node dist/bot.js`).
- Add `README.md` with deployment instructions: GitHub connect → set env vars → deploy.

**Acceptance Criteria:**
- `Procfile` exists with correct start command.
- `package.json` scripts `build` and `start` are present and correct.
- `README.md` documents Render deployment steps.

**Spec:** short (hosting decision in spec § Decisions).

**Verify:**
```
cat Procfile           # shows "web: node dist/bot.js"
grep -A2 '"scripts"' package.json  # shows build + start
```

---

## Dependency order

```
Task 1 (store) → Task 2 (parser) → Task 3 (router)
                                        ↓
              Tasks 4, 5, 6, 6b, 7 (parallel)
                                        ↓
                               Task 8 (tests + deploy)
```

Tasks 1–3 are sequential. Tasks 4–7 (including 6b) run in parallel after Task 3. Task 8 is last.

---

# Phase 3 — Slash Commands Plan

Shared decisions (from spec): `/lsb-` prefix, reuse existing handlers via `routeCommand`, `suggestiondeadline` → `/lsb-deadline`, both methods coexist, new file `slash.ts`.

---

## Task P3-1 — Extract shared command routing

**Goal:** Extract handler registry and routing logic so both app_mention and slash commands reuse the same handlers.

**Context:** `handleAppMention` in `handlers.ts` builds a handler map on every call. Slash commands need the same dispatch. Extract to avoid duplication.

**Proposed Approach:**
- In `src/handlers.ts`, extract:
  - `loadCommandHandlers()` — returns `Record<string, Function>` with keys: `begin`, `suggest`, `suggestiondeadline`, `remove`, `list`, `help`
  - `routeCommand(command, { say, args, userId, channelId })` — looks up handler by command name, calls it; does nothing silently if command is unknown (caller validates against `KNOWN_COMMANDS`)
- Refactor `handleAppMention` to call `routeCommand` instead of inline dispatch.
- Keep `KNOWN_COMMANDS` for validation.
- Create `src/handlers.test.ts` tests for `routeCommand`:
  - Dispatches to correct handler for each command name (begin, suggest, suggestiondeadline, remove, list, help)
  - Unknown command returns without calling a handler
  - Handler receives correct `{ say, args, userId, channelId }`

**Acceptance Criteria:**
- `handleAppMention` behavior is unchanged (same responses for same inputs).
- `routeCommand` is exported and dispatches to correct handler for each command name.
- All existing tests pass.
- New unit tests: `routeCommand` dispatch covers all 6 commands + unknown command path.

**Spec:** full (`docs/lunchbot/spec.md` § Phase 3 Design → Handler abstraction).

**Verify:**
```
npm test -- handlers
npm run build
```

---

## Task P3-2 — Add slash command registrations

**Goal:** Register six slash commands that route to existing handlers via `routeCommand`.

**Context:** Shared routing exists (Task P3-1). Bolt handles slash commands via `app.command()`. For slash commands, `body.text` contains everything after the command name.

**Proposed Approach:**
- Create `src/slash.ts`:
  - Import `routeCommand` from `handlers.ts`
  - Export `registerSlashCommands(app: App)` that calls `app.command()` for each:
    - `/lsb-begin` → `routeCommand('begin', { args: '' })`
    - `/lsb-suggest` → `routeCommand('suggest', { args: body.text ?? '' })`
    - `/lsb-deadline` → `routeCommand('suggestiondeadline', { args: body.text ?? '' })`
    - `/lsb-remove` → `routeCommand('remove', { args: body.text ?? '' })`
    - `/lsb-list` → `routeCommand('list', { args: '' })`
    - `/lsb-help` → `routeCommand('help', { args: '' })`
  - Each handler calls `ack()` first, then routes
  - Use `body.text ?? ''` defensively — Slack sends `""` for no args, but `undefined` is possible in edge cases
- In `bot.ts`, import and call `registerSlashCommands(app)`.
- Update `help.ts` output to include slash command equivalents: `begin (/lsb-begin)`, etc.
- Create `src/slash.test.ts`:
  - `/lsb-suggest` extracts place from `body.text`
  - `/lsb-begin` passes empty args
  - Each handler calls `ack()` before routing
  - `body.text` is `undefined` → handled defensively with `?? ''`
- Update `src/commands/help.test.ts` to expect slash command equivalents in output.

**Acceptance Criteria:**
- Each slash command produces identical behavior to the app_mention equivalent.
- Help output lists both invocation methods.
- All existing tests pass.
- New unit tests: slash handlers extract args correctly, call ack, route to correct command.
- Updated test: help output includes slash command equivalents.

**Spec:** full (`docs/lunchbot/spec.md` § Phase 3 Requirements #1, Design → Slash command mapping).

**Verify:**
```
npm test -- slash
npm test -- help
npm run build
```

---

## Task P3-3 — Deploy + Slack app configuration

**Goal:** Deploy to Render and configure slash commands in Slack app.

**Context:** Code is ready. Slash commands require registration in Slack App → **Slash Commands** section (separate from Event Subscriptions).

**Proposed Approach:**
- Push to GitHub, verify Render deploys.
- In [api.slack.com/apps](https://api.slack.com/apps) → **Slash Commands**:
  - Add `/lsb-begin`, `/lsb-suggest`, `/lsb-deadline`, `/lsb-remove`, `/lsb-list`, `/lsb-help`
  - Request URL for each: `https://lunchslackbot.onrender.com/slack/commands`
  - Add short descriptions
- **Reinstall** app to workspace.
- Manual test: verify each slash command in Slack.

**Acceptance Criteria:**
- Render deploys without errors.
- All 6 slash commands registered in Slack app.
- Each slash command works in live Slack (same result as app_mention equivalent).
- `@LunchSlackBot` mentions still work (both methods coexist).

**Spec:** none.

**Verify:**
```
git push
# Check Render Events tab for successful deploy
# In Slack: /lsb-help, /lsb-begin, /lsb-suggest Taco Bell, /lsb-list
```

---

## Phase 3 dependency order

```
Task P3-1 (extract routing) → Task P3-2 (slash registrations) → Task P3-3 (deploy + config)
```

Sequential — each task depends on the previous.

---

# Phase 4 — Voting Plan

Shared decisions (from spec): Manual `vote` command triggers voting, suggestions frozen at vote start, single toggle button per suggestion with voter usernames listed below, in-memory vote store + JSON backup, `showpoll` reposts poll and updates `pollMessageTs`.

---

## Task P4-1 — Extend store with voting support

**Goal:** Add vote storage and voting state to the existing store.

**Context:** `LunchDay` tracks suggestions and deadline. Need to track votes and whether voting has started.

**Proposed Approach:**
- Extend `LunchDay` in `src/store.ts`:
  - `votingStarted: boolean`
  - `pollMessageTs?: string`
- Add vote store:
  - `getVotes(place: string): Set<string>` — returns set of user IDs who voted for a place
  - `toggleVote(place: string, userId: string): boolean` — toggles vote, returns true if voted, false if unvoted
  - `hasVoted(place: string, userId: string): boolean` — checks if user voted for a place
  - `getUserNames(): Map<string, string>` — returns cached userId → name map
  - `setUserName(userId: string, name: string): void` — caches a user name
- Votes persisted to `data/lunch.json` alongside daily data (Sets → arrays on save, arrays → Sets on load).
- User name cache persisted alongside votes.
- Create `src/store.test.ts` tests for vote operations.

**Acceptance Criteria:**
- `toggleVote` flips vote state correctly.
- `hasVoted` returns correct state.
- Votes persist to JSON and reload on startup.
- All existing tests pass.

**Spec:** full (`docs/lunchbot/spec.md` § Phase 4 Design → Data model).

**Verify:**
```
npm test -- store
npm run build
```

---

## Task P4-2 — Vote command + poll message

**Goal:** `vote` command starts voting and posts the poll message with toggle buttons.

**Context:** Store supports voting (Task P4-1). Need the command handler and poll message builder.

**Proposed Approach:**
- Create `src/commands/vote.ts`:
  - `handleVote` — checks voting not already started, checks suggestions exist, sets `votingStarted = true`, posts announcement to channel ("Voting is open! Deadline: ..."), posts poll message with buttons + voter username lists, saves `pollMessageTs`
  - Poll message builder: block kit layout per suggestion — `header` (name + count) → `actions` (toggle button) → `section` (voter list)
  - Resolve user IDs to names via `client.users.info(userId)`, cache in store, fall back to userId on failure
- Add `vote` to `handlers.ts` `KNOWN_COMMANDS` + `routeCommand`.
- Add slash command `/lsb-vote` in `slash.ts`.
- Update help output: `vote (/lsb-vote)`.
- Create `src/commands/vote.test.ts`:
  - Posts poll with correct buttons
  - Rejects when already started
  - Rejects when no suggestions
- Update `slash-commands-manifest.json` with `/lsb-vote`.
- Update `docs/lunchbot/README.md` commands table.

**Acceptance Criteria:**
- `vote` posts poll message with one button per suggestion.
- `vote` rejects when voting already started or no suggestions.
- New suggestions after voting starts are stored but not added to the poll.
- Slash command `/lsb-vote` works.
- Help output includes `vote (/lsb-vote)`.
- All existing tests pass.

**Spec:** full (`docs/lunchbot/spec.md` § Phase 4 Requirements #1-5, Design → Poll announcement message).

**Verify:**
```
npm test -- vote
npm run build
```

---

## Task P4-3 — Vote toggle handler

**Goal:** Handle `vote_toggle` block actions to toggle votes and update poll message.

**Context:** Poll message posted with buttons (Task P4-2). Need `block_actions` handler for `vote_toggle`.

**Proposed Approach:**
- In `src/commands/vote.ts`, add `handleVoteToggle`:
  - Extract place name from button value
  - Toggle vote in store
  - Resolve clicker's user ID to name (cache if needed)
  - Rebuild poll message with updated button states, vote counts, and voter username lists
  - `client.chat.update` the poll message using `pollMessageTs`
- Register in `bot.ts`: `app.action('vote_toggle', handleVoteToggle)`
- Create `src/commands/vote.test.ts` tests:
  - Toggle vote flips state
  - Poll message updated with new button labels and voter lists
  - Missing fields returns early

**Acceptance Criteria:**
- Clicking vote button toggles vote and updates message.
- Button label shows user's own state (✅ voted / ☐ not voted).
- Voter usernames listed below each suggestion are updated.
- Stale button clicks (unknown place) return early silently.
- All existing tests pass.

**Spec:** full (`docs/lunchbot/spec.md` § Phase 4 Design → Vote toggle handler).

**Verify:**
```
npm test -- vote
npm run build
```

---

## Task P4-4 — Showpoll command

**Goal:** `showpoll` command reposts the poll message with current vote states.

**Context:** Voting is active (Task P4-2). Users need to see the poll if it scrolled off screen.

**Proposed Approach:**
- Create `src/commands/showpoll.ts`:
  - `handleShowpoll` — checks voting started, checks suggestions exist, posts new poll message with current vote states, updates `pollMessageTs`
- Add `showpoll` to `handlers.ts` `KNOWN_COMMANDS` + `routeCommand`.
- Add slash command `/lsb-showpoll` in `slash.ts`.
- Update help output: `showpoll (/lsb-showpoll)`.
- Create `src/commands/showpoll.test.ts`:
  - Reposts poll with current state
  - Rejects when voting not started
- Update `slash-commands-manifest.json` with `/lsb-showpoll`.
- Update `docs/lunchbot/README.md` commands table.

**Acceptance Criteria:**
- `showpoll` posts poll message with current vote states.
- `showpoll` rejects when voting not started.
- Slash command `/lsb-showpoll` works.
- Help output includes `showpoll (/lsb-showpoll)`.
- All existing tests pass.

**Spec:** full (`docs/lunchbot/spec.md` § Phase 4 Requirements #6-7, Design → Showpoll command).

**Verify:**
```
npm test -- showpoll
npm run build
```

---

## Task P4-5 — Deploy + configure

**Goal:** Deploy to Render, add new slash commands to Slack app.

**Context:** Code complete. Need to deploy and register `/lsb-vote` and `/lsb-showpoll`.

**Proposed Approach:**
- Push to GitHub, Render auto-deploys.
- Add `/lsb-vote` and `/lsb-showpoll` to Slack app (Slash Commands or manifest).
- Reinstall app.

**Acceptance Criteria:**
- Deploy succeeds on Render.
- New slash commands work in Slack.

**Verify:**
```
# Manual: test /lsb-vote and /lsb-showpoll in Slack
```

---

## Dependency order

```
P4-1 (store) → P4-2 (vote command) → P4-3 (vote toggle)
                                        ↓
                                  P4-4 (showpoll)
                                        ↓
                                  P4-5 (deploy)
```

Sequential — each task depends on the previous.

---

# Phase 5 Plan — Master Suggestion List

Shared decisions (from spec): `masterList: Set<string>` on `LunchStore`, case-insensitive uniqueness, in-memory + JSON backup, `suggest` auto-adds to master list, remove affects master list only (not today's suggestions).

## Task P5-1: Extend store with masterList

**Goal:** Add `masterList` to `LunchStore` with add/check/get functions.

**Context:**
- `store.ts` has `LunchStore` with `days`, `votes`, `userNames`
- `loadStore` handles JSON seeding
- Sets are converted to arrays for JSON persistence

**Proposed Approach:**
- Add `masterList: Set<string>` to `LunchStore`
- In `loadStore`, safely merge `masterList` from JSON (array → Set)
- In `saveStore`, convert `masterList` Set → array for JSON
- Add functions: `addToMasterList(place)`, `getMasterList()`, `removeFromMasterList(place)`
- All operations normalize to lowercase for case-insensitive uniqueness

**Acceptance Criteria:**
- `addToMasterList` adds place (lowercased) if not already present
- `getMasterList` returns the Set
- `removeFromMasterList` removes place (case-insensitive)
- Persistence: Set → array on save, array → Set on load
- Existing store data without `masterList` loads with empty Set

**Spec:** `none` (defined in spec.md Phase 5)

**Verify:** `npm run build && npm test`

**Out of Scope:**
- Master list display or commands

## Task P5-2: Integrate masterList with suggest command

**Goal:** When `suggest` adds a place to today's suggestions, also add it to the master list.

**Context:**
- `commands/suggest.ts` adds places to today's suggestions
- Store now has `addToMasterList` from P5-1

**Proposed Approach:**
- In `handleSuggest`, after adding to today's suggestions, call `addToMasterList(place)`
- No change to reply message (master list add is silent)

**Acceptance Criteria:**
- Suggesting a new place adds it to both today's suggestions and master list
- Suggesting a place already in master list is a no-op for master list
- Existing suggest behavior unchanged (duplicate check for today, reply format)

**Spec:** `none` (defined in spec.md Phase 5)

**Verify:** `npm run build && npm test`

## Task P5-3: Create showmasterlist and removefrommasterlist commands

**Goal:** Commands to view and manage the master list.

**Context:**
- `commands/` has one file per command
- `handlers.ts` routes commands via `routeCommand`
- `slash.ts` registers slash commands

**Proposed Approach:**
- Create `commands/showmasterlist.ts` — numbered list or empty prompt
- Create `commands/removefrommasterlist.ts` — remove with validation
- Add both to `KNOWN_COMMANDS` + `routeCommand` in `handlers.ts`
- Add `/lsb-showmasterlist`, `/lsb-removefrommasterlist` in `slash.ts`
- Update `help.ts` to include new commands
- Update `slash-commands-manifest.json`
- Update `README.md` + `docs/lunchbot/README.md` commands table

**Acceptance Criteria:**
- `showmasterlist` shows numbered list with count, or empty prompt
- `removefrommasterlist <place>` removes and confirms, or rejects unknown
- `removefrommasterlist` with no place → usage hint
- Slash commands route correctly
- Help output includes new commands

**Spec:** `none` (defined in spec.md Phase 5)

**Verify:** `npm run build && npm test`

## Dependency Graph

```
P5-1 (store masterList)
  ↓
P5-2 (suggest integration)
  ↓
P5-3 (showmasterlist + removefrommasterlist commands)
```

Sequential — each task depends on the previous.

---

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

# Phase 7 Plan — Suggest From Master List

Shared decisions (from spec): `suggestfrommasterlist` randomly picks places from master list and adds to today's suggestions. Accepts optional count argument (default 5). Never fails — reports what was added.

## Task P7-1: Create suggestfrommasterlist command with optional count

**Goal:** Create command that randomly picks N places from master list and adds them to today's suggestions.

**Context:**
- `store.ts` has `getMasterList()`, `addSuggestion()`, `getToday()`
- `commands/` has one file per command
- `handlers.ts` routes commands via `routeCommand`
- `args` parameter carries everything after command name (e.g., `suggestfrommasterlist 3` → args: `"3"`)

**Proposed Approach:**
- Create `commands/suggestfrommasterlist.ts`
- Parse optional count from `args` (default 5, clamp to valid range)
- Shuffle master list, pick N places
- Add each to today's suggestions via `addSuggestion()` (skips duplicates silently)
- Report: X added, Y skipped (already suggested)
- If count exceeds available places, add all available and report actual count
- Add `suggestfrommasterlist` to `KNOWN_COMMANDS` + `routeCommand` in `handlers.ts`

**Acceptance Criteria:**
- `suggestfrommasterlist` with no args → picks 5 places
- `suggestfrommasterlist 3` → picks 3 places
- `suggestfrommasterlist 10` with only 7 available → picks 7, reports 7 added
- Skips places already in today's suggestions, reports count skipped
- Empty master list → prompts to seed or suggest
- Round not started → prompts to begin
- Never fails — always reports what was added

**Spec:** `none` (defined inline)

**Verify:** `npm run build && npm test`

**Out of Scope:**
- Slash command equivalent
- Weighted/random preference logic
- Categorization filtering

## Dependency Graph

```
P7-1 (suggestfrommasterlist command)
```

Single task — self-contained.
