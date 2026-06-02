# Plan: Sync Poll Message After Suggestion Changes

## Shared Decisions

- **`src/app-context.ts`** (new module) holds `getClient()` and `setBoltApp` — migrated from `cron.ts` to avoid circular dependency with `vote.ts`
- **`cron.ts`** and **`vote.ts`** both import from `app-context.ts` without cycling
- **`channelId` stored on `LunchDay`** — the poll's channel, set when voting starts (manual or cron)
- **Best-effort update with fallback** — if `chat.update` fails, post fresh poll and save new ts
- **Zero suggestions** shows a section block, not empty actions (Slack rejects empty actions arrays)

---

## Task 1: Store + `updatePollMessage` helper + poll posting sites

**Goal:** Add the plumbing (store field, helper function) and wire it into both poll-creation paths so `channelId` and `pollMessageTs` are always set together.

**Context:** `LunchDay` already has `pollMessageTs` but no `channelId`. `updatePollMessage` is the core helper all mutation integrations will call. `vote.ts` (`handleVote`) and `cron.ts` (`runVote`) are the two paths that create the poll message.

**Proposed Approach:**

1. `src/app-context.ts` — new module: migrate `setBoltApp` and `getClient` from `cron.ts`; export both
2. `src/cron.ts` — replace `import { setBoltApp } from ...` / local `setBoltApp`/`getClient` with imports from `app-context.ts`
3. `src/bot.ts` — update `setBoltApp` import to use `app-context.ts`
4. `src/store.ts` — add `channelId?: string` to `LunchDay`, add `setPollChannelId(channelId: string)`
5. `src/commands/vote.ts` — export `updatePollMessage()` implementing the spec algorithm; call `setPollChannelId(channelId)` in `handleVote` after posting poll
6. `src/cron.ts` — call `setPollChannelId(channelId)` in `runVote` after posting poll
7. `src/commands/showpoll.ts` — call `setPollChannelId(channelId)` alongside existing `setPollMessageTs` call
8. `src/store.test.ts` — add test for `setPollChannelId`
9. `src/commands/vote.test.ts` — add tests for `updatePollMessage`: happy path (updates existing poll), fallback path (posts new on update failure), zero suggestions path, no-op when voting not started, no-op when pollMessageTs missing, no-op when channelId missing

**Acceptance Criteria:**
- `setPollChannelId` persists `channelId` on today's `LunchDay`
- `updatePollMessage` rebuilds poll blocks and updates the saved message ts
- `updatePollMessage` falls back to fresh post when update fails
- `updatePollMessage` is a no-op when voting not active, ts missing, channel missing, or client missing
- `handleVote`, `runVote`, and `handleShowpoll` all set `channelId` when posting the poll
- `app-context.ts` exports `getClient()` and `setBoltApp`; `cron.ts` imports from it (no circular dependency)
- All existing tests pass

**Spec:** `full` — `docs/lunchbot/spec-sync-poll-after-mutation.md`

**Verify:**
```bash
npm run build && npm test
```

**Out of Scope:**
- Mutation command integrations (`suggest`, `remove`, `adminclearsuggestions`) — Task 2
- Changes to `handleVoteToggle` or `handleExpandVoters`

---

## Task 2: Wire poll sync into mutation commands

**Goal:** Call `updatePollMessage()` after every suggestion mutation during active voting, so the live poll stays in sync.

**Context:** Three mutation points need wiring: `suggest.ts` (app_mention/slash), `remove.ts` block action (`confirm_remove`), and `adminclearsuggestions.ts` block action (`confirm_clearsuggestions`). All use the same pattern: check `votingStarted && !pollEnded`, then call `updatePollMessage()` via dynamic import.

**Proposed Approach:**

1. `src/commands/suggest.ts` — after successful `addSuggestion`, if `today.votingStarted`, call `updatePollMessage()`
2. `src/commands/remove.ts` — in `handleBlockAction` for `confirm_remove`, after successful removal, if voting active, call `updatePollMessage()`
3. `src/commands/remove.ts` — in `handleBlockAction` for `confirm_clearsuggestions`, after `clearSuggestions()`, if voting active, call `updatePollMessage()`
4. `src/commands/suggest.test.ts` — add test: calls `updatePollMessage` when `votingStarted`; add test: does NOT call when `votingStarted` is false
5. `src/commands/remove.test.ts` — add test: `confirm_remove` triggers poll update during active voting; add test: `confirm_clearsuggestions` triggers poll update during active voting

**Acceptance Criteria:**
- Adding a suggestion during voting triggers poll message update
- Adding a suggestion before voting does NOT trigger poll update
- Removing a suggestion via button confirmation during voting triggers poll update
- Clearing suggestions via button confirmation during voting triggers poll update
- All existing tests pass

**Spec:** `full` — `docs/lunchbot/spec-sync-poll-after-mutation.md`

**Verify:**
```bash
npm run build && npm test
```

**Out of Scope:**
- `suggestfrommasterlist` — can be added later with same pattern
- Error handling beyond what `updatePollMessage` already covers
