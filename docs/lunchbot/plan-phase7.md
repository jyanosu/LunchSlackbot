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

---

