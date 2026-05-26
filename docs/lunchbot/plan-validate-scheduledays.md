# Plan: Validate scheduledays Before Persisting

## Shared Decisions

- `validateDays(input: string): boolean` replaces the regex in `scheduledays.ts`
- Validation runs before `setSchedule` — invalid input never persists
- Same error message as today (no UX change)
- Step syntax (`1-5/2`) out of scope
- No whitespace tolerance inside comma-separated lists — `1, 3, 5` rejected

---

## Task 1: Implement validateDays and wire into handleScheduleDays

**Goal:** Replace `DAYS_REGEX` with `validateDays` that strictly validates cron day-of-week values, and add comprehensive tests.

**Context:** Current regex (`/^\*$|^\d{1,2}([-,\d]*)$/`) accepts `99`, `1-`, `1,,3`, `5-1`. `validateDays` must accept only `*`, singles `0`–`7`, comma lists, and valid ranges where `low < high`.

**Proposed Approach:**

1. `src/commands/scheduledays.ts` — add `validateDays(input): boolean` that:
   - Returns `true` for `*`
   - Splits on `,`, rejects empty tokens
   - For each token: matches single digit `0`–`7` or range `low-high` where `0 <= low < high <= 7`
   - Returns `false` for anything else
2. `src/commands/scheduledays.ts` — replace `DAYS_REGEX.test(input)` with `!validateDays(input)`
3. `src/commands/scheduledays.test.ts` — add acceptance tests: `*`, `0`, `7`, `1`, `0-7`, `1-5`, `2-3`, `1,3,5`
4. `src/commands/scheduledays.test.ts` — add rejection tests: `99`, `8`, `1-`, `-3`, `1,,3`, `5-1`, `1-3-5`, `1,3-`, `1-1`, `1, 3, 5`

**Acceptance Criteria:**
- `validateDays` accepts `*`, `0`–`7`, `0-7`, `1-5`, `2-3`, `1,3,5`
- `validateDays` rejects `99`, `8`, `1-`, `-3`, `1,,3`, `5-1`, `1-3-5`, `1,3-`, `1-1`, `1, 3, 5`
- Invalid input does not call `setSchedule` or `restartSchedule`
- Existing tests pass (including pre-existing `abc` rejection)
- All 11 new test cases pass

**Spec:** `full` — `docs/lunchbot/spec-validate-scheduledays.md`

**Verify:**
```bash
npm run build && npm test
```

**Out of Scope:**
- Step syntax (`1-5/2`)
- Validation in `setSchedule` itself
- Changes to `schedulebegin`, `scheduleend`, `schedulevote`
