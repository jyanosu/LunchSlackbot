# Phase 4 — Voting Plan

Shared decisions (from spec): Manual `vote` command triggers voting, suggestions frozen at vote start, single toggle button per suggestion with voter usernames listed below, in-memory vote store + JSON backup, `showpoll` reposts poll and updates `pollMessageTs`.

---

## Task P4-1 — Extend store with voting support

**Goal:** Add vote storage and voting state to the existing store.

**Context:** `LunchDay` tracks suggestions and deadline. Need to track votes and whether voting has started.

**Proposed Approach:**
- Extend `LunchDay` in `src/store.ts`:
  - `votingStarted: boolean`
  - `pollMessageTs?: string`
- Add vote store:
  - `getVotes(place: string): Set<string>` — returns set of user IDs who voted for a place
  - `toggleVote(place: string, userId: string): boolean` — toggles vote, returns true if voted, false if unvoted
  - `hasVoted(place: string, userId: string): boolean` — checks if user voted for a place
  - `getUserNames(): Map<string, string>` — returns cached userId → name map
  - `setUserName(userId: string, name: string): void` — caches a user name
- Votes persisted to `data/lunch.json` alongside daily data (Sets → arrays on save, arrays → Sets on load).
- User name cache persisted alongside votes.
- Create `src/store.test.ts` tests for vote operations.

**Acceptance Criteria:**
- `toggleVote` flips vote state correctly.
- `hasVoted` returns correct state.
- Votes persist to JSON and reload on startup.
- All existing tests pass.

**Spec:** full (`docs/lunchbot/spec.md` § Phase 4 Design → Data model).

**Verify:**
```
npm test -- store
npm run build
```

---

## Task P4-2 — Vote command + poll message

**Goal:** `vote` command starts voting and posts the poll message with toggle buttons.

**Context:** Store supports voting (Task P4-1). Need the command handler and poll message builder.

**Proposed Approach:**
- Create `src/commands/vote.ts`:
  - `handleVote` — checks voting not already started, checks suggestions exist, sets `votingStarted = true`, posts announcement to channel ("Voting is open! Deadline: ..."), posts poll message with buttons + voter username lists, saves `pollMessageTs`
  - Poll message builder: block kit layout per suggestion — `header` (name + count) → `actions` (toggle button) → `section` (voter list)
  - Resolve user IDs to names via `client.users.info(userId)`, cache in store, fall back to userId on failure
- Add `vote` to `handlers.ts` `KNOWN_COMMANDS` + `routeCommand`.
- Add slash command `/lsb-vote` in `slash.ts`.
- Update help output: `vote (/lsb-vote)`.
- Create `src/commands/vote.test.ts`:
  - Posts poll with correct buttons
  - Rejects when already started
  - Rejects when no suggestions
- Update `slash-commands-manifest.json` with `/lsb-vote`.
- Update `docs/lunchbot/README.md` commands table.

**Acceptance Criteria:**
- `vote` posts poll message with one button per suggestion.
- `vote` rejects when voting already started or no suggestions.
- New suggestions after voting starts are stored but not added to the poll.
- Slash command `/lsb-vote` works.
- Help output includes `vote (/lsb-vote)`.
- All existing tests pass.

**Spec:** full (`docs/lunchbot/spec.md` § Phase 4 Requirements #1-5, Design → Poll announcement message).

**Verify:**
```
npm test -- vote
npm run build
```

---

## Task P4-3 — Vote toggle handler

**Goal:** Handle `vote_toggle` block actions to toggle votes and update poll message.

**Context:** Poll message posted with buttons (Task P4-2). Need `block_actions` handler for `vote_toggle`.

**Proposed Approach:**
- In `src/commands/vote.ts`, add `handleVoteToggle`:
  - Extract place name from button value
  - Toggle vote in store
  - Resolve clicker's user ID to name (cache if needed)
  - Rebuild poll message with updated button states, vote counts, and voter username lists
  - `client.chat.update` the poll message using `pollMessageTs`
- Register in `bot.ts`: `app.action('vote_toggle', handleVoteToggle)`
- Create `src/commands/vote.test.ts` tests:
  - Toggle vote flips state
  - Poll message updated with new button labels and voter lists
  - Missing fields returns early

**Acceptance Criteria:**
- Clicking vote button toggles vote and updates message.
- Button label shows user's own state (✅ voted / ☐ not voted).
- Voter usernames listed below each suggestion are updated.
- Stale button clicks (unknown place) return early silently.
- All existing tests pass.

**Spec:** full (`docs/lunchbot/spec.md` § Phase 4 Design → Vote toggle handler).

**Verify:**
```
npm test -- vote
npm run build
```

---

## Task P4-4 — Showpoll command

**Goal:** `showpoll` command reposts the poll message with current vote states.

**Context:** Voting is active (Task P4-2). Users need to see the poll if it scrolled off screen.

**Proposed Approach:**
- Create `src/commands/showpoll.ts`:
  - `handleShowpoll` — checks voting started, checks suggestions exist, posts new poll message with current vote states, updates `pollMessageTs`
- Add `showpoll` to `handlers.ts` `KNOWN_COMMANDS` + `routeCommand`.
- Add slash command `/lsb-showpoll` in `slash.ts`.
- Update help output: `showpoll (/lsb-showpoll)`.
- Create `src/commands/showpoll.test.ts`:
  - Reposts poll with current state
  - Rejects when voting not started
- Update `slash-commands-manifest.json` with `/lsb-showpoll`.
- Update `docs/lunchbot/README.md` commands table.

**Acceptance Criteria:**
- `showpoll` posts poll message with current vote states.
- `showpoll` rejects when voting not started.
- Slash command `/lsb-showpoll` works.
- Help output includes `showpoll (/lsb-showpoll)`.
- All existing tests pass.

**Spec:** full (`docs/lunchbot/spec.md` § Phase 4 Requirements #6-7, Design → Showpoll command).

**Verify:**
```
npm test -- showpoll
npm run build
```

---

## Task P4-5 — Deploy + configure

**Goal:** Deploy to Render, add new slash commands to Slack app.

**Context:** Code complete. Need to deploy and register `/lsb-vote` and `/lsb-showpoll`.

**Proposed Approach:**
- Push to GitHub, Render auto-deploys.
- Add `/lsb-vote` and `/lsb-showpoll` to Slack app (Slash Commands or manifest).
- Reinstall app.

**Acceptance Criteria:**
- Deploy succeeds on Render.
- New slash commands work in Slack.

**Verify:**
```
# Manual: test /lsb-vote and /lsb-showpoll in Slack
```

---

## Dependency order

```
P4-1 (store) → P4-2 (vote command) → P4-3 (vote toggle)
                                        ↓
                                  P4-4 (showpoll)
                                        ↓
                                  P4-5 (deploy)
```

Sequential — each task depends on the previous.

---

