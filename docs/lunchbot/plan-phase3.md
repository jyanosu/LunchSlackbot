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

