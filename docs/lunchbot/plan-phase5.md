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

