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
https://<your-server>/slack/events
```

**Bot Event Subscriptions** → Add:

- `app_mention`

### 4. Interactivity

**Interactivity & Shortcuts** → Enable → set **Request URL** to:

```
https://<your-server>/slack/events
```

### 5. Slash Commands

**Slash Commands** → Copy the `slash_commands` array from [`slash-commands-manifest.json`](./slash-commands-manifest.json) into your app's manifest:

1. Go to **Settings → App JSON Manifest**
2. Paste the `slash_commands` entries into the manifest
3. Or add each command manually in **Slash Commands** with Request URL: `https://<your-server>/slack/events`

### 6. Install

**Install to Workspace** → Authorize. If you changed settings after installing, **reinstall** the app.

## Deployment

The bot listens on port `$PORT` (default 3000). Set the **Request URL** in your Slack app to:

```
https://<your-server>/slack/events
```

### Docker

```bash
docker compose up -d
```

### Bare metal

```bash
npm install && npm run build
PORT=3000 node dist/bot.js
```

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
