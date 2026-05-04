# Phase 5 — Master Suggestion List

## What

Maintain a persistent master list of all suggested lunch places across days. When a user suggests a place, it's added to the master list if not already present. Commands exist to view and manage the list. The master list enables a future feature where the bot randomly picks places to fill out the poll.

## Context

- Phase 2: `suggest` adds places to today's daily suggestions.
- Phase 4: voting on daily suggestions.
- Store persists `LunchStore` with `days` (keyed by date) + `votes` + `userNames`.
- Render filesystem is ephemeral — master list uses same in-memory + JSON backup pattern.
- Place names are case-insensitive for uniqueness checks.

## Requirements

1. **Master list** — A persistent `Set<string>` of all suggested places, shared across days.
2. **`suggest` integration** — When `suggest <place>` adds a place to today's suggestions, also add it to the master list if not already present.
3. **`@LunchSlackBot showmasterlist`** — Shows the master list as a numbered list. If empty, prompts the user to suggest a place.
4. **`@LunchSlackBot removefrommasterlist <place>`** — Removes `<place>` from the master list. Does **not** affect today's suggestions.
5. Slash commands:
   - `/lsb-showmasterlist` → `showmasterlist`
   - `/lsb-removefrommasterlist <place>` → `removefrommasterlist`
6. Uniqueness: master list entries are unique (case-insensitive). Suggesting a place already in the master list is a no-op for the master list (but may still add to today's suggestions if not already suggested today).

## Design

### Data model

Extend `LunchStore`:

```typescript
export interface LunchStore {
  days: Record<string, LunchDay>;
  votes: VoteStore;
  userNames: Map<string, string>;
  masterList: Set<string>;  // lowercase place names, unique
}
```

On JSON persist, `masterList` (Set) is converted to an array. On load, the array is converted back to a Set.

### Suggest integration

In `commands/suggest.ts`, after adding the place to today's suggestions:
1. Normalize the place name to lowercase.
2. Check if it exists in the master list.
3. If not, add it to the master list.
4. Save the store.

### Showmasterlist command

`@LunchSlackBot showmasterlist` → reply:
- If master list is empty: `No places in the master list yet. Use @LunchSlackBot suggest <place> to add one.`
- If populated: numbered list:
  ```
  📋 *Master Suggestion List* (${count} places):
  1. Taco Bell
  2. Chipotle
  3. In-N-Out
  ```

### RemoveFromMasterlist command

`@LunchSlackBot removefrommasterlist <place>` → reply:
- If place not found in master list: `*<place>* is not in the master list.`
- If found: remove and reply: `Removed *<place>* from the master list.`

### Slash command mapping

| Slash command | Command name | Args |
|---|---|---|
| `/lsb-showmasterlist` | `showmasterlist` | none |
| `/lsb-removefrommasterlist` | `removefrommasterlist` | `body.text ?? ''` (place name) |

### File structure

```
src/
  store.ts              — add masterList to LunchStore
  commands/
    suggest.ts          — add to master list on suggest
    showmasterlist.ts   — handleShowmasterlist
    removefrommasterlist.ts — handleRemoveFromMasterlist
  handlers.ts           — add showmasterlist, removefrommasterlist to KNOWN_COMMANDS + routeCommand
  slash.ts              — add /lsb-showmasterlist, /lsb-removefrommasterlist
```

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Uniqueness | Case-insensitive | "taco bell" and "Taco Bell" are the same place |
| Storage | In-memory Set + JSON backup | Matches existing store pattern |
| Remove scope | Master list only | Today's suggestions are separate; removing from master list doesn't affect active polls |
| Display format | Numbered list | Consistent with `list` command |

## Invariants

- Master list entries are unique (case-insensitive).
- Adding a place to the master list is idempotent.
- Removing from the master list does not affect today's suggestions.
- `suggest` always adds to the master list (unless already present).

## Error Behavior

- `showmasterlist` with empty list → "No places in the master list yet. Use @LunchSlackBot suggest <place> to add one."
- `removefrommasterlist` with no place → "Usage: @LunchSlackBot removefrommasterlist <place>"
- `removefrommasterlist` with unknown place → "*<place>* is not in the master list."

## Testing Strategy

- Unit test: `suggest` adds new place to master list.
- Unit test: `suggest` skips master list add when place already exists.
- Unit test: `showmasterlist` shows numbered list / empty message.
- Unit test: `removefrommasterlist` removes place / rejects unknown place.
- Unit test: store masterList persistence (Set ↔ array conversion).
- Unit test: slash commands route correctly.

## Out of Scope (Phase 5)

- Randomly picking places from the master list (future phase).
- Categorizing places (e.g., Mexican, Asian).
- Rating or ranking places.
- Importing places from external sources.

---

