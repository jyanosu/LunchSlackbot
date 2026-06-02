# Spec: Validate scheduledays Before Persisting

## What

Add strict validation of cron day-of-week values in `handleScheduleDays` before calling `setSchedule`. Invalid input must be rejected without modifying the saved schedule.

## Context

`src/commands/scheduledays.ts` uses `DAYS_REGEX = /^\*$|^\d{1,2}([-,\d]*)$/` which accepts malformed values like `99`, `1-`, `1,,3`, `5-1`. These are persisted via `setSchedule` before `restartSchedule` is called, where `node-cron.schedule()` would throw on invalid expressions.

## Requirements

Validation must accept exactly these forms:
- `*` — every day
- Single digit: `0`–`7` (0 = Sun, 7 = Sun)
- Comma-separated list of valid singles: `1,3,5`
- Range of valid singles: `1-5`, `2-3`

Validation must reject:
- `99`, `8` — out of range
- `1-`, `-3`, `5-` — incomplete ranges
- `1,,3`, `,,1` — empty list elements
- `5-1` — reversed range (high before low)
- `abc` — non-numeric
- `1-3-5` — multiple range operators
- `1,3-` — mixed invalid

Invalid input must NOT call `setSchedule` or `restartSchedule`.

## Design

Replace `DAYS_REGEX` with a `validateDays(input: string): boolean` function that:
1. Accepts `*` directly
2. Splits on `,` and validates each token
3. For each token, checks if it is a single digit (0–7) or a valid range (`low-high` where `0 <= low < high <= 7`)
4. Rejects empty tokens, out-of-range digits, reversed ranges, and incomplete ranges

Call `validateDays` before `setSchedule` in `handleScheduleDays`.

## Decisions

- Reversed ranges (`5-1`) are rejected. Cron supports them via step syntax but the bot does not document or test that behavior.
- Single-element ranges (`1-1`) are rejected as degenerate; use `1` instead.
- No step syntax (`1-5/2`) supported — out of scope.
- No whitespace tolerance inside comma-separated lists — `1, 3, 5` is rejected. The input is trimmed but internal spaces are not stripped.

## Invariants

- `setSchedule` is never called with invalid `days`.
- Existing valid schedule is never overwritten by invalid input.

## Error Behavior

- Invalid input returns the same error message as today (usage hint with valid examples).
- No partial state is persisted.

## Testing Strategy

Add tests to `scheduledays.test.ts`:
- Accept: `*`, `0`, `7`, `1`, `0-7`, `1-5`, `2-3`, `1,3,5`
- Reject: `99`, `8`, `1-`, `-3`, `1,,3`, `5-1`, `abc`, `1-3-5`, `1,3-`, `1-1`, `1, 3, 5`

## Out of Scope

- Step syntax (`1-5/2`)
- Validation in `setSchedule` itself (command-level only)
