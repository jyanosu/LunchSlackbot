# LunchBot Setup

Lunch suggestion bot for Slack. Supports both `@LunchSlackBot` mentions and `/lsb-*` slash commands.

## Slack App Configuration

### 1. Create or Open Your App

Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**.

### 2. OAuth Scopes

**OAuth & Permissions** → **Scopes**:

- `channels:history`
- `channels:read`
- `groups:history`
- `groups:read`
- `im:history`
- `im:read`
- `chat:write`

### 3. Event Subscriptions

**Event Subscriptions** → Enable → set **Request URL** to:

```
https://lunchslackbot.onrender.com/slack/events
```

**Bot Event Subscriptions** → Add:

- `app_mention`

### 4. Interactivity

**Interactivity & Shortcuts** → Enable → set **Request URL** to:

```
https://lunchslackbot.onrender.com/slack/events
```

### 5. Slash Commands

**Slash Commands** → Copy the `slash_commands` array from [`slash-commands-manifest.json`](./slash-commands-manifest.json) into your app's manifest:

1. Go to **Settings → App JSON Manifest**
2. Paste the `slash_commands` entries into the manifest
3. Or add each command manually in **Slash Commands** with Request URL: `https://lunchslackbot.onrender.com/slack/commands`

### 6. Install

**Install to Workspace** → Authorize. If you changed settings after installing, **reinstall** the app.

## Deploy to Render

1. Connect your GitHub repo to [Render](https://render.com)
2. Create a **Web Service** with these settings:
   - **Build Command**: `npm run build`
   - **Start Command**: `node dist/bot.js`
   - **Environment**: Node 20 LTS
3. Set environment variables:
   - `SLACK_BOT_TOKEN` — from your Slack app (OAuth Token)
   - `SLACK_SIGNING_SECRET` — from your Slack app (Basic Information)
4. Deploy

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
| `@LunchSlackBot showmasterlist` | `/lsb-showmasterlist` | Show the master suggestion list |
| `@LunchSlackBot removefrommasterlist <place>` | `/lsb-removefrommasterlist` | Remove from master list |
| `@LunchSlackBot help` | `/lsb-help` | Show help |
