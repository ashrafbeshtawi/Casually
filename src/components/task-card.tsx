'use client'

import { cn } from '@/lib/utils'
import { type Priority, type TaskState, PRIORITY_COLORS } from '@/types'
import { PriorityBadge } from '@/components/priority-badge'
import { PriorityChanger } from '@/components/priority-changer'
import { StateBadge } from '@/components/state-badge'
import { StateChanger } from '@/components/state-changer'
import { EditTaskDialog } from '@/components/edit-task-dialog'
import { DeleteTaskButton } from '@/components/delete-task-button'
import { MoveTaskButton } from '@/components/move-task-button'

interface TaskCardProps {
  id: string
  title: string
  description?: string | null
  emoji?: string | null
  priority: Priority
  state: TaskState
  blockerName?: string | null
  taskType?: 'long' | 'short'
  hasChildren?: boolean
  parentId?: string
  showDelete?: boolean
  showMove?: boolean
  hideEdit?: boolean
  onActionComplete?: () => void
  onClick?: () => void
  /** Minimal mode: only show emoji + title (for protected project cards) */
  minimal?: boolean
  variant?: 'default' | 'compact'
  className?: string
}

export function TaskCard({
  id,
  title,
  description,
  emoji,
  priority,
  state,
  blockerName,
  taskType,
  hasChildren,
  parentId,
  showDelete,
  showMove,
  hideEdit,
  onActionComplete,
  onClick,
  minimal,
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
        variant === 'compact' ? 'px-2.5 py-1.5' : 'px-4 py-3',
        className
      )}
      style={{ borderLeftColor: borderColor }}
    >
      {/* Top row: emoji + title on left, badges/actions on right */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {emoji && <span className="shrink-0 text-base">{emoji}</span>}
          <span className="truncate text-sm font-medium">{title}</span>
        </div>
        {!minimal && (
          <div
            className="flex shrink-0 items-center gap-1 sm:gap-1.5"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {taskType ? (
              <>
                <PriorityChanger
                  taskId={id}
                  currentPriority={priority}
                  taskType={taskType}
                  onPriorityChange={onActionComplete}
                  size="sm"
                />
                <StateChanger
                  taskId={id}
                  currentState={state}
                  taskType={taskType}
                  hasChildren={hasChildren}
                  onStateChange={onActionComplete ? () => onActionComplete() : undefined}
                  size="sm"
                />
                {!hideEdit && (
                  <EditTaskDialog
                    taskId={id}
                    taskType={taskType}
                    defaultValues={{
                      title,
                      description,
                      emoji,
                      priority,
                      parentId,
                    }}
                    onEdited={onActionComplete}
                  />
                )}
                {showDelete && (
                  <DeleteTaskButton
                    taskId={id}
                    taskType={taskType}
                    taskTitle={title}
                    hasChildren={hasChildren}
                    onDeleted={onActionComplete}
                  />
                )}
                {showMove && parentId && (
                  <MoveTaskButton
                    taskId={id}
                    currentParentId={parentId}
                    onMoved={onActionComplete}
                  />
                )}
              </>
            ) : (
              <>
                <PriorityBadge priority={priority} size="sm" showLabel />
                <StateBadge state={state} />
              </>
            )}
          </div>
        )}
      </div>

      {/* Blocked by info */}
      {!minimal && blockerName && (
        <p className="text-muted-foreground mt-1 text-xs">
          Blocked by: {blockerName}
        </p>
      )}

      {/* Description preview */}
      {!minimal && description && (
        <p className={cn(
          "text-muted-foreground line-clamp-2",
          variant === 'compact' ? 'mt-0.5 text-xs' : 'mt-1.5 text-sm'
        )}>
          {description}
        </p>
      )}
    </div>
  )
}
