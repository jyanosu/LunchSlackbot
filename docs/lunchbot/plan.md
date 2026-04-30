# LunchBot — Phase 1 Plan

Shared decisions (from spec): TypeScript, Slack Bolt, `.env` via `dotenv`, Node.js 20+, local dev with ngrok.

---

## Task 1 — Project scaffolding

**Goal:** Bootstrap a runnable TypeScript project with Bolt and dotenv dependencies.

**Context:** Empty repo. No package manager or build tool configured.

**Proposed Approach:**
- `npm init -y`, install `@slack/bolt` + `dotenv` as deps, `typescript` + `@types/node` as dev deps.
- Add `tsconfig.json` with module `commonjs`, target `ES2022`, rootDir `src`, outDir `dist`.
- Add `package.json` scripts: `build` (tsc), `start` (node dist/bot.js), `dev` (ts-node src/bot.ts).
- Create `.env.example` with `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET` placeholders.
- Add `.gitignore` for `node_modules`, `dist`, `.env`.

**Acceptance Criteria:**
- `npm run build` succeeds with no output (no src yet).
- `.env.example` lists both required env vars.
- `.gitignore` excludes secrets and build artifacts.

**Spec:** none (fully defined by spec decisions table).

**Verify:**
```
npm run build
ls dist/          # empty, no errors
cat .env.example  # shows SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET
```

---

## Task 2 — Bot entry point + app_mention handler

**Goal:** Bot starts, loads env, and replies "🍱 *Lunchbot* — lunch suggestion bot" when mentioned.

**Context:** Project scaffolded (Task 1). No source files yet.

**Proposed Approach:**
- Create `src/bot.ts` that:
  1. Loads `.env` via `dotenv/config`.
  2. Validates `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET` are present — exits with message if not.
  3. Initializes `new App({ token, signingSecret })`.
  4. Registers `app.event('app_mention', ({ say }) => say('🍱 *Lunchbot* — lunch suggestion bot'))`.
  5. Starts the app with `app.start()` and logs port on success.

**Acceptance Criteria:**
- Missing env var → process exits with non-zero code and a message naming the missing var.
- Valid env vars → bot starts and prints the listening port.
- `app_mention` event → `say` is called with the title message.

**Spec:** short (reply text defined in spec § Design).

**Verify:**
```
# Missing env — should exit with error
SLACK_BOT_TOKEN= SLACK_SIGNING_SECRET= npm run dev

# With valid tokens (use test tokens from Slack API test sandbox)
SLACK_BOT_TOKEN=xoxb-test SLACK_SIGNING_SECRET=test npm run dev  # should start, print port
```

---

## Task 3 — Unit test for app_mention handler

**Goal:** Verify the mention handler replies with the correct text.

**Context:** Bot code exists (Task 2). No tests yet.

**Proposed Approach:**
- Install `vitest` as dev dependency.
- Create `src/bot.test.ts` that:
  1. Constructs the Bolt app in test mode (`app.test()` or manual mock).
  2. Simulates an `app_mention` event.
  3. Asserts `say` was called with `'🍱 *Lunchbot* — lunch suggestion bot'`.

**Acceptance Criteria:**
- Test passes: `say` receives the expected reply string.
- `npm test` runs without errors.

**Spec:** none.

**Verify:**
```
npm test
```

---

## Dependency order

```
Task 1 (scaffold) → Task 2 (bot code) → Task 3 (tests)
```

Task 2 depends on Task 1's project structure. Task 3 depends on Task 2's source. No parallelism needed — total scope is ~3 focused tasks.
