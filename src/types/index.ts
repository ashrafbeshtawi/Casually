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
