# Casually App Simplification — Design Document

**Date**: 2026-02-25
**Approach**: Incremental Refactor (Approach A)

## Summary

Simplify Casually from 3 task types (LongTermTask, ShortTermTask, Routine) to 2 (LongRunningTask, ShortRunningTask). Remove RoutineSection model. Replace complex JSON-based blocking with a simple optional `blockedById` foreign key. Simplify state machine cascading.

## Data Model Changes

### Remove
- `Interval` enum
- `Routine` model
- `RoutineSection` model
- `isOneOff` field from long-running tasks

### Rename
- `LongTermTask` → `LongRunningTask`
- `ShortTermTask` → `ShortRunningTask`

### Blocking
- Remove `blockedBy Json @default("[]")` from both models
- Add `blockedById String?` self-relation on each model (same-level only)
- Informational/reference only — not enforced

### Seed Data
Two auto-created long-running tasks on first login:
- "One-Off Tasks" (📌, ACTIVE)
- "Routines" (🔄, ACTIVE)

## State Machine

### Cascading
Any state change on a LongRunningTask sets ALL children to that same state.

### Constraints
- Parent BLOCKED or DONE → children locked, cannot change individually
- Parent ACTIVE or WAITING → children can be managed independently

### Blocking
- BLOCKED is just a state; optionally accepts `blockedById`
- Moving FROM BLOCKED clears `blockedById`
- No cycle detection needed

### Valid Transitions
```
ACTIVE  → WAITING, BLOCKED, DONE
WAITING → ACTIVE, BLOCKED, DONE
BLOCKED → ACTIVE, WAITING, DONE
DONE    → ACTIVE, WAITING
```

## API Routes

### Remove
- `/api/routines/` (all)
- `/api/routine-sections/` (all)
- `/api/*/block` and `/api/*/block/[blockerTaskId]` endpoints

### Long-Running Tasks (`/api/tasks/long/`)
```
GET|POST          /api/tasks/long
GET|PATCH|DELETE   /api/tasks/long/[id]
PATCH             /api/tasks/long/[id]/state  → cascades to all children
```

### Short-Running Tasks (`/api/tasks/short/`)
```
GET|POST          /api/tasks/short
GET|PATCH|DELETE   /api/tasks/short/[id]
PATCH             /api/tasks/short/[id]/state  → rejects if parent BLOCKED/DONE
PATCH             /api/tasks/short/[id]/move   → state matches new parent if BLOCKED/DONE
```

## Pages

### Keep & rework
- `/` — Dashboard: active short-running tasks grouped by parent
- `/projects` — All long-running tasks as cards
- `/projects/[id]` — Single long-running task + children
- `/archive` — All DONE tasks
- `/login` — Unchanged

### Keep as filtered views (no special models)
- `/one-off` — Shows "One-Off Tasks" long-running task's children
- `/routines` — Shows "Routines" long-running task's children
- `/blocked` — Shows all BLOCKED tasks

## Components

### Remove
- `create-routine-dialog.tsx`, `routines-client.tsx`, `section-manager.tsx`
- `interval-selector.tsx`, `task-block-picker.tsx`, `state-machine-client.ts`

### Update
- `task-card.tsx`, `task-form.tsx`, `edit-task-dialog.tsx`, `state-changer.tsx`
- `create-project-dialog.tsx`, `create-short-term-task-dialog.tsx`
- `sortable-list.tsx`, `sortable-task-list.tsx`, `sortable-project-list.tsx`
- `sidebar.tsx`, `header.tsx`, `app-shell.tsx`

### New
- `LongTaskCard` — emoji, title, priority border, state badge, child count
- `ShortTaskCard` — compact: emoji, title, priority dot, state badge, blocked-by ref
- `StateChangeDialog` — all transitions, optional blocker picker, cascade warning
