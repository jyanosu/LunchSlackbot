# Phase 9 Plan — End Poll, Winner Announcement & History

Shared decisions (from spec): `endpoll` command ends voting and announces winner, ties broken alphabetically ascending, winners persist in `data/winners.json` (append-only, survives `adminreset`), `pollEnded` flag on `LunchDay` freezes voting, `history` command shows past winners reverse-chronological.

---

## Task P9-1: Extend store with pollEnded and winners persistence

**Goal:** Add `pollEnded` flag to `LunchDay` and winners persistence layer.

**Context:**
- `store.ts` has `LunchDay` with `votingStarted`, `pollMessageTs`
- Store persists to `data/lunch.json` via `saveStore()`
- `loadStore` handles JSON seeding with best-effort error handling
- Winners persist separately in `data/winners.json` (survives `adminreset`)

**Proposed Approach:**
- Add `pollEnded?: boolean` to `LunchDay` interface
- Add `setPollEnded(): void` — sets `pollEnded = true` on today's `LunchDay`, saves
- Create `WinnerEntry` interface: `{ date, place, voteCount, totalVotes }`
- Create `WinnerStore` interface: `{ winners: WinnerEntry[] }`
- Add `getWinners(): WinnerEntry[]` — load `data/winners.json`, return array (empty if missing/corrupt)
- Add `addWinner(entry: WinnerEntry): void` — append to winners array, save to `data/winners.json`
- In `resetStore()`, do **not** clear winners (they are preserved)
- Create `src/store.test.ts` tests:
  - `setPollEnded` sets flag on today's `LunchDay`
  - `getWinners` returns empty array when file missing
  - `getWinners` returns entries from file
  - `addWinner` appends entry and saves
  - `resetStore` preserves winners (not cleared)

**Acceptance Criteria:**
- `setPollEnded` marks today's poll as ended and persists
- `getWinners` loads winners from JSON, returns empty array on missing/corrupt file
- `addWinner` appends entry and persists
- `resetStore` does not clear winners
- All existing tests pass

**Spec:** `none` (defined in spec.md Phase 9)

**Verify:** `npm run build && npm test`

**Out of Scope:**
- Winner deletion
- Winner querying by date

---

## Task P9-2: Create endpoll command with winner announcement

**Goal:** `endpoll` command ends voting, computes winner, posts final results, saves winner to history.

**Context:**
- Store has `pollEnded`, `getWinners`, `addWinner`, `setPollEnded` from P9-1
- `getVotes(place)` returns Set of userIds for a place
- `getToday()` returns `LunchDay` with `suggestions`, `votingStarted`, `pollEnded`
- `commands/` has one file per command, routed via `handlers.ts`
- `handleVoteToggle` in `vote.ts` needs to check `pollEnded` to freeze voting

**Proposed Approach:**
- Create `commands/endpoll.ts`:
  - Validate: `today` exists (no round started → error), voting started, poll not already ended
  - Compute results: for each suggestion, count votes via `getVotes(place).size`
  - Sort results: descending by vote count, ascending by place name for ties
  - Pick winner: first entry in sorted list
  - Compute totalVotes: sum of all vote counts
  - Save winner via `addWinner({ date, place, voteCount, totalVotes })`
  - Mark poll ended via `setPollEnded()`
  - Post final announcement via `say()` with ordered results
  - Announcement format (see spec): winner prominently, then numbered results
  - Tie display: same rank number for tied places, note "(tiebreaker: alphabetical)"
  - Add `endpoll` to `KNOWN_COMMANDS` + `routeCommand` in `handlers.ts`
- In `commands/vote.ts` `handleVoteToggle`:
  - Add check: if `today.pollEnded`, return early (freeze voting)
- In `commands/showpoll.ts`:
  - Add check: if `today.pollEnded`, reject with "Poll has already ended for today."
- Create `commands/endpoll.test.ts`:
  - Computes winner correctly (highest votes)
  - Breaks tie alphabetically
  - Posts final announcement with ordered results
  - Rejects when no round started (getToday undefined)
  - Rejects when voting not started
  - Rejects when poll already ended
  - Saves winner to history
  - Marks poll as ended
  - All suggestions appear in results (even with 0 votes)
  - Tie shows same rank number
  - Tie shows "(tiebreaker: alphabetical)" in header
- Update `handleVoteToggle` test to check `pollEnded` freeze
- Update `showpoll` test to check `pollEnded` rejection

**Acceptance Criteria:**
- `endpoll` computes winner correctly (highest vote count)
- `endpoll` breaks ties alphabetically (ascending)
- `endpoll` posts final announcement with results ordered by votes desc, name asc
- `endpoll` saves winner to history
- `endpoll` marks poll as ended
- `endpoll` rejects when no round started
- `endpoll` rejects when voting not started
- `endpoll` rejects when poll already ended
- `handleVoteToggle` returns early when poll ended
- `showpoll` rejects when poll ended
- All existing tests pass

**Spec:** `none` (defined in spec.md Phase 9)

**Verify:** `npm run build && npm test`

**Out of Scope:**
- Slash command equivalent (added in P9-3)
- History viewing (added in P9-3)
- Automatic poll ending at deadline

---

## Task P9-3: Create showhistory command + slash commands + help

**Goal:** `showhistory` command displays past winners, slash commands for both commands, help update.

**Context:**
- Store has `getWinners()` from P9-1
- `commands/` has one file per command
- `handlers.ts` routes commands via `routeCommand`
- `slash.ts` registers slash commands
- `help.ts` lists available commands

**Proposed Approach:**
- Create `commands/showhistory.ts`:
  - Load winners via `getWinners()`
  - Sort reverse-chronologically (newest first)
  - Display: `📋 *Lunch History*\n\n<date>: 🏆 <place> (<votes> votes)`
  - Empty state: `📋 *Lunch History*\n\nNo winners yet. End a poll with @LunchSlackBot endpoll to start tracking.`
- Add `showhistory` to `KNOWN_COMMANDS` + `routeCommand` in `handlers.ts`
- Add slash commands in `slash.ts`:
  - `/lsb-endpoll` → `routeCommand('endpoll', { args: '' })`
  - `/lsb-showhistory` → `routeCommand('showhistory', { args: '' })`
- Update `help.ts`:
  - `endpoll (/lsb-endpoll)` — End voting and announce the winner
  - `history (/lsb-showhistory)` — Show past lunch winners
- Update `slash-commands-manifest.json` with new commands
- Update `README.md` + `docs/lunchbot/README.md` commands table
- Create `commands/showhistory.test.ts`:
  - Displays winners in reverse chronological order
  - Shows empty state when no winners
- Update `slash.test.ts`:
  - `/lsb-endpoll` routes to handler
  - `/lsb-showhistory` routes to handler

**Acceptance Criteria:**
- `showhistory` displays winners in reverse chronological order
- `showhistory` shows empty state when no winners
- Slash commands `/lsb-endpoll` and `/lsb-showhistory` route correctly
- Help output includes `endpoll` and `history` entries
- All existing tests pass

**Spec:** `none` (defined in spec.md Phase 9)

**Verify:** `npm run build && npm test`

**Out of Scope:**
- Deleting individual winner entries
- Exporting history

---

## Dependency Graph

```
P9-1 (store: pollEnded + winners)
  ↓         ↓
P9-2       P9-3
(endpoll  (showhistory
 + freeze) + slash cmds
           + help)
```

P9-1 is first (store functions needed by both). P9-2 and P9-3 run in parallel — P9-3 only needs `getWinners()` from P9-1, not P9-2's endpoll command.
