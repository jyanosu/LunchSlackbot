# Phase 7 — Suggest From Master List

## What

Add a `suggestfrommasterlist` command that randomly picks places from the master list and adds them as today's suggestions. Accepts an optional count argument (default 5).

## Context

- Phase 5: master list stores all suggested places across days.
- Phase 2: `suggest` adds places to today's suggestions with duplicate checking.
- `addSuggestion()` returns `false` for duplicates, `true` on success.
- Command is accessible via `@LunchSlackBot suggestfrommasterlist` (app_mention only, no slash command).

## Requirements

1. **`@LunchSlackBot suggestfrommasterlist`** — Randomly picks 5 places from master list and adds to today's suggestions.
2. **`@LunchSlackBot suggestfrommasterlist <count>`** — Picks `<count>` places (e.g., `suggestfrommasterlist 3` picks 3).
3. If count exceeds available places, pick all available and report actual count.
4. Places already in today's suggestions are skipped (not an error).
5. Reply reports: how many were added, how many were skipped.
6. Empty master list → prompts to seed or suggest.
7. Round not started → prompts to begin.

## Design

### Command

`@LunchSlackBot suggestfrommasterlist` → reply:
```
🎲 Picked 5 places from master list.

Added:
• taco bell
• chipotle
• in-n-out
• panda express
• subway

Current suggestions:
• taco bell
• chipotle
• in-n-out
• panda express
• subway
```

With duplicates:
```
🎲 Picked 5 places from master list.

Added:
• chipotle
• in-n-out

Already suggested (skipped):
• taco bell
• panda express
• subway

Current suggestions:
• taco bell
• chipotle
• in-n-out
• panda express
• subway
```

### Count parsing

- Parse `args` as integer. If invalid or missing, default to 5.
- Clamp to `Math.min(count, masterList.size)` — never exceed available.
- If count < 1, default to 5.

### File structure

```
src/
  commands/
    suggestfrommasterlist.ts  — handleSuggestFromMasterlist
  handlers.ts                 — add suggestfrommasterlist to KNOWN_COMMANDS + routeCommand
```

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Default count | 5 | Reasonable number for lunch voting; not too few, not too many |
| Shuffle algorithm | `Math.random()` | Simple, sufficient for lunch picking; no cryptographic needs |
| Duplicate handling | Skip silently | User wants variety; already-suggested places are noted in reply |
| Never fails | Reports partial success | Better UX than erroring when count > available |
| No slash command | app_mention only | Consistent with admin-style commands |

## Invariants

- Command never throws — always replies with a message.
- Duplicate places are skipped, not errored.
- Count is clamped to available places.

## Error Behavior

- Empty master list → "Master list is empty. Use @LunchSlackBot suggest <place> or seedmasterlist to add places."
- Round not started → "Lunch suggestions haven't started yet. Use @LunchSlackBot begin to start."
- Invalid count (e.g., `abc`, negative) → default to 5.
- Count exceeds available → pick all available, report actual count.

## Testing Strategy

- Unit test: picks 5 places by default.
- Unit test: respects custom count argument.
- Unit test: clamps count to available places.
- Unit test: skips duplicates and reports them.
- Unit test: handles empty master list.
- Unit test: prompts to begin when round not started.

## Out of Scope (Phase 7)

- Slash command equivalent.
- Weighted preferences (e.g., favor places voted more).
- Categorization filtering (e.g., "pick 3 Mexican places").
- Guaranteeing unique picks across multiple invocations.

---

