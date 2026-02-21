'use client'

import { cn } from '@/lib/utils'
import { type Priority, type TaskState, PRIORITY_COLORS } from '@/types'
import { PriorityBadge } from '@/components/priority-badge'
import { StateBadge } from '@/components/state-badge'

interface TaskCardProps {
  id: string
  title: string
  description?: string | null
  emoji?: string | null
  priority: Priority
  state: TaskState
  blockedBy?: Array<{ type: string; taskId: string }>
  blockerNames?: string[]
  onClick?: () => void
  variant?: 'default' | 'compact'
  className?: string
}

export function TaskCard({
  title,
  description,
  emoji,
  priority,
  state,
  blockerNames,
  onClick,
  variant = 'default',
  className,
}: TaskCardProps) {
  const borderColor = PRIORITY_COLORS[priority]

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      className={cn(
        'bg-card text-card-foreground rounded-lg border shadow-sm transition-colors',
        'border-l-[3px]',
        onClick && 'cursor-pointer hover:bg-accent/50',
        variant === 'compact' ? 'px-3 py-2' : 'px-4 py-3',
        className
      )}
      style={{ borderLeftColor: borderColor }}
    >
      {/* Top row: emoji + title on left, badges on right */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {emoji && <span className="shrink-0 text-base">{emoji}</span>}
          <span className="truncate text-sm font-medium">{title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <PriorityBadge priority={priority} size="sm" />
          <StateBadge state={state} />
        </div>
      </div>

      {/* Blocked by info */}
      {blockerNames && blockerNames.length > 0 && (
        <p className="text-muted-foreground mt-1 text-xs">
          Blocked by: {blockerNames.join(', ')}
        </p>
      )}

      {/* Description preview (only in default variant) */}
      {variant !== 'compact' && description && (
        <p className="text-muted-foreground mt-1.5 line-clamp-2 text-sm">
          {description}
        </p>
      )}
    </div>
  )
}
