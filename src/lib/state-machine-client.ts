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
