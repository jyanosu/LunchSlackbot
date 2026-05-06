# Phase 13: Docker Containerization

## What

Containerize LunchBot so it runs on any server via Docker. Remove Render-specific code and documentation.

## Context

Bot currently deploys to Render with `Procfile` and hardcoded `onrender.com` URLs in docs. User wants to host locally or elsewhere.

## Requirements

- `Dockerfile` — multi-stage build (build → run), Node 20 Alpine base
- `docker-compose.yml` — single service, mounts `data/` volume, exposes port via env var
- `.dockerignore` — exclude `node_modules`, `dist`, `.git`, `data/`
- `PORT` env var — overrides listen port (default 3000), already supported in `bot.ts`
- Remove `Procfile` (Render-only entry point)
- Update `README.md` — replace Render section with Docker run instructions
- Update `docs/lunchbot/README.md` — replace Render section with generic deployment notes
- Replace `onrender.com` URLs with `https://<your-server>/slack/events` placeholder

## Design

### Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Run stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/bot.js"]
```

### docker-compose.yml

```yaml
services:
  lunchbot:
    build: .
    ports:
      - "${PORT:-3000}:3000"
    volumes:
      - ./data:/app/data
    env_file: .env
    restart: unless-stopped
```

### .dockerignore

```
node_modules
dist
.git
.gitignore
data
.env
*.md
docs
```

### README.md Changes

Replace **Render Deployment** section with **Docker Deployment**:

```markdown
## Docker Deployment

1. Copy `.env.example` to `.env` and fill in your Slack credentials.
2. Build and run:
   ```
   docker compose up -d
   ```
3. Override port: `PORT=8080 docker compose up -d`
4. Data persists in `./data/` volume mount.
```

### docs/lunchbot/README.md Changes

Replace **Deploy to Render** section with generic notes:

```markdown
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
```

## Decisions

| Decision | Rationale |
|---|---|
| Multi-stage build | Smaller image, no build tools in runtime |
| Node 20 Alpine | Lightweight, LTS, matches project |
| `docker compose` over `docker run` | Simpler env/volume management |
| Volume mount `data/` | Persists across container restarts |
| Remove Procfile | Render-only, no longer needed |
| Keep `.env` pattern | Universal, works with Docker and bare metal |

## Invariants

- `PORT` env var already supported in `bot.ts` — no code change needed
- `data/` directory must be writable (volume mount)
- `.env` must be present at runtime (mounted or baked in)

## Testing Strategy

- Build Docker image: `docker build -t lunchbot .`
- Run container: `docker run --env-file .env -p 3000:3000 lunchbot`
- Verify: logs show "LunchBot is running!", port is listening
- Verify: `data/` persists after `docker compose down && docker compose up`

## Out of Scope

- HTTPS/TLS termination (handled by reverse proxy)
- Health check endpoint
- Production reverse proxy (nginx, caddy)
