# To-Do List App — Implementation Plan

## Overview
A dynamic task management app with long-term tasks (projects), short-term tasks, routines, and a special "One-Off Tasks" bucket. Features a priority system, blocking/dependency logic, and state cascading between parent-child tasks.

---

## Tech Stack
- **Framework**: Next.js (App Router) — frontend + API routes
- **Database**: PostgreSQL on Neon (serverless)
- **ORM**: Prisma
- **Auth**: NextAuth.js with Google OAuth
- **State Management**: Zustand
- **Hosting**: Vercel
- **Styling**: Tailwind CSS + shadcn/ui

---

## Data Model (Prisma Schema)

### User
```
User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  image         String?
  accounts      Account[]
  sessions      Session[]
  longTermTasks LongTermTask[]
  routineSections RoutineSection[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```
NextAuth also requires `Account`, `Session`, and `VerificationToken` models — use the standard Prisma adapter schema.

### LongTermTask
```
LongTermTask {
  id            String   @id @default(cuid())
  title         String
  description   String?
  emoji         String?
  priority      Priority
  state         TaskState @default(ACTIVE)
  isOneOff      Boolean  @default(false)  // true for the special "One-Off Tasks" container
  order         Int      @default(0)

  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  shortTermTasks ShortTermTask[]
  
  // Blocking: this task is blocked by these long-term tasks
  blockedBy     BlockEntry[]  // stored as JSON array: [{ type: "task_block", taskId: "..." }]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### ShortTermTask
```
ShortTermTask {
  id            String   @id @default(cuid())
  title         String
  description   String?
  emoji         String?
  priority      Priority
  state         TaskState @default(WAITING)
  order         Int      @default(0)

  parentId      String
  parent        LongTermTask @relation(fields: [parentId], references: [id], onDelete: Cascade)

  // Blocking: array of { type: "task_block" | "parent_block", taskId: "..." }
  blockedBy     Json     @default("[]")

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### RoutineSection
```
RoutineSection {
  id            String   @id @default(cuid())
  name          String
  order         Int      @default(0)

  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  routines      Routine[]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### Routine
```
Routine {
  id            String   @id @default(cuid())
  title         String
  description   String?
  emoji         String?
  priority      Priority
  state         TaskState @default(ACTIVE)
  interval      Interval?   // optional enum: DAILY, WEEKLY, BIWEEKLY, MONTHLY, CUSTOM
  customInterval String?    // freetext, only used when interval = CUSTOM
  order         Int      @default(0)

  sectionId     String?
  section       RoutineSection? @relation(fields: [sectionId], references: [id], onDelete: SetNull)

  // Blocking: only by other routines
  blockedBy     Json     @default("[]")  // [{ type: "task_block", taskId: "..." }]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### Enums
```
enum Priority {
  HIGHEST   // Red
  HIGH      // Orange
  MEDIUM    // Yellow
  LOW       // Blue
  LOWEST    // Green
}

enum TaskState {
  ACTIVE
  WAITING
  BLOCKED
  DONE
}

enum Interval {
  DAILY
  WEEKLY
  BIWEEKLY
  MONTHLY
  CUSTOM
}
```

### Priority Color Map
```
HIGHEST  → #EF4444 (red-500)
HIGH     → #F97316 (orange-500)
MEDIUM   → #EAB308 (yellow-500)
LOW      → #3B82F6 (blue-500)
LOWEST   → #22C55E (green-500)
```

---

## Blocking & State Machine Logic

This is the most critical business logic. Implement as a shared utility (`lib/state-machine.ts`).

### Block Types
```typescript
type BlockEntry = 
  | { type: "task_block"; taskId: string }
  | { type: "parent_block"; taskId: string }  // short-term only, taskId = parent LongTermTask id
```

### Blocking Rules
- **LongTermTask** can only be blocked by other **LongTermTask**s (type: `task_block`)
- **ShortTermTask** can be blocked by other **ShortTermTask**s (`task_block`) AND by parent (`parent_block`)
- **Routine** can only be blocked by other **Routine**s (`task_block`)

### State Derivation
A task's state is `BLOCKED` if `blockedBy.length > 0`. The `state` field in DB should be kept in sync — when `blockedBy` changes, recalculate state.

### Cascading Rules — CRITICAL

#### When LongTermTask leaves ACTIVE → (WAITING | BLOCKED | DONE):
1. For each child ShortTermTask:
    - Add `{ type: "parent_block", taskId: parentLongTermTaskId }` to its `blockedBy` array
    - Set state to `BLOCKED`
2. This happens regardless of the child's current state

#### When LongTermTask becomes ACTIVE (from any non-ACTIVE state):
1. For each child ShortTermTask:
    - Remove all entries where `type === "parent_block"` from `blockedBy` array
    - If `blockedBy` is now empty → set state to `WAITING` (NOT ACTIVE — user activates manually)
    - If `blockedBy` still has `task_block` entries → state stays `BLOCKED`

#### When any task is marked DONE:
1. Remove this task's ID from the `blockedBy` array of every task that references it
2. For each affected task: if `blockedBy` is now empty → set state to `WAITING`
3. The completed task itself moves to `DONE` state regardless of its own blockers

#### When a block is manually added:
1. Add `{ type: "task_block", taskId: blockerTaskId }` to target's `blockedBy`
2. Set target state to `BLOCKED`

#### When a block is manually removed:
1. Remove the specific entry from `blockedBy`
2. If `blockedBy` is now empty → set state to `WAITING`

### Valid State Transitions
```
ACTIVE  → WAITING    (user pauses)
ACTIVE  → BLOCKED    (blocker added)
ACTIVE  → DONE       (completed)

WAITING → ACTIVE     (user resumes)
WAITING → BLOCKED    (blocker added)
WAITING → DONE       (completed)

BLOCKED → WAITING    (all blockers removed — automatic)
BLOCKED → DONE       (force-complete allowed)

DONE    → ACTIVE     (user reopens)
```

Note: BLOCKED → ACTIVE is NOT valid. Always goes through WAITING first.

---

## API Routes (Next.js App Router)

All under `/app/api/`. Use route handlers. All endpoints require auth (NextAuth session).

### Long-Term Tasks
```
GET    /api/long-term-tasks          — list all (filterable by state, priority)
POST   /api/long-term-tasks          — create
GET    /api/long-term-tasks/[id]     — get one (include short-term children)
PATCH  /api/long-term-tasks/[id]     — update (title, description, emoji, priority, order)
DELETE /api/long-term-tasks/[id]     — delete (cascades to children)

PATCH  /api/long-term-tasks/[id]/state  — change state (triggers cascading logic)
POST   /api/long-term-tasks/[id]/block  — add a blocker { blockerTaskId }
DELETE /api/long-term-tasks/[id]/block/[blockerTaskId] — remove a blocker
```

### Short-Term Tasks
```
GET    /api/short-term-tasks              — list all (filterable by parentId, state, priority)
POST   /api/short-term-tasks              — create { parentId, title, ... }
GET    /api/short-term-tasks/[id]         — get one
PATCH  /api/short-term-tasks/[id]         — update
DELETE /api/short-term-tasks/[id]         — delete

PATCH  /api/short-term-tasks/[id]/state   — change state
PATCH  /api/short-term-tasks/[id]/move    — move to different parent { newParentId }
POST   /api/short-term-tasks/[id]/block   — add a blocker
DELETE /api/short-term-tasks/[id]/block/[blockerTaskId] — remove a blocker
```

### Routines
```
GET    /api/routines                      — list all (filterable by sectionId, state, interval)
POST   /api/routines                      — create
PATCH  /api/routines/[id]                 — update
DELETE /api/routines/[id]                 — delete

PATCH  /api/routines/[id]/state           — change state
POST   /api/routines/[id]/block           — add blocker
DELETE /api/routines/[id]/block/[blockerTaskId] — remove blocker
```

### Routine Sections
```
GET    /api/routine-sections              — list all
POST   /api/routine-sections              — create
PATCH  /api/routine-sections/[id]         — update (name, order)
DELETE /api/routine-sections/[id]         — delete (orphans routines — sets sectionId to null)
```

---

## Frontend Pages & Components

### Pages (App Router)
```
/                           — Dashboard (today's active tasks + due routines)
/projects                   — All long-term tasks, expandable to show children
/projects/[id]              — Single project detail with its short-term tasks
/one-off                    — One-Off Tasks view (shortcut to the isOneOff=true project)
/routines                   — All routines grouped by section
/archive                    — All DONE tasks across all types
/blocked                    — All BLOCKED tasks with dependency info
/login                      — Google OAuth login
```

### Key Components
```
TaskCard                    — Reusable card for any task type. Shows:
                              - Emoji (if set) + Title
                              - Priority color bar/badge (left border or dot)
                              - State badge (colored chip)
                              - Blocked-by indicator (shows blocking task names)
                              - Click to expand/edit

TaskForm                    — Create/edit form for any task type
                              - Title, description, emoji picker, priority dropdown
                              - Parent selector (for short-term)
                              - Interval selector (for routines)

StateChanger                — Dropdown/button group to change task state
                              - Enforces valid transitions
                              - Shows confirmation when cascading will occur
                              - "Block by" opens a task picker (filtered to same category)

ProjectList                 — List of LongTermTasks with expand/collapse for children
ShortTermTaskList           — List of ShortTermTasks under a project
RoutineList                 — Routines grouped by section with section headers
BlockedView                 — Shows all blocked tasks with "blocked by X" chains

PriorityBadge               — Small colored indicator based on priority
StateBadge                  — Chip showing ACTIVE/WAITING/BLOCKED/DONE with colors
EmojiPicker                 — Simple emoji selector
```

### State Colors (for StateBadge)
```
ACTIVE   → Green background
WAITING  → Yellow/Amber background
BLOCKED  → Red background
DONE     → Gray background
```

---

## Special Behaviors to Implement

### 1. One-Off Tasks Auto-Creation
On user first login / account creation, automatically create a LongTermTask with:
```
{ title: "One-Off Tasks", isOneOff: true, state: ACTIVE, priority: MEDIUM }
```
This cannot be deleted. UI should show it prominently (e.g., pinned at top or separate nav item).

### 2. Move Short-Term Task Between Parents
The PATCH `/api/short-term-tasks/[id]/move` endpoint should:
- Update `parentId` to new parent
- If new parent is non-ACTIVE: add `parent_block` to the moved task
- If new parent is ACTIVE and task had `parent_block` from old parent: remove it

### 3. Blocking Task Completed → Cascade Unblock
When any task is marked DONE, run a query:
```sql
-- Find all tasks that reference this task in their blockedBy JSON array
-- Remove the reference
-- If blockedBy is now empty, set state to WAITING
```
This must be transactional.

### 4. Prevent Circular Blocking
Before adding a block (A blocks B), check that B does not already block A (directly or transitively). Return an error if circular dependency detected.

### 5. Deletion Cascade for Blockers
When a task is deleted (not Done, actually deleted):
- Remove it from all `blockedBy` arrays that reference it
- Recalculate affected tasks' states

---


---

## Implementation Order

### Phase 1: Foundation
1. Initialize Next.js project with App Router
2. Set up Prisma with Neon PostgreSQL connection
3. Define schema, run migrations
4. Set up NextAuth with Google OAuth + Prisma adapter
5. Create seed script
6. Implement base layout with navigation

### Phase 2: Core CRUD
7. LongTermTask API routes + list/detail pages
8. ShortTermTask API routes + list within project pages
9. TaskCard, TaskForm, PriorityBadge, StateBadge components
10. One-Off Tasks auto-creation + dedicated view

### Phase 3: State Machine & Blocking
11. Implement state-machine utility (`lib/state-machine.ts`)
12. State change API endpoints with cascading logic
13. Blocking: add/remove block endpoints with circular dependency check
14. Cascade unblock on task completion/deletion
15. StateChanger component with valid transition enforcement
16. BlockedView page

### Phase 4: Routines
17. RoutineSection API routes
18. Routine API routes
19. Routines page with section grouping
20. Interval selector component

### Phase 5: Polish
21. Dashboard page (today's active tasks + due routines)
22. Archive page
23. Move task between parents
24. Drag-and-drop reordering (within lists)
25. Emoji picker
26. Confirmation dialogs for destructive/cascading actions
27. Loading states, error handling, toast notifications
28. Responsive design for mobile web