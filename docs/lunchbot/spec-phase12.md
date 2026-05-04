# Phase 12 — Hide Voter List, Show on Hover

## What

Remove the voter name list displayed under each poll option. Show voter names in a Slack confirm dialog when the button is clicked (before toggling the vote).

## Context

- Current poll layout per suggestion: `actions` (toggle button) → `section` (voter names)
- Slack buttons have no native hover support
- Slack `confirm` field on buttons shows a modal dialog with optional text
- Button `value` is plain text (max 75 chars), used to identify the suggestion
- `action_id: vote_toggle` identifies the handler

## Requirements

1. **Remove voter list section** — No more "— Alice, Bob" under buttons.
2. **Confirm dialog** — Clicking a vote button shows a confirm dialog with:
   - Title: "Vote for <place>?"
   - Text: Vote count + voter names (if any)
   - Confirm label: "Vote"
   - Deny label: "Cancel"
3. **Toggle on confirm only** — Vote toggles only when user clicks "Vote" in the dialog.
4. **Count still visible** — Button text shows `✅ Taco Bell (3)` as before.

## Design

### Confirm field on button

```typescript
{
  type: "button",
  text: { type: "plain_text", text: `${buttonIcon} ${place} (${voteCount})` },
  value: place,
  action_id: "vote_toggle",
  confirm: {
    title: { type: "plain_text", text: `Vote for ${place}?` },
    text: { type: "mrkdwn", text: voterText },
    confirm_text: { type: "plain_text", text: "Vote" },
    deny_text: { type: "plain_text", text: "Cancel" },
  },
}
```

### Voter text in dialog

- `voteCount > 0`: `*${voteCount} vote(s)* — ${voterNames}`
- `voteCount === 0`: `No votes yet. Be the first!`

### Handler behavior

- `handleVoteToggle` receives the action regardless of confirm/deny (Slack sends the action on confirm; deny sends nothing)
- No change to handler logic — it already toggles on button click

### Removed blocks

The `section` block with voter names is removed from `buildPollBlocks`.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Hover mechanism | Confirm dialog | Slack has no hover; confirm is closest |
| Toggle on confirm | Yes | User explicitly confirms their vote |
| Deny behavior | No action | Slack doesn't send action on deny |
| Voter text in dialog | mrkdwn | Supports bold count |
| Button value | Unchanged | Already identifies suggestion |

## Invariants

- Vote count in button text always matches actual votes.
- Confirm dialog always shows current voter list (rebuilt on each poll update).
- Denying the dialog does not toggle the vote.

## Error Behavior

- Voter names unavailable: show user ID (same as before).
- Confirm dialog text exceeds 75 chars: Slack truncates (no action needed).

## Testing Strategy

- Unit: `buildPollBlocks` does not include voter section blocks
- Unit: button includes `confirm` field with correct voter text
- Unit: button text still shows count

## Out of Scope

- Anonymous voting mode
- Collapsible voter list
- Separate "view voters" button
