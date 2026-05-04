# Phase 12 Plan — Expandable Voter List

## Tasks

### P12-1: Store expanded state

Add `expandedSuggestions: string[]` to `LunchDay` (array for JSON), with `getExpandedSuggestions()` returning `Set<string>`, `setExpandedSuggestions()`, and toggle function. Persist in `data/lunch.json`.

**Deliverables:**
- `src/store.ts` — expanded state on LunchDay
- `src/store.test.ts` — expanded state tests

**Tests:** 4+

### P12-2: `?` button + expand handler

Update `buildPollBlocks` to accept `expandedSuggestions`, add `?` button when votes > 0, show voter section when expanded. Create `handleExpandVoters` for `action_id: expand_voters`. Register handler in `bot.ts`.

**Deliverables:**
- `src/commands/vote.ts` — `?` button, voter section when expanded
- `src/commands/expandvoters.ts` — new handler
- `src/bot.ts` — register handler
- `src/commands/vote.test.ts` — button presence, voter section tests

**Tests:** 5+

---

## Dependency graph

```
P12-1 → P12-2
```

## Shared decisions

- State: `expandedSuggestions` on `LunchDay`, array for JSON, Set in-memory
- Button: `?` in same `actions` block as vote toggle
- Handler: `handleExpandVoters` toggles state, rebuilds poll, `chat.update`
