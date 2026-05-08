# Phase 13 Plan: Docker Containerization

## Tasks

| Task | Description | Depends On |
|---|---|---|
| P13-1 | Create Dockerfile, docker-compose.yml, .dockerignore | — |
| P13-2 | Remove Procfile, update README.md, update docs/lunchbot/README.md | — |

Tasks are independent, can run in parallel.

## Task P13-1: Docker files

**Goal:** Containerize the app.

**Files:**
- `Dockerfile` — multi-stage build, Node 20 Alpine
- `docker-compose.yml` — service config, volume mount, env file
- `.dockerignore` — exclude build artifacts

**Verification:**
- `docker build -t lunchbot .` succeeds
- Image size < 200MB

## Task P13-2: Remove Render references

**Goal:** Clean up Render-specific code and docs.

**Changes:**
- Delete `Procfile`
- `README.md` — replace Render section with Docker instructions
- `docs/lunchbot/README.md` — replace Render section with generic deployment
- Replace `onrender.com` URLs with `https://<your-server>/slack/events`

**Verification:**
- No `render.com` or `onrender.com` in README or setup docs
- `Procfile` removed
