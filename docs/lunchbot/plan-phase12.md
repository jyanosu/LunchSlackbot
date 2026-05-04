# Phase 12 Plan — Hide Voter List, Show on Hover

## Tasks

### P12-1: Update poll blocks (single task)

Update `buildPollBlocks` in `vote.ts`: remove voter list section block, add `confirm` field to button with voter names. Update `vote.test.ts` to verify confirm field and absence of voter section.

**Deliverables:**
- `src/commands/vote.ts` — confirm field on button, no voter section
- `src/commands/vote.test.ts` — confirm field tests

**Tests:** 3+

---

## Dependency graph

```
P12-1 (self-contained)
```
