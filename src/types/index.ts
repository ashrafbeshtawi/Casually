// Shared TypeScript types mirroring Prisma models for frontend components

export type Priority = 'HIGHEST' | 'HIGH' | 'MEDIUM' | 'LOW' | 'LOWEST'
export type TaskState = 'ACTIVE' | 'WAITING' | 'BLOCKED' | 'DONE'
export type Interval = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM'

export interface BlockEntry {
  type: 'task_block' | 'parent_block'
  taskId: string
}

export interface LongTermTask {
  id: string
  title: string
  description: string | null
  emoji: string | null
  priority: Priority
  state: TaskState
  isOneOff: boolean
  order: number
  userId: string
  blockedBy: BlockEntry[]
  shortTermTasks?: ShortTermTask[]
  createdAt: string
  updatedAt: string
}

export interface ShortTermTask {
  id: string
  title: string
  description: string | null
  emoji: string | null
  priority: Priority
  state: TaskState
  order: number
  parentId: string
  parent?: LongTermTask
  blockedBy: BlockEntry[]
  createdAt: string
  updatedAt: string
}

export interface RoutineSection {
  id: string
  name: string
  order: number
  userId: string
  routines?: Routine[]
  createdAt: string
  updatedAt: string
}

export interface Routine {
  id: string
  title: string
  description: string | null
  emoji: string | null
  priority: Priority
  state: TaskState
  interval: Interval | null
  customInterval: string | null
  order: number
  sectionId: string | null
  section?: RoutineSection
  blockedBy: BlockEntry[]
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
