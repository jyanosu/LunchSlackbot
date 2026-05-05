# LunchBot

Slack bot for lunch place suggestions and voting.

## Setup

Full Slack app setup instructions: **[docs/lunchbot/README.md](docs/lunchbot/README.md)**

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

### Installing Slash Commands

Slash commands must be registered in your Slack app dashboard. Two options:

**Option A — JSON Manifest (recommended):**
1. Open your Slack app at [api.slack.com/apps](https://api.slack.com/apps)
2. Go to **Settings** → **App JSON Manifest**
3. Copy the `slash_commands` array from [`docs/lunchbot/slash-commands-manifest.json`](docs/lunchbot/slash-commands-manifest.json)
4. Paste it into the manifest's `slash_commands` field
5. Set each command's **Request URL** to: `https://your-app-name.onrender.com/slack/events`

**Option B — Manual:**
1. Go to **Slash Commands** in your Slack app dashboard
2. Click **Create New Command** for each `/lsb-*` command
3. Set **Request URL** to: `https://your-app-name.onrender.com/slack/events`
4. After adding commands, **reinstall** the app to your workspace

## Commands

| Command | Slash | Description |
|---|---|---|
| `@LunchSlackBot begin` | `/lsb-begin` | Start the lunch poll |
| `@LunchSlackBot suggest <place>` | `/lsb-suggest` | Add a lunch place |
| `@LunchSlackBot suggestiondeadline <time>` | `/lsb-deadline` | Set suggestion deadline |
| `@LunchSlackBot remove <place>` | `/lsb-remove` | Remove a suggestion |
| `@LunchSlackBot list` | `/lsb-list` | Show today's suggestions |
| `@LunchSlackBot vote` | `/lsb-vote` | Start voting on suggestions |
| `@LunchSlackBot showpoll` | `/lsb-showpoll` | Show the current poll |
| `@LunchSlackBot endpoll` | `/lsb-endpoll` | End voting, announce winner |
| `@LunchSlackBot history` | `/lsb-showhistory` | Show past winners |
| `@LunchSlackBot showmasterlist` | `/lsb-showmasterlist` | Show master suggestion list |
| `@LunchSlackBot removefrommasterlist <place>` | `/lsb-removefrommasterlist` | Remove from master list |
| `@LunchSlackBot seedmasterlist` | `/lsb-seedmasterlist` | Seed master list with 20 places |
| `@LunchSlackBot suggestfrommasterlist [n]` | `/lsb-suggestfrommasterlist` | Suggest N random places from master list |
| `@LunchSlackBot schedulebegin <time>` | `/lsb-schedulebegin` | Set scheduled begin time |
| `@LunchSlackBot schedulevote <time>` | `/lsb-schedulevote` | Set scheduled vote time |
| `@LunchSlackBot scheduleend <time>` | `/lsb-scheduleend` | Set scheduled end time |
| `@LunchSlackBot schedule` | `/lsb-schedule` | Show schedule config |
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
