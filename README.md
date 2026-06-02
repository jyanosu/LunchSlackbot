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
5. Set each command's **Request URL** to: `https://<your-server>/slack/events`

**Option B — Manual:**
1. Go to **Slash Commands** in your Slack app dashboard
2. Click **Create New Command** for each `/lsb-*` command
3. Set **Request URL** to: `https://<your-server>/slack/events`
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
| `@LunchSlackBot scheduledays <days>` | `/lsb-scheduledays` | Set which days the schedule runs |
| `@LunchSlackBot prune [days]` | `/lsb-prune` | Set prune retention period (default 120 days, min 7) |
| `@LunchSlackBot schedule` | `/lsb-schedule` | Show schedule config |
| `@LunchSlackBot help` | `/lsb-help` | Show help |

## Scheduling

The bot runs on a daily schedule by default. Configure it with:

| Command | Example | Description |
|---|---|---|
| `schedulebegin <time>` | `9:00 AM` | When suggestions open |
| `schedulevote <time>` | `10:30 AM` | When voting opens |
| `scheduleend <time>` | `11:15 AM` | When voting closes, winner announced |
| `scheduledays <days>` | `2-3` | Which days to run (cron format) |
| `prune [days]` | `90` | Set prune retention period (default 120, min 7) |
| `schedule` | — | Show current config |
| `schedule enable` | — | Enable schedule |
| `schedule disable` | — | Disable schedule |

**Days** (cron day-of-week): `*` = every day, `0`/`7` = Sunday, `1` = Monday, `2-3` = Tue-Wed, `1,3,5` = Mon/Wed/Fri, `1-5` = Mon-Fri. Validation is strict: digits must be 0–7, ranges must be low-to-high (e.g., `1-5` ok, `5-1` rejected), no spaces inside lists (`1,3,5` ok, `1, 3, 5` rejected).

All times are **EST**. Schedule persists in `data/lunch.json` across restarts.

## Deployment

### Docker (recommended)

**Option 1 — Docker Compose:**

1. Copy `.env.example` to `.env` and fill in your Slack credentials.
2. From the project root, build and run:
   ```bash
   docker compose up -d
   ```
3. Override port: `PORT=8080 docker compose up -d`

**Option 2 — Docker run:**

```bash
docker build -t lunchbot .
docker run -d --name lunchbot \
  -p ${PORT:-3000}:3000 \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  --restart unless-stopped \
  lunchbot
```

**Environment variables:**

| Variable | Required | Description |
|---|---|---|
| `SLACK_BOT_TOKEN` | Yes | Bot OAuth token |
| `SLACK_SIGNING_SECRET` | Yes | Signing secret |
| `LUNCH_CHANNEL_ID` | Yes (for scheduling) | Slack channel ID for automated cron jobs |
| `PORT` | No | Listen port (default `3000`) |

**Notes:**
- Data persists in `./data/` volume mount
- Health check: `GET /health` returns `ok` on port `$PORT`
- Must run from project root (volume path is relative)

### Bare Metal

```bash
npm install && npm run build
PORT=3000 node dist/bot.js
```

### In Your Slack App

Set **Request URL** (Events, Interactivity, Slash Commands) to:
`https://<your-server>/slack/events`

## Scripts

| Command | Description |
|---|---|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the bot (production) |
| `npm run dev` | Run with ts-node (auto-reload) |
| `npm test` | Run tests |
