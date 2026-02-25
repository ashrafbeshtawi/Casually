# Casually App Simplification — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify Casually from 3 task types to 2, replace JSON blocking with a simple FK, and streamline the state machine from ~650 lines to ~80.

**Architecture:** Incremental refactor. Modify the Prisma schema (drop Routine/RoutineSection, rename models, replace `blockedBy` JSON with `blockedById` FK). Rewrite the state machine. Update API routes to new paths. Update all pages and components.

**Tech Stack:** Next.js App Router, Prisma 7 + Neon, NextAuth v5, Zustand, Tailwind + shadcn/ui

---

### Task 1: Update Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Rewrite the schema**

Replace the entire schema with the simplified version. Key changes:
- Remove `Interval` enum
- Remove `Routine` model
- Remove `RoutineSection` model
- Rename `LongTermTask` → `LongRunningTask`
- Rename `ShortTermTask` → `ShortRunningTask`
- Replace `blockedBy Json` with `blockedById String?` self-relations
- Remove `isOneOff` field
- Update User model relations
- Add `state` field to LongRunningTask with `@default(WAITING)` per the plan

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum Priority {
  HIGHEST
  HIGH
  MEDIUM
  LOW
  LOWEST
}

enum TaskState {
  ACTIVE
  WAITING
  BLOCKED
  DONE
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model User {
  id               String            @id @default(cuid())
  name             String?
  email            String?           @unique
  emailVerified    DateTime?
  image            String?
  accounts         Account[]
  sessions         Session[]
  longRunningTasks LongRunningTask[]
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
}

model LongRunningTask {
  id          String    @id @default(cuid())
  title       String
  description String?
  emoji       String?
  priority    Priority  @default(MEDIUM)
  state       TaskState @default(WAITING)
  order       Int       @default(0)

  blockedById String?
  blockedBy   LongRunningTask?  @relation("LongBlocksLong", fields: [blockedById], references: [id])
  blocking    LongRunningTask[] @relation("LongBlocksLong")

  userId   String
  user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  children ShortRunningTask[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ShortRunningTask {
  id          String    @id @default(cuid())
  title       String
  description String?
  emoji       String?
  priority    Priority  @default(MEDIUM)
  state       TaskState @default(WAITING)
  order       Int       @default(0)

  parentId String
  parent   LongRunningTask @relation(fields: [parentId], references: [id], onDelete: Cascade)

  blockedById String?
  blockedBy   ShortRunningTask? @relation("ShortBlocksShort", fields: [blockedById], references: [id])
  blocking    ShortRunningTask[] @relation("ShortBlocksShort")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Step 2: Reset the database and regenerate**

Since this is a destructive schema change (dropping models, renaming), we need to reset:

```bash
npx prisma db push --force-reset
npx prisma generate
```

**Step 3: Commit**

```bash
git add prisma/schema.prisma src/generated/
git commit -m "refactor: simplify schema - drop Routine/RoutineSection, rename models, replace JSON blocking with FK"
```

---

### Task 2: Rewrite Types

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Replace types**

Remove `Interval`, `BlockEntry`, `Routine`, `RoutineSection` types. Rename `LongTermTask` → `LongRunningTask`, `ShortTermTask` → `ShortRunningTask`. Replace `blockedBy: BlockEntry[]` with `blockedById: string | null`. Remove `isOneOff`.

```typescript
export type Priority = 'HIGHEST' | 'HIGH' | 'MEDIUM' | 'LOW' | 'LOWEST'
export type TaskState = 'ACTIVE' | 'WAITING' | 'BLOCKED' | 'DONE'

export interface LongRunningTask {
  id: string
  title: string
  description: string | null
  emoji: string | null
  priority: Priority
  state: TaskState
  order: number
  blockedById: string | null
  blockedBy?: LongRunningTask | null
  userId: string
  children?: ShortRunningTask[]
  _count?: { children: number }
  createdAt: string
  updatedAt: string
}

export interface ShortRunningTask {
  id: string
  title: string
  description: string | null
  emoji: string | null
  priority: Priority
  state: TaskState
  order: number
  parentId: string
  parent?: LongRunningTask
  blockedById: string | null
  blockedBy?: ShortRunningTask | null
  createdAt: string
  updatedAt: string
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  HIGHEST: '#EF4444',
  HIGH: '#F97316',
  MEDIUM: '#EAB308',
  LOW: '#3B82F6',
  LOWEST: '#22C55E',
}

export const STATE_LABELS: Record<TaskState, string> = {
  ACTIVE: 'Active',
  WAITING: 'Waiting',
  BLOCKED: 'Blocked',
  DONE: 'Done',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  HIGHEST: 'Highest',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  LOWEST: 'Lowest',
}
```

**Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "refactor: simplify types - remove Routine/Interval/BlockEntry, rename task interfaces"
```

---

### Task 3: Rewrite State Machine

**Files:**
- Modify: `src/lib/state-machine.ts`
- Modify: `src/lib/state-machine-client.ts`

**Step 1: Replace `src/lib/state-machine.ts` entirely**

The new state machine is drastically simpler. No JSON parsing, no cycle detection, no cascadeOnComplete/cascadeOnDelete. Just valid transitions, cascading parent→children, and parent lock checks.

```typescript
import { PrismaClient } from '@/generated/prisma/client'
import { TaskState } from '@/types'

const VALID_TRANSITIONS: Record<TaskState, TaskState[]> = {
  ACTIVE: ['WAITING', 'BLOCKED', 'DONE'],
  WAITING: ['ACTIVE', 'BLOCKED', 'DONE'],
  BLOCKED: ['ACTIVE', 'WAITING', 'DONE'],
  DONE: ['ACTIVE', 'WAITING'],
}

export function isValidTransition(from: TaskState, to: TaskState): boolean {
  if (from === to) return false
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export function getValidNextStates(currentState: TaskState): TaskState[] {
  return VALID_TRANSITIONS[currentState] ?? []
}

/**
 * Change state of a LongRunningTask. Cascades to ALL children.
 * If moving to BLOCKED, optionally accept blockedById.
 * If moving FROM BLOCKED, clear blockedById.
 */
export async function changeLongRunningTaskState(
  prisma: PrismaClient,
  taskId: string,
  newState: TaskState,
  blockedById?: string | null
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const task = await tx.longRunningTask.findUnique({
      where: { id: taskId },
      select: { state: true },
    })

    if (!task) throw new Error(`LongRunningTask ${taskId} not found`)

    const currentState = task.state as TaskState
    if (!isValidTransition(currentState, newState)) {
      throw new Error(`Invalid transition: ${currentState} -> ${newState}`)
    }

    // Build update data
    const data: Record<string, unknown> = { state: newState }

    if (newState === 'BLOCKED' && blockedById) {
      data.blockedById = blockedById
    } else if (currentState === 'BLOCKED') {
      // Moving FROM BLOCKED: clear blockedById
      data.blockedById = null
    }

    await tx.longRunningTask.update({ where: { id: taskId }, data })

    // Cascade: set ALL children to the same state
    await tx.shortRunningTask.updateMany({
      where: { parentId: taskId },
      data: { state: newState },
    })
  })
}

/**
 * Change state of a ShortRunningTask.
 * Rejects if parent is BLOCKED or DONE (children locked).
 * If moving to BLOCKED, optionally accept blockedById.
 * If moving FROM BLOCKED, clear blockedById.
 */
export async function changeShortRunningTaskState(
  prisma: PrismaClient,
  taskId: string,
  newState: TaskState,
  blockedById?: string | null
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const task = await tx.shortRunningTask.findUnique({
      where: { id: taskId },
      include: { parent: { select: { state: true } } },
    })

    if (!task) throw new Error(`ShortRunningTask ${taskId} not found`)

    const parentState = task.parent.state as TaskState
    if (parentState === 'BLOCKED' || parentState === 'DONE') {
      throw new Error(
        `Cannot change state: parent is ${parentState}. Children are locked.`
      )
    }

    const currentState = task.state as TaskState
    if (!isValidTransition(currentState, newState)) {
      throw new Error(`Invalid transition: ${currentState} -> ${newState}`)
    }

    const data: Record<string, unknown> = { state: newState }

    if (newState === 'BLOCKED' && blockedById) {
      data.blockedById = blockedById
    } else if (currentState === 'BLOCKED') {
      data.blockedById = null
    }

    await tx.shortRunningTask.update({ where: { id: taskId }, data })
  })
}
```

**Step 2: Replace `src/lib/state-machine-client.ts`**

Update the valid transitions to match the new rules (BLOCKED→ACTIVE is now valid, DONE→WAITING is now valid):

```typescript
import { type TaskState } from '@/types'

const VALID_TRANSITIONS: Record<TaskState, TaskState[]> = {
  ACTIVE: ['WAITING', 'BLOCKED', 'DONE'],
  WAITING: ['ACTIVE', 'BLOCKED', 'DONE'],
  BLOCKED: ['ACTIVE', 'WAITING', 'DONE'],
  DONE: ['ACTIVE', 'WAITING'],
}

export function isValidTransition(from: TaskState, to: TaskState): boolean {
  if (from === to) return false
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export function getValidNextStates(currentState: TaskState): TaskState[] {
  return VALID_TRANSITIONS[currentState] ?? []
}
```

**Step 3: Commit**

```bash
git add src/lib/state-machine.ts src/lib/state-machine-client.ts
git commit -m "refactor: rewrite state machine - simple cascading, no JSON blocking"
```

---

### Task 4: Delete Removed Files

**Files:**
- Delete: `src/components/create-routine-dialog.tsx`
- Delete: `src/components/routines-client.tsx`
- Delete: `src/components/section-manager.tsx`
- Delete: `src/components/interval-selector.tsx`
- Delete: `src/components/task-block-picker.tsx`
- Delete: `src/lib/one-off.ts`
- Delete: `src/app/api/routines/` (entire directory)
- Delete: `src/app/api/routine-sections/` (entire directory)
- Delete: `src/app/api/long-term-tasks/[id]/block/` (entire directory)
- Delete: `src/app/api/short-term-tasks/[id]/block/` (entire directory)

**Step 1: Delete all removed files**

```bash
rm -f src/components/create-routine-dialog.tsx
rm -f src/components/routines-client.tsx
rm -f src/components/section-manager.tsx
rm -f src/components/interval-selector.tsx
rm -f src/components/task-block-picker.tsx
rm -f src/lib/one-off.ts
rm -rf src/app/api/routines/
rm -rf src/app/api/routine-sections/
rm -rf src/app/api/long-term-tasks/[id]/block/
rm -rf src/app/api/short-term-tasks/[id]/block/
```

**Step 2: Commit**

```bash
git add -A
git commit -m "refactor: delete routine, section, and block-related files"
```

---

### Task 5: Rewrite API Routes — Long-Running Tasks

**Files:**
- Delete: `src/app/api/long-term-tasks/` (entire directory)
- Create: `src/app/api/tasks/long/route.ts`
- Create: `src/app/api/tasks/long/[id]/route.ts`
- Create: `src/app/api/tasks/long/[id]/state/route.ts`

**Step 1: Delete old API directory**

```bash
rm -rf src/app/api/long-term-tasks/
```

**Step 2: Create `src/app/api/tasks/long/route.ts`**

GET (list, filterable by state/priority) and POST (create with title, state, priority, emoji, description):

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const state = searchParams.get("state")
  const priority = searchParams.get("priority")

  const where: Record<string, unknown> = { userId: session.user.id }
  if (state) where.state = state
  if (priority) where.priority = priority

  const tasks = await prisma.longRunningTask.findMany({
    where,
    include: { _count: { select: { children: true } } },
    orderBy: { order: "asc" },
  })

  return NextResponse.json(tasks)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { title, description, emoji, priority, state } = body

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  const validPriorities = ["HIGHEST", "HIGH", "MEDIUM", "LOW", "LOWEST"]
  if (priority && !validPriorities.includes(priority)) {
    return NextResponse.json({ error: "Invalid priority" }, { status: 400 })
  }

  const validStates = ["ACTIVE", "WAITING", "BLOCKED", "DONE"]
  if (state && !validStates.includes(state)) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 })
  }

  const task = await prisma.longRunningTask.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      emoji: emoji?.trim() || null,
      priority: priority || "MEDIUM",
      state: state || "WAITING",
      userId: session.user.id,
    },
  })

  return NextResponse.json(task, { status: 201 })
}
```

**Step 3: Create `src/app/api/tasks/long/[id]/route.ts`**

GET (with children), PATCH (update fields), DELETE (cascade children):

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const task = await prisma.longRunningTask.findFirst({
    where: { id, userId: session.user.id },
    include: {
      children: { orderBy: { order: "asc" } },
      blockedBy: { select: { id: true, title: true, emoji: true } },
    },
  })

  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(task)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const existing = await prisma.longRunningTask.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json()
  const { title, description, emoji, priority, order } = body

  if (priority) {
    const valid = ["HIGHEST", "HIGH", "MEDIUM", "LOW", "LOWEST"]
    if (!valid.includes(priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 })
    }
  }

  const data: Record<string, unknown> = {}
  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 })
    }
    data.title = title.trim()
  }
  if (description !== undefined) data.description = description?.trim() || null
  if (emoji !== undefined) data.emoji = emoji?.trim() || null
  if (priority !== undefined) data.priority = priority
  if (order !== undefined) data.order = order

  const task = await prisma.longRunningTask.update({ where: { id }, data })
  return NextResponse.json(task)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const existing = await prisma.longRunningTask.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Clear blockedById references pointing to this task
  await prisma.longRunningTask.updateMany({
    where: { blockedById: id },
    data: { blockedById: null },
  })

  await prisma.longRunningTask.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
```

**Step 4: Create `src/app/api/tasks/long/[id]/state/route.ts`**

PATCH state change with cascade:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { changeLongRunningTaskState, isValidTransition } from "@/lib/state-machine"
import { TaskState } from "@/types"

type RouteContext = { params: Promise<{ id: string }> }

const VALID_STATES: TaskState[] = ["ACTIVE", "WAITING", "BLOCKED", "DONE"]

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params

  let body: { state?: string; blockedById?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { state: newState, blockedById } = body

  if (!newState || !VALID_STATES.includes(newState as TaskState)) {
    return NextResponse.json({ error: `Invalid state: ${newState}` }, { status: 400 })
  }

  const task = await prisma.longRunningTask.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (!isValidTransition(task.state as TaskState, newState as TaskState)) {
    return NextResponse.json(
      { error: `Invalid transition from ${task.state} to ${newState}` },
      { status: 400 }
    )
  }

  try {
    await changeLongRunningTaskState(prisma, id, newState as TaskState, blockedById)
  } catch (error) {
    const message = error instanceof Error ? error.message : "State change failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const updatedTask = await prisma.longRunningTask.findUnique({
    where: { id },
    include: { children: { orderBy: { order: "asc" } } },
  })

  return NextResponse.json(updatedTask)
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: rewrite long-running task API routes at /api/tasks/long/"
```

---

### Task 6: Rewrite API Routes — Short-Running Tasks

**Files:**
- Delete: `src/app/api/short-term-tasks/` (entire directory)
- Create: `src/app/api/tasks/short/route.ts`
- Create: `src/app/api/tasks/short/[id]/route.ts`
- Create: `src/app/api/tasks/short/[id]/state/route.ts`
- Create: `src/app/api/tasks/short/[id]/move/route.ts`

**Step 1: Delete old API directory**

```bash
rm -rf src/app/api/short-term-tasks/
```

**Step 2: Create `src/app/api/tasks/short/route.ts`**

GET (filterable by parentId, state, priority) and POST (create, state inherits from parent, reject if parent BLOCKED/DONE):

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TaskState } from "@/types"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const parentId = searchParams.get("parentId")
  const state = searchParams.get("state")
  const priority = searchParams.get("priority")

  const where: Record<string, unknown> = {
    parent: { userId: session.user.id },
  }
  if (parentId) where.parentId = parentId
  if (state) where.state = state
  if (priority) where.priority = priority

  const tasks = await prisma.shortRunningTask.findMany({
    where,
    include: { parent: { select: { id: true, title: true, emoji: true } } },
    orderBy: { order: "asc" },
  })

  return NextResponse.json(tasks)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { parentId, title, description, emoji, priority } = body

  if (!parentId) {
    return NextResponse.json({ error: "parentId is required" }, { status: 400 })
  }
  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  const parent = await prisma.longRunningTask.findFirst({
    where: { id: parentId, userId: session.user.id },
  })

  if (!parent) {
    return NextResponse.json({ error: "Parent not found" }, { status: 404 })
  }

  const parentState = parent.state as TaskState
  if (parentState === "BLOCKED" || parentState === "DONE") {
    return NextResponse.json(
      { error: `Cannot add tasks: parent is ${parentState}` },
      { status: 400 }
    )
  }

  const task = await prisma.shortRunningTask.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      emoji: emoji?.trim() || null,
      priority: priority || "MEDIUM",
      state: parentState,
      parentId,
    },
  })

  return NextResponse.json(task, { status: 201 })
}
```

**Step 3: Create `src/app/api/tasks/short/[id]/route.ts`**

GET, PATCH (update fields), DELETE:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const task = await prisma.shortRunningTask.findFirst({
    where: { id, parent: { userId: session.user.id } },
    include: {
      parent: { select: { id: true, title: true, emoji: true } },
      blockedBy: { select: { id: true, title: true, emoji: true } },
    },
  })

  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(task)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const existing = await prisma.shortRunningTask.findFirst({
    where: { id, parent: { userId: session.user.id } },
  })

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json()
  const { title, description, emoji, priority, order } = body

  if (priority) {
    const valid = ["HIGHEST", "HIGH", "MEDIUM", "LOW", "LOWEST"]
    if (!valid.includes(priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 })
    }
  }

  const data: Record<string, unknown> = {}
  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 })
    }
    data.title = title.trim()
  }
  if (description !== undefined) data.description = description?.trim() || null
  if (emoji !== undefined) data.emoji = emoji?.trim() || null
  if (priority !== undefined) data.priority = priority
  if (order !== undefined) data.order = order

  const task = await prisma.shortRunningTask.update({ where: { id }, data })
  return NextResponse.json(task)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const existing = await prisma.shortRunningTask.findFirst({
    where: { id, parent: { userId: session.user.id } },
  })

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Clear blockedById references pointing to this task
  await prisma.shortRunningTask.updateMany({
    where: { blockedById: id },
    data: { blockedById: null },
  })

  await prisma.shortRunningTask.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
```

**Step 4: Create `src/app/api/tasks/short/[id]/state/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { changeShortRunningTaskState, isValidTransition } from "@/lib/state-machine"
import { TaskState } from "@/types"

type RouteContext = { params: Promise<{ id: string }> }

const VALID_STATES: TaskState[] = ["ACTIVE", "WAITING", "BLOCKED", "DONE"]

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params

  let body: { state?: string; blockedById?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { state: newState, blockedById } = body

  if (!newState || !VALID_STATES.includes(newState as TaskState)) {
    return NextResponse.json({ error: `Invalid state: ${newState}` }, { status: 400 })
  }

  const task = await prisma.shortRunningTask.findFirst({
    where: { id, parent: { userId: session.user.id } },
  })

  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (!isValidTransition(task.state as TaskState, newState as TaskState)) {
    return NextResponse.json(
      { error: `Invalid transition from ${task.state} to ${newState}` },
      { status: 400 }
    )
  }

  try {
    await changeShortRunningTaskState(prisma, id, newState as TaskState, blockedById)
  } catch (error) {
    const message = error instanceof Error ? error.message : "State change failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const updatedTask = await prisma.shortRunningTask.findUnique({
    where: { id },
    include: { parent: { select: { id: true, title: true } } },
  })

  return NextResponse.json(updatedTask)
}
```

**Step 5: Create `src/app/api/tasks/short/[id]/move/route.ts`**

Move task to different parent. If new parent is BLOCKED/DONE, task state matches:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TaskState } from "@/types"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params

  let body: { newParentId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { newParentId } = body
  if (!newParentId) {
    return NextResponse.json({ error: "newParentId is required" }, { status: 400 })
  }

  const task = await prisma.shortRunningTask.findFirst({
    where: { id, parent: { userId: session.user.id } },
  })

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  if (task.parentId === newParentId) {
    return NextResponse.json(task)
  }

  const newParent = await prisma.longRunningTask.findFirst({
    where: { id: newParentId, userId: session.user.id },
  })

  if (!newParent) {
    return NextResponse.json({ error: "New parent not found" }, { status: 404 })
  }

  const newParentState = newParent.state as TaskState
  // If new parent is BLOCKED or DONE, task state must match
  const newState =
    newParentState === "BLOCKED" || newParentState === "DONE"
      ? newParentState
      : (task.state as TaskState)

  const updatedTask = await prisma.shortRunningTask.update({
    where: { id },
    data: {
      parentId: newParentId,
      state: newState,
      blockedById: null, // Clear blocker on move
    },
    include: { parent: { select: { id: true, title: true } } },
  })

  return NextResponse.json(updatedTask)
}
```

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: rewrite short-running task API routes at /api/tasks/short/"
```

---

### Task 7: Update Auth Seed Data

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `prisma/seed.ts`

**Step 1: Update auth.ts createUser event**

Replace the One-Off Tasks creation with both seed tasks. Remove `isOneOff` field. Use new model name `longRunningTask`:

```typescript
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { authConfig } from "@/lib/auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
  },
  events: {
    createUser: async ({ user }) => {
      await prisma.longRunningTask.createMany({
        data: [
          {
            title: 'One-Off Tasks',
            emoji: '📌',
            state: 'ACTIVE',
            priority: 'MEDIUM',
            userId: user.id!,
            order: 0,
          },
          {
            title: 'Routines',
            emoji: '🔄',
            state: 'ACTIVE',
            priority: 'MEDIUM',
            userId: user.id!,
            order: 1,
          },
        ],
      })
    },
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id
      return session
    },
  },
})
```

**Step 2: Rewrite `prisma/seed.ts`**

Use new model names, remove routine/section seeding, remove `isOneOff` and `blockedBy`:

```typescript
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '../src/generated/prisma/client'

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
})
const prisma = new PrismaClient({ adapter })

async function main() {
  await prisma.shortRunningTask.deleteMany()
  await prisma.longRunningTask.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.verificationToken.deleteMany()
  await prisma.user.deleteMany()

  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
    },
  })

  const oneOff = await prisma.longRunningTask.create({
    data: {
      title: 'One-Off Tasks',
      emoji: '📌',
      state: 'ACTIVE',
      priority: 'MEDIUM',
      userId: user.id,
      order: 0,
    },
  })

  const routines = await prisma.longRunningTask.create({
    data: {
      title: 'Routines',
      emoji: '🔄',
      state: 'ACTIVE',
      priority: 'MEDIUM',
      userId: user.id,
      order: 1,
    },
  })

  const websiteProject = await prisma.longRunningTask.create({
    data: {
      title: 'Redesign Website',
      description: 'Complete overhaul of the company website',
      emoji: '🌐',
      priority: 'HIGH',
      state: 'ACTIVE',
      userId: user.id,
      order: 2,
    },
  })

  const fitnessProject = await prisma.longRunningTask.create({
    data: {
      title: 'Get Fit',
      description: 'Health and fitness goals for the year',
      emoji: '💪',
      priority: 'MEDIUM',
      state: 'ACTIVE',
      userId: user.id,
      order: 3,
    },
  })

  await prisma.longRunningTask.create({
    data: {
      title: 'Learn Rust',
      description: 'Complete the Rust programming course',
      emoji: '🦀',
      priority: 'LOW',
      state: 'WAITING',
      userId: user.id,
      order: 4,
    },
  })

  await prisma.shortRunningTask.createMany({
    data: [
      { title: 'Buy groceries', emoji: '🛒', priority: 'MEDIUM', state: 'ACTIVE', parentId: oneOff.id, order: 0 },
      { title: 'Call dentist', emoji: '🦷', priority: 'HIGH', state: 'WAITING', parentId: oneOff.id, order: 1 },
      { title: 'Return package', priority: 'LOW', state: 'DONE', parentId: oneOff.id, order: 2 },
      { title: 'Meditate', emoji: '🧘', priority: 'HIGH', state: 'ACTIVE', parentId: routines.id, order: 0 },
      { title: 'Exercise', emoji: '🏃', priority: 'HIGHEST', state: 'ACTIVE', parentId: routines.id, order: 1 },
      { title: 'Journal', emoji: '📓', priority: 'MEDIUM', state: 'ACTIVE', parentId: routines.id, order: 2 },
      { title: 'Create wireframes', emoji: '✏️', priority: 'HIGHEST', state: 'ACTIVE', parentId: websiteProject.id, order: 0 },
      { title: 'Design mockups', emoji: '🎨', priority: 'HIGH', state: 'WAITING', parentId: websiteProject.id, order: 1 },
      { title: 'Implement frontend', priority: 'HIGH', state: 'WAITING', parentId: websiteProject.id, order: 2 },
      { title: 'Join a gym', emoji: '🏋️', priority: 'HIGH', state: 'DONE', parentId: fitnessProject.id, order: 0 },
      { title: 'Create workout plan', priority: 'MEDIUM', state: 'ACTIVE', parentId: fitnessProject.id, order: 1 },
      { title: 'Meal prep Sunday', emoji: '🥗', priority: 'MEDIUM', state: 'WAITING', parentId: fitnessProject.id, order: 2 },
    ],
  })

  console.log('Seed completed!')
  console.log(`Created user: ${user.email}`)
  console.log(`Created ${await prisma.longRunningTask.count()} long-running tasks`)
  console.log(`Created ${await prisma.shortRunningTask.count()} short-running tasks`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

**Step 3: Commit**

```bash
git add src/lib/auth.ts prisma/seed.ts
git commit -m "refactor: update seed data and auth for simplified models"
```

---

### Task 8: Update Shared Components

**Files:**
- Modify: `src/components/task-card.tsx`
- Modify: `src/components/task-form.tsx`
- Modify: `src/components/edit-task-dialog.tsx`
- Modify: `src/components/state-changer.tsx`
- Modify: `src/components/delete-task-button.tsx`
- Modify: `src/components/create-project-dialog.tsx`
- Modify: `src/components/create-short-term-task-dialog.tsx`
- Modify: `src/components/sortable-task-list.tsx`
- Modify: `src/components/sortable-project-list.tsx`
- Modify: `src/components/project-card-link.tsx`
- Modify: `src/components/move-task-button.tsx`

All components need the following systematic changes:
1. Replace `taskType: 'longTerm' | 'shortTerm' | 'routine'` → `taskType: 'long' | 'short'`
2. Update API paths from `/api/long-term-tasks/` and `/api/short-term-tasks/` → `/api/tasks/long/` and `/api/tasks/short/`
3. Remove all `Interval`, `Routine`, `RoutineSection` imports and references
4. Remove `intervalLabel`, `interval`, `customInterval` props from TaskCard
5. Replace `blockedBy: BlockEntry[]` with `blockedById: string | null` in props
6. Remove `isOneOff` references
7. In TaskForm, remove interval-related state and UI
8. In EditTaskDialog, remove routine API path, remove interval logic
9. In DeleteTaskButton, remove routine API path
10. In StateChanger, update API endpoint function:
   ```typescript
   function getApiEndpoint(taskType: 'long' | 'short', taskId: string): string {
     return `/api/tasks/${taskType}/${taskId}/state`
   }
   ```
   Also update the cascade confirmation message for `taskType === 'long'` instead of `'longTerm'`

11. In CreateProjectDialog, update API path to `/api/tasks/long` and accept `state` in the form submission (default WAITING per the plan)
12. In CreateShortTermTaskDialog, update API path to `/api/tasks/short`
13. In SortableTaskList, update `taskType` references and pass `blockedById` instead of `blockedBy`
14. In SortableProjectList, update `taskType` and remove `isOneOff` references
15. In ProjectCardLink, remove `isOneOff` prop
16. In MoveTaskButton, update API path to `/api/tasks/short/${taskId}/move`

**Step 1: Make all the changes described above**

Apply the changes to each file. The key principle: `'longTerm'` → `'long'`, `'shortTerm'` → `'short'`, `'routine'` removed, all API paths updated, all routine-specific props/logic removed.

**Step 2: Commit**

```bash
git add src/components/
git commit -m "refactor: update all components for simplified task types and API paths"
```

---

### Task 9: Update Pages — Dashboard, Projects, Project Detail

**Files:**
- Modify: `src/app/(app)/page.tsx` (Dashboard)
- Modify: `src/app/(app)/projects/page.tsx`
- Modify: `src/app/(app)/projects/[id]/page.tsx`

**Step 1: Rewrite Dashboard (`src/app/(app)/page.tsx`)**

Remove all routine queries and references. Use `longRunningTask` and `shortRunningTask` model names. Remove `Interval` import and INTERVAL_LABELS. The dashboard shows:
- Summary stats: active projects, active tasks, blocked count, completed count
- Blocked items alert
- Active tasks grouped by parent
- Recently completed items

Key changes: remove `activeRoutines`, `blockedRoutines`, `completedRoutines`, `recentlyCompletedRoutines` queries and their UI sections. Update `prisma.longTermTask` → `prisma.longRunningTask`, `prisma.shortTermTask` → `prisma.shortRunningTask`. Update `taskType="shortTerm"` → `taskType="short"`, `taskType="longTerm"` → `taskType="long"`.

**Step 2: Update Projects page (`src/app/(app)/projects/page.tsx`)**

Remove `isOneOff` pinning logic. All projects are just listed normally. Update model names. Update `taskType` values. Remove `isOneOff` prop from ProjectCardLink.

**Step 3: Update Project Detail (`src/app/(app)/projects/[id]/page.tsx`)**

Update model names (`longTermTask` → `longRunningTask`, `shortTermTasks` → `children`). Remove `isOneOff` references. Replace `blockedBy` JSON parsing with `blockedById` display. Update `taskType` values. Update `SortableTaskList` to pass `blockedById` instead of `blockedBy` array.

**Step 4: Commit**

```bash
git add src/app/\(app\)/page.tsx src/app/\(app\)/projects/
git commit -m "refactor: update dashboard, projects, and project detail pages"
```

---

### Task 10: Update Pages — One-Off, Routines, Blocked, Archive

**Files:**
- Modify: `src/app/(app)/one-off/page.tsx`
- Modify: `src/app/(app)/routines/page.tsx`
- Modify: `src/app/(app)/blocked/page.tsx`
- Modify: `src/app/(app)/archive/page.tsx`

**Step 1: Rewrite One-Off page**

Instead of using `getOrCreateOneOffProject()` (which used `isOneOff` field), find the "One-Off Tasks" project by title. Show its children grouped by state. Use new model names.

```typescript
// Find the One-Off Tasks project by title
const oneOff = await prisma.longRunningTask.findFirst({
  where: { userId: user.id, title: 'One-Off Tasks' },
})
```

Update `taskType` values. Remove `blockedBy` JSON parsing — use `blockedById` instead.

**Step 2: Rewrite Routines page**

Same pattern as One-Off but finds "Routines" project by title. No longer uses RoutinesClient or routine sections. Just a server component showing the "Routines" project's children grouped by state.

**Step 3: Rewrite Blocked page**

Remove all routine references. Only two sections: blocked long-running and blocked short-running tasks. Remove `parseBlockedBy` and `resolveBlockerNames` functions (which parsed JSON). Instead, include the `blockedBy` relation in queries to get the blocking task's title directly.

For long-running tasks:
```typescript
prisma.longRunningTask.findMany({
  where: { userId: user.id, state: 'BLOCKED' },
  include: { blockedBy: { select: { id: true, title: true, emoji: true } } },
})
```

For short-running tasks:
```typescript
prisma.shortRunningTask.findMany({
  where: { state: 'BLOCKED', parent: { userId: user.id } },
  include: {
    parent: { select: { id: true, title: true, emoji: true } },
    blockedBy: { select: { id: true, title: true, emoji: true } },
  },
})
```

Display the blocker info (if `blockedBy` is not null) as a link to the blocking task.

**Step 4: Rewrite Archive page**

Remove routine section. Only two sections: completed long-running and completed short-running. Update model names. Remove `Interval` and interval label logic.

**Step 5: Commit**

```bash
git add src/app/\(app\)/one-off/ src/app/\(app\)/routines/ src/app/\(app\)/blocked/ src/app/\(app\)/archive/
git commit -m "refactor: update one-off, routines, blocked, and archive pages"
```

---

### Task 11: Update Sidebar and Navigation

**Files:**
- Modify: `src/components/sidebar.tsx`

**Step 1: Update nav items**

The sidebar should keep all 6 nav items (Dashboard, Projects, One-Off Tasks, Routines, Blocked, Archive) since those pages still exist. No changes needed to the navigation structure itself — the sidebar is already correct. Just verify it still works after all the other changes.

**Step 2: Commit (if any changes needed)**

---

### Task 12: Verify Build and Fix TypeScript Errors

**Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

**Step 2: Fix any remaining type errors**

Common issues to watch for:
- Stale imports of removed types (`Interval`, `BlockEntry`, `Routine`, `RoutineSection`)
- Model name mismatches (`longTermTask` vs `longRunningTask` in Prisma calls)
- `taskType` string literal mismatches
- API path mismatches
- Props that reference removed fields

**Step 3: Run dev server**

```bash
npm run dev
```

Verify pages load without errors.

**Step 4: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve TypeScript errors from simplification refactor"
```

---

### Task 13: Run Seed and Smoke Test

**Step 1: Run seed**

```bash
npx prisma db seed
```

**Step 2: Start dev server and verify**

```bash
npm run dev
```

Verify:
- Login works
- Dashboard shows active tasks
- /projects lists all projects including One-Off Tasks and Routines
- /projects/[id] shows project detail with children
- /one-off shows the One-Off Tasks project's children
- /routines shows the Routines project's children
- /blocked shows blocked tasks (if any)
- /archive shows completed tasks
- State changes work and cascade correctly
- Creating/editing/deleting tasks works

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: verify build and smoke test pass after simplification"
```
