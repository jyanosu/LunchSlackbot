# Sync Poll Message After Suggestion Changes

## What

When suggestions are added, removed, or cleared during active voting, the live poll message (with vote buttons) is not updated. Users see stale buttons — missing new suggestions or showing removed ones.

## Context

- Suggestions can be mutated during voting: `suggest`, `remove`, `adminclearsuggestions` all allow operation when `votingStarted && !pollEnded`
- The poll message is posted by `vote` command with vote toggle buttons, its `ts` saved as `pollMessageTs` on `LunchDay`
- `handleVoteToggle` already has the pattern: rebuild blocks via `buildPollBlocks` → `client.chat.update(ts)`
- `buildPollBlocks` is exported from `vote.ts`
- `getClient()` will be exported from `src/app-context.ts` (new module, see Decisions) and returns the Bolt app's Slack client
- `CommandContext` does NOT include `client`; only block action handlers receive `client` from Bolt

## Requirements

1. After adding a suggestion during active voting, the poll message gains a new vote button
2. After removing a suggestion during active voting, its vote button is removed from the poll
3. After clearing all suggestions during active voting, the poll message is replaced with a "no suggestions" state
4. Existing votes for remaining suggestions are preserved
5. Expanded voter states (`getExpandedSuggestions`) are preserved across updates
6. If the saved poll message cannot be updated (e.g., deleted), a fresh poll is posted and timestamp saved

## Design

### Shared helper: `updatePollMessage`

Exported from `vote.ts`. Rebuilds poll blocks from current suggestions and updates the saved poll message.

```ts
export async function updatePollMessage(): Promise<void>
```

**Algorithm:**
1. Get today via `getToday()`. If no active voting (`!votingStarted` or `pollEnded`), return.
2. Get `pollMessageTs` from today. If missing, return (no poll to update).
3. Get channel from today — **decision needed**: store `channelId` on `LunchDay` when poll is posted (see Decisions).
4. Get client via `getClient()` from `app-context.ts`. If no client, return.
5. Get schedule via `getSchedule()` for end time text.
6. Build blocks via `buildPollBlocks(today.suggestions, undefined, client, getExpandedSuggestions())`.
7. If `suggestions.length === 0`, post a "no suggestions" section block instead.
8. Try `client.chat.update(channel, ts, text, blocks)`.
9. On failure (catch), post fresh poll via `client.chat.postMessage` and save new ts via `setPollMessageTs`.

### Integration points

**`src/commands/suggest.ts`** — after successful `addSuggestion` when `today.votingStarted`:
```ts
if (today.votingStarted) {
  const { updatePollMessage } = await import("./vote");
  await updatePollMessage();
}
```

**`src/commands/remove.ts`** — in `handleBlockAction` for `confirm_remove`, after successful `removeSuggestion`:
```ts
if (getToday()?.votingStarted && !getToday()?.pollEnded) {
  const { updatePollMessage } = await import("./vote");
  await updatePollMessage();
}
```

**`src/commands/remove.ts`** — in `handleBlockAction` for `confirm_clearsuggestions`, after `clearSuggestions`:
Same pattern as `confirm_remove` above (both handlers live in `remove.ts`).

### Store change: persist channel on LunchDay

`LunchDay` gets an optional `channelId?: string`. Set when poll is posted (`vote` command, `cron.ts` vote handler). Read by `updatePollMessage`.

Add to store:
```ts
export function setPollChannelId(channelId: string): void
```

Update callers in `vote.ts` (`handleVote`), `cron.ts` (`runVote`), and `showpoll.ts` (`handleShowpoll`) to call `setPollChannelId(channelId)` after posting.

## Decisions

1. **New module `src/app-context.ts`** holds `getClient()` and `setBoltApp`. Rationale: `cron.ts` already imports `buildPollBlocks` from `vote.ts` (static, line 14). Placing `getClient()` in `cron.ts` would create a circular dependency (`cron → vote → cron`). A dedicated context module breaks the cycle — both `cron.ts` and `vote.ts` import from it without cycling. Migrate the existing `setBoltApp`/`getClient` from `cron.ts` to `app-context.ts` and update `cron.ts` and `bot.ts` to import from the new module.

2. **Store `channelId` on `LunchDay`** instead of deriving from context. Rationale: `suggest`/`remove` handlers don't have guaranteed channel context (slash commands do, app_mention does, but the poll could have been posted by cron in a different channel). The poll's channel is the channel it was posted in.

3. **Best-effort update with fallback to fresh post**. If `chat.update` fails (message deleted, too old), post a new poll message and save the new ts. Log the fallback.

4. **Zero suggestions during voting** shows a section block: `No suggestions. Use @LunchSlackBot suggest <place> to add one.` instead of an empty actions array (which Slack would reject).

## Invariants

- `pollMessageTs` and `channelId` are set whenever the poll message is posted (manual vote, cron vote, and showpoll paths)
- `updatePollMessage` is a no-op when voting is not active (`!votingStarted` or `pollEnded`)
- `updatePollMessage` is a no-op when `pollMessageTs` is not set
- Existing votes are never cleared by poll updates (votes are keyed by `date:place` in store, independent of poll UI)
- `expandedSuggestions` state is preserved across updates (read from store, passed to `buildPollBlocks`)

## Error Behavior

| Scenario | Behavior |
|---|---|
| `getClient()` returns null | Log warning, skip update (poll stale until next interaction) |
| `chat.update` throws (message deleted) | Post fresh poll, save new ts, log fallback |
| `chat.postMessage` also fails | Log error, leave poll as-is (next vote toggle will still work) |
| Zero suggestions after clear | Show "no suggestions" section block in updated poll |
| `channelId` not set | Log warning, skip update (should not happen if invariant holds) |

## Testing Strategy

- **`suggest.test.ts`**: Add tests for "adds suggestion during voting" — verify `updatePollMessage` is called after successful add when `votingStarted` is true; verify it is NOT called when `votingStarted` is false
- **`remove.test.ts`**: Add tests for `handleBlockAction` `confirm_remove` during voting — verify poll update is triggered after successful removal
- **`vote.test.ts`**: Add tests for `updatePollMessage` — happy path (updates existing poll), fallback path (posts new on update failure), zero suggestions path, no-op when voting not started
- **`adminclearsuggestions.test.ts`**: Add test for `confirm_clearsuggestions` during voting — verify poll update triggered
- Mock `app-context.ts` (`getClient`), `buildPollBlocks`, `client.chat.update`, `client.chat.postMessage`

## Out of Scope

- Changing how `vote_toggle` works
- Real-time polling or WebSocket updates
- Updating the poll when votes are toggled (already works via `handleVoteToggle`)
- Cron-based poll syncing
- Changes to `suggestfrommasterlist` (can be added later with same pattern)
