# LunchBot

Slack bot for lunch place suggestions and voting.

## Setup

Full Slack app setup instructions (OAuth scopes, events, interactivity, slash commands): **[docs/lunchbot/README.md](docs/lunchbot/README.md)**

Quick start:

1. Copy `.env.example` to `.env` and fill in your Slack credentials:
   ```
   cp .env.example .env
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build:
   ```
   npm run build
   ```

4. Start:
   ```
   npm start
   ```

## Commands

| Command | Slash | Description |
|---|---|---|
| `@LunchSlackBot begin` | `/lsb-begin` | Start the lunch poll |
| `@LunchSlackBot suggest <place>` | `/lsb-suggest` | Add a lunch place |
| `@LunchSlackBot suggestiondeadline <time>` | `/lsb-deadline` | Set suggestion deadline |
| `@LunchSlackBot remove <place>` | `/lsb-remove` | Remove a suggestion |
| `@LunchSlackBot list` | `/lsb-list` | Show today's suggestions |
| `@LunchSlackBot help` | `/lsb-help` | Show help |

## Render Deployment

1. Push this repo to GitHub.
2. On [Render](https://render.com), create a **Web Service** from your repo.
3. Set these environment variables in the Render dashboard:
   - `SLACK_BOT_TOKEN`
   - `SLACK_SIGNING_SECRET`
4. Deploy settings:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node dist/bot.js`
   - (or use the `Procfile` — Render detects it automatically)
5. In your Slack App settings, set **Request URL** to:
   `https://your-app-name.onrender.com/slack/events`

## Scripts

| Command | Description |
|---|---|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the bot (production) |
| `npm run dev` | Run with ts-node (auto-reload) |
| `npm test` | Run tests |
