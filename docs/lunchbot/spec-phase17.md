# Phase 17: Admin Clear Suggestions Command

## What

Add `adminclearsuggestions` command to clear all suggestions for the current day.

## Context

Admins may need to reset suggestions (e.g., wrong places suggested, testing). `adminreset` clears everything including votes and poll state. This command only clears suggestions.

## Requirements

- Clears `today.suggestions` array
- Does not affect votes, master list, winners, or poll state
- Requires button confirmation (`action_id: confirm_clearsuggestions`)
- Hidden from help output
- No slash command equivalent

## Design

### Command flow

1. `@LunchSlackBot adminclearsuggestions`
2. If no round started → "Lunch suggestions haven't started yet."
3. If suggestions already empty → "No suggestions to clear."
4. Otherwise → confirmation button
5. On confirm → clear suggestions, update message "Suggestions cleared."

### Store function

- `clearSuggestions(): boolean` — clears `today.suggestions`, returns `true` if cleared, `false` if no round or already empty

### Confirmation

Uses existing `confirmations.ts` pattern with key `${userId}:${channelId}:clearsuggestions`, handled in `remove.ts` `handleBlockAction`.

## Decisions

| Decision | Rationale |
|---|---|
| Button confirmation | Prevents accidental clears |
| Hidden from help | Admin-only, discourages casual use |
| No slash command | Reduces surface area |
| Only clears suggestions | Votes, master list, winners untouched |

## Invariants

- `started` flag unchanged (round still active)
- `votingStarted` unchanged (if voting started, still started with empty suggestions)
- Master list, winners, votes preserved

## Error Behavior

- No round started → error message
- Already empty → info message, no confirmation

## Testing Strategy

- Clears suggestions when round active
- Returns error when no round started
- Returns info when already empty
- Confirmation button flow works
- Not in help output

## Out of Scope

- Confirmations for all admin commands (only this one)
- Slash command equivalent
