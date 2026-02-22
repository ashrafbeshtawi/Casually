import { PrismaClient } from '@/generated/prisma/client'
import { BlockEntry, TaskState } from '@/types'

// ---------------------------------------------------------------------------
// Type for Prisma client that works in both regular and transaction contexts
// ---------------------------------------------------------------------------
type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

// ---------------------------------------------------------------------------
// Valid transition map
// ---------------------------------------------------------------------------
const VALID_TRANSITIONS: Record<TaskState, TaskState[]> = {
  ACTIVE: ['WAITING', 'BLOCKED', 'DONE'],
  WAITING: ['ACTIVE', 'BLOCKED', 'DONE'],
  BLOCKED: ['WAITING', 'DONE'],
  DONE: ['ACTIVE'],
}

// ---------------------------------------------------------------------------
// Pure functions (no DB)
// ---------------------------------------------------------------------------

/**
 * Check if a state transition is valid according to the state machine rules.
 */
export function isValidTransition(from: TaskState, to: TaskState): boolean {
  if (from === to) return false
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

/**
 * Get valid next states for a given current state.
 */
export function getValidNextStates(currentState: TaskState): TaskState[] {
  return VALID_TRANSITIONS[currentState] ?? []
}

/**
 * Calculate the correct state based on blockedBy array and a desired state.
 * If the task has blockers, the state must be BLOCKED regardless of desire,
 * unless the desired state is DONE (force-complete is allowed).
 */
export function deriveState(
  blockedBy: BlockEntry[],
  desiredState: TaskState
): TaskState {
  // Force-complete is always allowed
  if (desiredState === 'DONE') return 'DONE'

  // If there are active blockers the state must be BLOCKED
  if (blockedBy.length > 0) return 'BLOCKED'

  return desiredState
}

// ---------------------------------------------------------------------------
// JSON helpers
// ---------------------------------------------------------------------------

function parseBlockedBy(raw: unknown): BlockEntry[] {
  if (Array.isArray(raw)) return raw as BlockEntry[]
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as BlockEntry[]
    } catch {
      return []
    }
  }
  return []
}

// ---------------------------------------------------------------------------
// Model accessor helpers
// ---------------------------------------------------------------------------

function getModelDelegate(
  prisma: PrismaTransactionClient,
  taskType: 'longTerm' | 'shortTerm' | 'routine'
) {
  switch (taskType) {
    case 'longTerm':
      return prisma.longTermTask
    case 'shortTerm':
      return prisma.shortTermTask
    case 'routine':
      return prisma.routine
  }
}

// ---------------------------------------------------------------------------
// Circular dependency check
// ---------------------------------------------------------------------------

/**
 * Check for circular dependencies before adding a block.
 * Returns true if adding blockerTaskId as a blocker for targetTaskId
 * would create a cycle (i.e., targetTaskId already transitively blocks blockerTaskId).
 *
 * Uses BFS traversal through the blocking graph.
 */
export async function wouldCreateCycle(
  prisma: PrismaClient | PrismaTransactionClient,
  targetTaskId: string,
  blockerTaskId: string,
  taskType: 'longTerm' | 'shortTerm' | 'routine'
): Promise<boolean> {
  // If target === blocker, trivially circular
  if (targetTaskId === blockerTaskId) return true

  // We need to check: does blockerTaskId already depend (transitively) on targetTaskId?
  // i.e., starting from blockerTaskId, follow its blockedBy graph — if we reach targetTaskId,
  // adding targetTaskId -> blockerTaskId (blocker blocks target) would create a cycle.
  //
  // Actually the edge we are adding is: "blockerTaskId blocks targetTaskId"
  // which means targetTaskId.blockedBy will contain blockerTaskId.
  // A cycle exists if targetTaskId already (transitively) blocks blockerTaskId.
  // So we BFS from blockerTaskId's blockedBy and see if we can reach targetTaskId.

  const delegate = getModelDelegate(prisma as PrismaTransactionClient, taskType)
  const visited = new Set<string>()
  const queue: string[] = [blockerTaskId]

  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (currentId === targetTaskId) return true
    if (visited.has(currentId)) continue
    visited.add(currentId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const task = await (delegate as any).findUnique({
      where: { id: currentId },
      select: { blockedBy: true },
    })

    if (!task) continue

    const entries = parseBlockedBy(task.blockedBy)
    for (const entry of entries) {
      if (entry.type === 'task_block' && !visited.has(entry.taskId)) {
        queue.push(entry.taskId)
      }
    }
  }

  return false
}

// ---------------------------------------------------------------------------
// LongTermTask state changes (with cascading to children)
// ---------------------------------------------------------------------------

/**
 * Handle state change for a LongTermTask, including cascading to children.
 */
export async function changeLongTermTaskState(
  prisma: PrismaClient,
  taskId: string,
  newState: TaskState
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const task = await tx.longTermTask.findUnique({
      where: { id: taskId },
      select: { state: true, blockedBy: true },
    })

    if (!task) {
      throw new Error(`LongTermTask ${taskId} not found`)
    }

    const currentState = task.state as TaskState
    const blockedBy = parseBlockedBy(task.blockedBy)

    // Validate transition
    if (!isValidTransition(currentState, newState)) {
      throw new Error(
        `Invalid transition: ${currentState} -> ${newState} for LongTermTask ${taskId}`
      )
    }

    // Derive actual state (respects blockers unless DONE)
    const actualState = deriveState(blockedBy, newState)

    // Update the task itself
    await tx.longTermTask.update({
      where: { id: taskId },
      data: { state: actualState },
    })

    // --- Cascading to children ---
    const wasActive = currentState === 'ACTIVE'
    const isNowActive = actualState === 'ACTIVE'

    if (wasActive && !isNowActive) {
      // Parent left ACTIVE: add parent_block to all children
      await addParentBlockToChildren(tx, taskId)
    } else if (!wasActive && isNowActive) {
      // Parent became ACTIVE: remove parent_block from all children
      await removeParentBlockFromChildren(tx, taskId)
    }

    // If completed, cascade unblock to other LongTermTasks
    if (actualState === 'DONE') {
      await cascadeUnblockLongTerm(tx, taskId)
    }
  })
}

/**
 * Add parent_block to all child ShortTermTasks of a LongTermTask.
 */
async function addParentBlockToChildren(
  tx: PrismaTransactionClient,
  parentTaskId: string
): Promise<void> {
  const children = await tx.shortTermTask.findMany({
    where: { parentId: parentTaskId },
    select: { id: true, blockedBy: true },
  })

  for (const child of children) {
    const entries = parseBlockedBy(child.blockedBy)
    // Only add if not already present
    const alreadyBlocked = entries.some(
      (e) => e.type === 'parent_block' && e.taskId === parentTaskId
    )
    if (!alreadyBlocked) {
      entries.push({ type: 'parent_block', taskId: parentTaskId })
    }

    await tx.shortTermTask.update({
      where: { id: child.id },
      data: {
        blockedBy: JSON.parse(JSON.stringify(entries)),
        state: 'BLOCKED',
      },
    })
  }
}

/**
 * Remove parent_block from all child ShortTermTasks of a LongTermTask.
 * If blockedBy becomes empty -> set state to WAITING.
 * If task_block entries remain -> state stays BLOCKED.
 */
async function removeParentBlockFromChildren(
  tx: PrismaTransactionClient,
  parentTaskId: string
): Promise<void> {
  const children = await tx.shortTermTask.findMany({
    where: { parentId: parentTaskId },
    select: { id: true, blockedBy: true, state: true },
  })

  for (const child of children) {
    const entries = parseBlockedBy(child.blockedBy)
    const filtered = entries.filter(
      (e) => !(e.type === 'parent_block' && e.taskId === parentTaskId)
    )

    const newState: TaskState = filtered.length > 0 ? 'BLOCKED' : 'WAITING'

    await tx.shortTermTask.update({
      where: { id: child.id },
      data: {
        blockedBy: JSON.parse(JSON.stringify(filtered)),
        state: newState,
      },
    })
  }
}

/**
 * When a LongTermTask is completed, remove it from the blockedBy of other LongTermTasks.
 */
async function cascadeUnblockLongTerm(
  tx: PrismaTransactionClient,
  completedTaskId: string
): Promise<void> {
  // Find all LongTermTasks that reference this task in their blockedBy
  const allTasks = await tx.longTermTask.findMany({
    select: { id: true, blockedBy: true, state: true },
  })

  for (const task of allTasks) {
    const entries = parseBlockedBy(task.blockedBy)
    const hasReference = entries.some(
      (e) => e.type === 'task_block' && e.taskId === completedTaskId
    )

    if (hasReference) {
      const filtered = entries.filter(
        (e) => !(e.type === 'task_block' && e.taskId === completedTaskId)
      )

      const newState: TaskState = filtered.length > 0 ? 'BLOCKED' : 'WAITING'

      await tx.longTermTask.update({
        where: { id: task.id },
        data: {
          blockedBy: JSON.parse(JSON.stringify(filtered)),
          state: task.state === 'DONE' ? 'DONE' : newState,
        },
      })
    }
  }
}

// ---------------------------------------------------------------------------
// ShortTermTask state changes
// ---------------------------------------------------------------------------

/**
 * Handle state change for a ShortTermTask.
 */
export async function changeShortTermTaskState(
  prisma: PrismaClient,
  taskId: string,
  newState: TaskState
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const task = await tx.shortTermTask.findUnique({
      where: { id: taskId },
      select: { state: true, blockedBy: true },
    })

    if (!task) {
      throw new Error(`ShortTermTask ${taskId} not found`)
    }

    const currentState = task.state as TaskState
    const blockedBy = parseBlockedBy(task.blockedBy)

    if (!isValidTransition(currentState, newState)) {
      throw new Error(
        `Invalid transition: ${currentState} -> ${newState} for ShortTermTask ${taskId}`
      )
    }

    const actualState = deriveState(blockedBy, newState)

    await tx.shortTermTask.update({
      where: { id: taskId },
      data: { state: actualState },
    })

    // If completed, cascade unblock to other ShortTermTasks
    if (actualState === 'DONE') {
      await cascadeUnblockShortTerm(tx, taskId)
    }
  })
}

/**
 * When a ShortTermTask is completed, remove it from the blockedBy of other ShortTermTasks.
 */
async function cascadeUnblockShortTerm(
  tx: PrismaTransactionClient,
  completedTaskId: string
): Promise<void> {
  const allTasks = await tx.shortTermTask.findMany({
    select: { id: true, blockedBy: true, state: true },
  })

  for (const task of allTasks) {
    const entries = parseBlockedBy(task.blockedBy)
    const hasReference = entries.some(
      (e) => e.type === 'task_block' && e.taskId === completedTaskId
    )

    if (hasReference) {
      const filtered = entries.filter(
        (e) => !(e.type === 'task_block' && e.taskId === completedTaskId)
      )

      const newState: TaskState = filtered.length > 0 ? 'BLOCKED' : 'WAITING'

      await tx.shortTermTask.update({
        where: { id: task.id },
        data: {
          blockedBy: JSON.parse(JSON.stringify(filtered)),
          state: task.state === 'DONE' ? 'DONE' : newState,
        },
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Routine state changes
// ---------------------------------------------------------------------------

/**
 * Handle state change for a Routine.
 */
export async function changeRoutineState(
  prisma: PrismaClient,
  taskId: string,
  newState: TaskState
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const task = await tx.routine.findUnique({
      where: { id: taskId },
      select: { state: true, blockedBy: true },
    })

    if (!task) {
      throw new Error(`Routine ${taskId} not found`)
    }

    const currentState = task.state as TaskState
    const blockedBy = parseBlockedBy(task.blockedBy)

    if (!isValidTransition(currentState, newState)) {
      throw new Error(
        `Invalid transition: ${currentState} -> ${newState} for Routine ${taskId}`
      )
    }

    const actualState = deriveState(blockedBy, newState)

    await tx.routine.update({
      where: { id: taskId },
      data: { state: actualState },
    })

    // If completed, cascade unblock to other Routines
    if (actualState === 'DONE') {
      await cascadeUnblockRoutine(tx, taskId)
    }
  })
}

/**
 * When a Routine is completed, remove it from the blockedBy of other Routines.
 */
async function cascadeUnblockRoutine(
  tx: PrismaTransactionClient,
  completedTaskId: string
): Promise<void> {
  const allTasks = await tx.routine.findMany({
    select: { id: true, blockedBy: true, state: true },
  })

  for (const task of allTasks) {
    const entries = parseBlockedBy(task.blockedBy)
    const hasReference = entries.some(
      (e) => e.type === 'task_block' && e.taskId === completedTaskId
    )

    if (hasReference) {
      const filtered = entries.filter(
        (e) => !(e.type === 'task_block' && e.taskId === completedTaskId)
      )

      const newState: TaskState = filtered.length > 0 ? 'BLOCKED' : 'WAITING'

      await tx.routine.update({
        where: { id: task.id },
        data: {
          blockedBy: JSON.parse(JSON.stringify(filtered)),
          state: task.state === 'DONE' ? 'DONE' : newState,
        },
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Add blocker
// ---------------------------------------------------------------------------

/**
 * Add a blocker to a task. Validates blocking rules and checks for cycles.
 */
export async function addBlocker(
  prisma: PrismaClient,
  targetTaskId: string,
  blockerTaskId: string,
  taskType: 'longTerm' | 'shortTerm' | 'routine'
): Promise<void> {
  // Check for circular dependency
  const cyclic = await wouldCreateCycle(
    prisma,
    targetTaskId,
    blockerTaskId,
    taskType
  )
  if (cyclic) {
    throw new Error(
      `Adding blocker would create a circular dependency: ${blockerTaskId} -> ${targetTaskId}`
    )
  }

  await prisma.$transaction(async (tx) => {
    const delegate = getModelDelegate(tx, taskType)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const task = await (delegate as any).findUnique({
      where: { id: targetTaskId },
      select: { blockedBy: true, state: true },
    })

    if (!task) {
      throw new Error(`Task ${targetTaskId} (${taskType}) not found`)
    }

    // Verify the blocker task exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blocker = await (delegate as any).findUnique({
      where: { id: blockerTaskId },
      select: { id: true },
    })

    if (!blocker) {
      throw new Error(`Blocker task ${blockerTaskId} (${taskType}) not found`)
    }

    const entries = parseBlockedBy(task.blockedBy)

    // Check if already blocked by this task
    const alreadyBlocked = entries.some(
      (e) => e.type === 'task_block' && e.taskId === blockerTaskId
    )
    if (alreadyBlocked) {
      return // Already blocked, no-op
    }

    entries.push({ type: 'task_block', taskId: blockerTaskId })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (delegate as any).update({
      where: { id: targetTaskId },
      data: {
        blockedBy: JSON.parse(JSON.stringify(entries)),
        state: 'BLOCKED',
      },
    })
  })
}

// ---------------------------------------------------------------------------
// Remove blocker
// ---------------------------------------------------------------------------

/**
 * Remove a blocker from a task. If blockedBy becomes empty, set state to WAITING.
 */
export async function removeBlocker(
  prisma: PrismaClient,
  targetTaskId: string,
  blockerTaskId: string,
  taskType: 'longTerm' | 'shortTerm' | 'routine'
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const delegate = getModelDelegate(tx, taskType)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const task = await (delegate as any).findUnique({
      where: { id: targetTaskId },
      select: { blockedBy: true, state: true },
    })

    if (!task) {
      throw new Error(`Task ${targetTaskId} (${taskType}) not found`)
    }

    const entries = parseBlockedBy(task.blockedBy)
    const filtered = entries.filter(
      (e) => !(e.type === 'task_block' && e.taskId === blockerTaskId)
    )

    const newState: TaskState = filtered.length > 0 ? 'BLOCKED' : 'WAITING'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (delegate as any).update({
      where: { id: targetTaskId },
      data: {
        blockedBy: JSON.parse(JSON.stringify(filtered)),
        // Only change to WAITING if currently BLOCKED; don't override DONE
        state: task.state === 'DONE' ? 'DONE' : newState,
      },
    })
  })
}

// ---------------------------------------------------------------------------
// Cascade on complete
// ---------------------------------------------------------------------------

/**
 * Handle cascading unblock when a task is completed.
 * Removes this task's ID from the blockedBy array of every task that references it.
 */
export async function cascadeOnComplete(
  prisma: PrismaClient,
  completedTaskId: string,
  taskType: 'longTerm' | 'shortTerm' | 'routine'
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    switch (taskType) {
      case 'longTerm':
        await cascadeUnblockLongTerm(tx, completedTaskId)
        break
      case 'shortTerm':
        await cascadeUnblockShortTerm(tx, completedTaskId)
        break
      case 'routine':
        await cascadeUnblockRoutine(tx, completedTaskId)
        break
    }
  })
}

// ---------------------------------------------------------------------------
// Cascade on delete
// ---------------------------------------------------------------------------

/**
 * Handle cascading when a task is deleted.
 * Removes the task from all blockedBy arrays that reference it,
 * and recalculates affected tasks' states.
 */
export async function cascadeOnDelete(
  prisma: PrismaClient,
  deletedTaskId: string,
  taskType: 'longTerm' | 'shortTerm' | 'routine'
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    switch (taskType) {
      case 'longTerm': {
        // Remove from other LongTermTasks' blockedBy
        await cascadeUnblockLongTerm(tx, deletedTaskId)

        // Also remove parent_block references in children (if this LT task had children)
        await removeParentBlockFromChildren(tx, deletedTaskId)
        break
      }
      case 'shortTerm': {
        await cascadeUnblockShortTerm(tx, deletedTaskId)
        break
      }
      case 'routine': {
        await cascadeUnblockRoutine(tx, deletedTaskId)
        break
      }
    }
  })
}
