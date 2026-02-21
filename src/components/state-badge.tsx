'use client'

import { cn } from '@/lib/utils'
import { type TaskState, STATE_LABELS } from '@/types'

const stateStyles: Record<TaskState, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  WAITING: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  BLOCKED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  DONE: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

interface StateBadgeProps {
  state: TaskState
  className?: string
}

export function StateBadge({ state, className }: StateBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        stateStyles[state],
        className
      )}
    >
      {STATE_LABELS[state]}
    </span>
  )
}
