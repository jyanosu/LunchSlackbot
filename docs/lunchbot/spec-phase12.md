# Phase 12 — Expandable Voter List

## What

Replace the always-visible voter list under each poll option with a `?` button that appears only when there is at least one vote. Clicking `?` expands the poll to show voter names beneath that option. Clicking again collapses it.

## Context

- Current poll layout per suggestion: `actions` (toggle button) → voter list removed in previous attempt
- Slack buttons are shared across viewers (can't show per-user state in labels)
- Poll message is updated in-place via `chat.update` with `pollMessageTs`
- Single `action_id: vote_toggle` handles vote toggling
- Need a second `action_id` for expand/collapse

## Requirements

1. **`?` button** — Small button labeled `?` next to the vote toggle button. Visible only when `voteCount > 0`.
2. **Expand on click** — Clicking `?` rebuilds the poll with voter names shown under that option.
3. **Collapse on click** — Clicking `?` again hides the voter list.
4. **Per-option state** — Each option independently tracks whether its voter list is expanded.
5. **Toggle button unchanged** — Vote toggle button works as before, side-by-side with `?`.

## Design

### Block layout per suggestion

```
actions: [vote toggle button, ? button (if votes > 0)]
section: voter names (only when expanded)
```

### Expanded state

Store `expandedSuggestions: Set<string>` on `LunchDay` to track which suggestions have their voter list expanded. Persists in `data/lunch.json`.

### New action

`action_id: expand_voters` with `value: <place>` identifies which suggestion to expand/collapse.

Handler: toggle the place in `expandedSuggestions`, rebuild poll blocks, `chat.update`.

### Button layout

Two buttons in one `actions` block:
- `✅ Taco Bell (3)` — vote toggle (always visible)
- `?` — expand voters (visible only when votes > 0)

### Poll rebuild

Both `vote_toggle` and `expand_voters` handlers rebuild the full poll via `buildPollBlocks` and update in-place. `buildPollBlocks` accepts `expandedSuggestions` to know which voter lists to show.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| State tracking | `expandedSuggestions` on `LunchDay` | Persists across updates, same pattern as votes |
| Button label | `?` | Minimal, clear intent |
| Two buttons per row | Same `actions` block | Compact, related actions |
| Collapse behavior | Toggle (click again to hide) | User control, no auto-collapse |
| Expand survives vote toggle | Yes | Independent states |

## Invariants

- `?` button only appears when `voteCount > 0`.
- Expanded state is per-option, independent of vote state.
- Poll message is always consistent with store state after update.

## Error Behavior

- Unknown place in `expand_voters` value: skip silently.
- Poll message update fails: log error, do not crash.

## Testing Strategy

- Unit: `?` button present when votes > 0, absent when votes = 0
- Unit: `expand_voters` handler toggles expanded state
- Unit: expanded voter list shown in blocks when expanded
- Unit: expanded state persists across poll rebuilds

## Out of Scope

- Auto-collapse when vote count changes
- Threading voter details
- Anonymous voting mode
