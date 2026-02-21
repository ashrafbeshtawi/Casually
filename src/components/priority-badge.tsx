'use client'

import { cn } from '@/lib/utils'
import { type Priority, PRIORITY_COLORS, PRIORITY_LABELS } from '@/types'

const sizeClasses = {
  sm: 'size-2',
  md: 'size-3',
  lg: 'size-4',
} as const

interface PriorityBadgeProps {
  priority: Priority
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export function PriorityBadge({
  priority,
  size = 'md',
  showLabel = false,
  className,
}: PriorityBadgeProps) {
  const color = PRIORITY_COLORS[priority]
  const label = PRIORITY_LABELS[priority]

  return (
    <span
      className={cn('inline-flex items-center gap-1.5', className)}
      title={label}
    >
      <span
        className={cn('shrink-0 rounded-full', sizeClasses[size])}
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {showLabel && (
        <span className="text-muted-foreground text-xs font-medium">
          {label}
        </span>
      )}
    </span>
  )
}
