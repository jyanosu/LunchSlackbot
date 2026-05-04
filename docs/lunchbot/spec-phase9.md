# Phase 9 — End Poll, Winner Announcement & History

## What

End the voting poll, announce the winner with final results, and persist winners for history viewing.

## Context

- Phase 4: `vote` command starts voting, `vote_toggle` block action toggles votes.
- Phase 8: Channel announcements for begin/vote.
- `LunchDay` has `votingStarted` flag; no `pollEnded` flag yet.
- Votes stored as `Record<string, string[]>` keyed by `date:place`.
- `userNames` cache maps `userId → name`.
- Render filesystem is ephemeral; data persisted in `data/lunch.json`.
- Winners will persist in `data/winners.json` (survives deploys via git/backup, same pattern as existing store).

## Requirements

1. **`endpoll` command** — Ends voting, computes winner, posts final results announcement.
2. **Winner determination** — Highest vote count wins. Ties broken by random selection.
3. **Final announcement** — Posts to channel with results ordered by vote count (descending), ties by name (ascending). Shows winner prominently.
4. **Winner history** — Persist `{ date, place, voteCount, totalVotes }` in `data/winners.json`.
5. **`showhistory` command** — Display all past winners in reverse chronological order.
6. **Poll frozen after end** — No further voting or results updates allowed once poll ends. `handleVoteToggle` and `showpoll` both check `pollEnded` and reject.
7. **Slash commands** — `/lsb-endpoll`, `/lsb-showhistory`.

## Design

### Data model

```ts
// store.ts additions
interface LunchDay {
  // ... existing fields
  pollEnded?: boolean;  // true when endpoll executed
}

interface WinnerEntry {
  date: string;       // "2025-01-15"
  place: string;      // "Taco Bell"
  voteCount: number;  // number of votes the winner received
  totalVotes: number; // sum of all votes across all places
}

interface WinnerStore {
  winners: WinnerEntry[];  // array, append-only
}
```

### Store functions

```ts
// New in store.ts
export function setPollEnded(): void;           // sets pollEnded = true on today
export function getWinners(): WinnerEntry[];    // load winners.json, return array
export function addWinner(entry: WinnerEntry): void;  // append to winners, save
```

### End poll logic

In `commands/endpoll.ts`:

1. Validate: voting must have started (`today.votingStarted`), poll must not already be ended.
2. Compute results: for each suggestion, count votes from `getVotes(place).size`.
3. Sort results: descending by vote count, then ascending by place name for ties.
4. Pick winner: first entry in sorted list.
5. Save winner to history via `addWinner()`.
6. Mark poll as ended via `setPollEnded()`.
7. Post final announcement to channel via `say()`.

### Final announcement format

```
🥳 *Lunch is decided!*

🏆 *Taco Bell* — 5 votes

---

*Final results:*
1. 🏆 Taco Bell — 5 votes
2. Chipotle — 3 votes
3. Panda Express — 2 votes
```

For a tie (winner picked randomly):

```
🥳 *Lunch is decided!* (tiebreaker: random)

🏆 *Taco Bell* — 3 votes

---

*Final results:*
1. 🏆 Taco Bell — 3 votes
1. Chipotle — 3 votes
3. Panda Express — 1 vote
```

### Show history format

```
📋 *Lunch History*

2025-01-15: 🏆 Taco Bell (5 votes)
2025-01-14: 🏆 Chipotle (4 votes)
2025-01-13: 🏆 Panda Express (3 votes)
```

If no history:

```
📋 *Lunch History*

No winners yet. End a poll with @LunchSlackBot endpoll to start tracking.
```

### File structure

```
src/
  store.ts                  — add pollEnded, winners persistence
  commands/
    endpoll.ts              — endpoll handler
    endpoll.test.ts         — tests
    showhistory.ts          — showhistory handler
    showhistory.test.ts     — tests
```

### Slash commands

Register in `slash.ts`:
- `/lsb-endpoll` → calls `handleEndpoll`
- `/lsb-showhistory` → calls `handleShowHistory`

### Help output

Add entries:
- `endpoll (/lsb-endpoll)` — End voting and announce the winner
- `history (/lsb-showhistory)` — Show past lunch winners

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Command name | `endpoll` | Clear, matches `vote`/`showpoll` naming |
| Tiebreaker | Random | Fair when multiple places are tied |
| Winner history | Separate `winners.json` | Survives `adminreset` (preserved knowledge) |
| History in help | `history` (not `showhistory`) | Shorter, more natural |
| Poll ended flag | `pollEnded` on `LunchDay` | Prevents re-voting, re-ending |
| Results ordering | Vote count desc, name asc for ties | Winner first, then rest by popularity |
| Tie display | Same rank number for tied places | Clear visual signal of tie |
| adminreset behavior | Clears `pollEnded` (via clearing days) | New day = fresh state |
| adminreset preserves winners | Yes | Winners are accumulated history |

## Invariants

- Poll can only be ended once per day (`pollEnded` flag prevents re-execution).
- Winner is always the highest-voted place; ties broken randomly.
- Winners list is append-only (never cleared by `adminreset`, no pruning).
- Results are computed from actual vote data at time of `endpoll` (not cached).
- All suggestions appear in final results, even with 0 votes.
- `showpoll` rejects when poll ended (no stale poll reposting).
- `handleVoteToggle` returns early when poll ended (no further voting).

## Error Behavior

- No round started (`getToday()` undefined) → error: "Lunch suggestions haven't started yet. Use @LunchSlackBot begin to start."
- `endpoll` before voting started → error: "Voting hasn't started yet. Use @LunchSlackBot vote to begin voting."
- `endpoll` after already ended → error: "Poll has already ended for today."
- `endpoll` with no votes → still picks winner alphabetically (all tied at 0).
- `showpoll` after poll ended → error: "Poll has already ended for today."
- `handleVoteToggle` after poll ended → returns early silently (frozen).
- `showhistory` with no entries → shows empty state message.
- `winners.json` missing/corrupt → best-effort load, returns empty array.
- `addWinner` write fails → silently ignored (best-effort, same as existing store pattern).

## Testing Strategy

- Unit test: `setPollEnded` sets flag on today's `LunchDay`.
- Unit test: `getWinners` returns empty array when file missing.
- Unit test: `addWinner` appends entry and saves.
- Unit test: `endpoll` computes winner correctly (highest votes).
- Unit test: `endpoll` breaks tie alphabetically.
- Unit test: `endpoll` posts final announcement with ordered results.
- Unit test: `endpoll` rejects when no round started (getToday undefined).
- Unit test: `endpoll` rejects when voting not started.
- Unit test: `endpoll` rejects when poll already ended.
- Unit test: `endpoll` saves winner to history.
- Unit test: `endpoll` marks poll as ended.
- Unit test: `showhistory` displays winners in reverse chronological order.
- Unit test: `showhistory` shows empty state when no winners.
- Unit test: `showpoll` rejects when poll ended.
- Unit test: `handleVoteToggle` returns early when `pollEnded` is true.
- Unit test: slash command `/lsb-endpoll` routes to handler.
- Unit test: slash command `/lsb-showhistory` routes to handler.
- Unit test: `resetStore` preserves winners (not cleared).

## Out of Scope

- Automatic poll ending at deadline (future phase with scheduled time).
- Customizable winner announcement text.
- Deleting individual winner entries.
- Winner history pruning/archival (e.g., cap at 90 days — future phase).
- Exporting history to CSV/PDF.
- Slash command for `adminreset`.
