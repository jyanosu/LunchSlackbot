# LunchBot — Spec

## What

A Slack bot that collects lunch place suggestions, generates a poll, and lets team members vote. **Phase 1** delivers only the bot skeleton: when mentioned in a channel, it replies with its title "Lunchbot".

## Context

- Empty repo — no existing patterns to follow.
- Target platform: Slack (Bot User via Slack Bolt SDK).
- Phase 1 is a proof-of-concept / foundation. Polling and voting come in later phases.

## Requirements

1. Bot responds to `@Lunchbot` mention in any channel with a message containing the text **"Lunchbot"** as its title/heading.
2. Bot runs as a long-lived process (not serverless for Phase 1).
3. Configuration (Slack bot token, signing secret) is loaded from environment variables only — never committed.

## Design

- **Language:** TypeScript
- **Framework:** [Slack Bolt](https://slack.dev/bolt-js/) — official, well-maintained, handles OAuth and events out of the box.
- **Runtime:** Node.js 20+
- **Structure:**
  ```
  src/
    bot.ts          — entry point, Bolt app init, event handlers
  .env.example      — template for required env vars
  docs/
    lunchbot/
      spec.md       — this file
  ```

- **Event handler:** `app.event('app_mention', ...)` — triggers when someone types `@Lunchbot` in a channel.
- **Reply:** `say('🍱 *Lunchbot* — lunch suggestion bot')` sent to the originating channel.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Slack Bolt (Node) | Official SDK, simplifies event handling and verification |
| Config | `.env` via `dotenv` | Standard, keeps secrets out of source |
| Hosting | Render (Web Service) | Free tier, stable URL, env var support, auto-deploy from GitHub |
| Poll storage | TBD (Phase 2+) | Not in scope yet |

## Invariants

- Bot must never log or echo Slack tokens or secrets.
- Bot responds only to `app_mention` events in Phase 1 — no unsolicited messages.

## Error Behavior

- Missing `SLACK_BOT_TOKEN` or `SLACK_SIGNING_SECRET` → process exits with a clear error message.
- Unhandled Slack API errors → logged, bot stays alive.

## Testing Strategy (Phase 1)

- Unit test: `app_mention` handler replies with expected text (mock Bolt `say`).
- Manual: verify bot responds in a real Slack workspace via Render deployment.

## Out of Scope (Phase 1)

- Collecting lunch suggestions.
- Generating polls.
- Voting mechanism.
- Persistent storage.
- Slash commands (may add later).
