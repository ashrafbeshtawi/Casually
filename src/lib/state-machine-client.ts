/**
 * Client-safe pure functions from the state machine.
 * These have no Prisma or server-only dependencies and can be
 * safely imported in 'use client' components.
 */

import { type TaskState } from '@/types'

const VALID_TRANSITIONS: Record<TaskState, TaskState[]> = {
  ACTIVE: ['WAITING', 'BLOCKED', 'DONE'],
  WAITING: ['ACTIVE', 'BLOCKED', 'DONE'],
  BLOCKED: ['WAITING', 'DONE'],
  DONE: ['ACTIVE'],
}

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
