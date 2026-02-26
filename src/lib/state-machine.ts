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

    const data: Record<string, unknown> = { state: newState }

    if (newState === 'BLOCKED' && blockedById) {
      data.blockedById = blockedById
    } else if (currentState === 'BLOCKED') {
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
