# Phase 3 — Slash Commands

## What

Add Slack slash commands as an alternative to `@LunchSlackBot` mentions. All existing commands are accessible via `/lsb-<command>`. Both invocation methods work simultaneously.

## Context

- Phase 2 commands work via `app_mention` with subcommand parsing.
- Command handlers accept `{ say, args, userId, channelId }`.
- Bolt handles slash commands via `app.command('/command-name', handler)`.
- Slash commands require registration in Slack App → **Slash Commands** (separate from Event Subscriptions).

## Requirements

1. Each Phase 2 command has a slash command equivalent:
   | Slash command | Equivalent |
   |---|---|
   | `/lsb-begin` | `@LunchSlackBot begin` |
   | `/lsb-suggest <place>` | `@LunchSlackBot suggest <place>` |
   | `/lsb-deadline <time>` | `@LunchSlackBot suggestiondeadline <time>` |
   | `/lsb-remove <place>` | `@LunchSlackBot remove <place>` |
   | `/lsb-list` | `@LunchSlackBot list` |
   | `/lsb-help` | `@LunchSlackBot help` |
2. Slash commands reuse existing command handlers — no duplicate logic.
3. Both `@LunchSlackBot` mentions and slash commands work simultaneously.
4. `help` output lists both invocation methods.

## Design

### Handler abstraction

Extract the shared routing logic from `handleAppMention` into a reusable function:

```typescript
// handlers.ts
export async function loadCommandHandlers(): Promise<Record<string, Function>>;

export async function routeCommand(
  command: string,
  { say, args, userId, channelId }: CommandContext
): Promise<void>;
```

- `loadCommandHandlers()` returns a map of command name → handler. Keys match existing registry: `begin`, `suggest`, `suggestiondeadline`, `remove`, `list`, `help`.
- `routeCommand(command, context)` looks up the handler by command name and calls it. If the command is unknown, it does nothing (caller is responsible for validation).
- `handleAppMention` parses text → validates against `KNOWN_COMMANDS` → calls `routeCommand`.
- Each `app.command()` handler extracts args from `body.text ?? ''` (defensive: Slack sends `""` for no args, but `undefined` is possible in edge cases) → calls `routeCommand`.

### Slash command mapping

| Bolt registration | Command name | Args source |
|---|---|---|
| `app.command('/lsb-begin')` | `begin` | none |
| `app.command('/lsb-suggest')` | `suggest` | `body.text ?? ''` (entire text is the place) |
| `app.command('/lsb-deadline')` | `suggestiondeadline` | `body.text ?? ''` (entire text is the time) |
| `app.command('/lsb-remove')` | `remove` | `body.text ?? ''` (entire text is the place) |
| `app.command('/lsb-list')` | `list` | none |
| `app.command('/lsb-help')` | `help` | none |

For slash commands, `body.text` is everything after the command name (Bolt strips the `/lsb-<name>` prefix). Use `body.text ?? ''` defensively — Slack sends `""` for no args, but `undefined` is possible in edge cases.

### Help output update

```
🍱 *LunchBot Commands:*
begin (/lsb-begin) - start the lunch poll for the day
suggest <place> (/lsb-suggest) - add a lunch place to today's poll
suggestiondeadline <time> (/lsb-deadline) - set the suggestion deadline (default 11:00 AM EST)
remove <place> (/lsb-remove) - remove a suggestion from today's poll
list (/lsb-list) - show today's lunch suggestions
help (/lsb-help) - show this message
```

### Slack App configuration

In [api.slack.com/apps](https://api.slack.com/apps) → **Slash Commands**:
- Add each command with Request URL: `https://lunchslackbot.onrender.com/slack/events`
- Bolt handles the `/slack/events` endpoint automatically when `app.command()` is used
- Required scope: `chat:write` (already added in Phase 2 for button confirmations)
- After adding, **reinstall** the app to apply

### File structure

```
src/
  handlers.ts         — routeCommand + commandHandlers (extracted)
  slash.ts            — app.command() registrations, calls routeCommand
```

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Prefix | `/lsb-` | Short, unique, avoids collisions with other bots |
| Reuse handlers | Yes | Single source of truth; no duplicate logic to maintain |
| `suggestiondeadline` → `/lsb-deadline` | Shorter name | Slash commands benefit from brevity; `suggestiondeadline` is unwieldy |
| Both methods coexist | Yes | Users choose their preference; no migration needed |

## Invariants

- Slash command and app_mention produce identical behavior for the same command.
- Command handlers are never duplicated — routed from a single registry.

## Error Behavior

- Unknown slash command → Slack shows "Command not found" (handled by not registering it).
- `routeCommand` called with unknown command → does nothing silently (caller is responsible for validation against `KNOWN_COMMANDS`).
- Missing args (e.g., `/lsb-suggest` with no text) → same validation as app_mention path (command handlers check for empty args).
- `body.text` is `undefined` → handled defensively with `body.text ?? ''`.
- Slash command response timeout → Bolt handles async responses automatically via `ack()` + `say()`.

## Testing Strategy

- Unit test: `routeCommand` dispatches to correct handler for each command name.
- Unit test: slash command handler extracts args from `body.text` correctly.
- Unit test: `help` output includes slash command equivalents.
- Manual: verify each slash command in Slack produces same result as app_mention equivalent.

## Out of Scope (Phase 3)

- Removing app_mention support — both methods coexist.
- New commands — only existing Phase 2 commands get slash equivalents.
- Command aliases beyond `/lsb-` prefix.

---

