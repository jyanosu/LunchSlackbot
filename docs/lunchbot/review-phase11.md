# Phase 11 Review — Deadline Reminders

## Must fix

**1. Deadline parsing is fragile**

`LunchDay.deadline` is a string like "11:00 AM EST". Parsing this to a cron expression requires handling AM/PM, stripping "EST", and computing 5 min before. This is non-trivial and error-prone.

**Recommendation:** Store deadline as `HH:MM` 24h internally (like schedule times), and format for display only. This reuses the existing `parseTime`/`formatTime12` helpers from `time-util.ts`.

**2. Manual rounds can't use cron reminders**

If the user calls `begin` manually at an arbitrary time, the cron jobs are already registered for the *scheduled* times, not the manual round's deadline. Cron jobs fire at fixed wall-clock times — they don't adapt to manual rounds.

**Recommendation:** Use `setTimeout` for manual rounds (computed from current time + deadline), cron for scheduled rounds. Or: always use cron, but accept that reminders only work for the scheduled deadline time.

**3. `suggestiondeadline` command changes deadline but not reminders**

If an admin changes the deadline via `suggestiondeadline`, the reminder cron job still fires at the old time.

**Recommendation:** `suggestiondeadline` must restart reminder cron jobs.

## Should fix

**4. Reminder fires even if no round started**

Cron jobs fire regardless of whether `begin` was called. The guard `!today?.started` handles this, but the cron job still runs every day.

**Observation:** This is fine — the guard skips silently. No action needed.

## Observations

- The spec says "cron-based" for everything, but manual rounds start at arbitrary times. Cron can't adapt to that.
- Consider: reminders only work when using the automated schedule. Document this limitation.
