'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Collapsible as CollapsiblePrimitive } from 'radix-ui'
import { ChevronRight, ChevronUp, ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Priority, type TaskState, PRIORITY_COLORS, STATE_LABELS } from '@/types'
import { ProgressBar } from '@/components/progress-bar'
import { PriorityChanger } from '@/components/priority-changer'
import { StateChanger } from '@/components/state-changer'
import { EditTaskDialog } from '@/components/edit-task-dialog'
import { DeleteTaskButton } from '@/components/delete-task-button'
import { CreateShortTermTaskDialog } from '@/components/create-short-term-task-dialog'
import { TaskCard } from '@/components/task-card'
import { SortableList, DragHandle, type DragHandleProps } from '@/components/sortable-list'
import { reorderItems } from '@/lib/reorder'
import { toast } from 'sonner'

const PROTECTED_TITLES = ['One-Off Tasks', 'Routines']

interface Task {
  id: string
  title: string
  description: string | null
  emoji: string | null
  priority: Priority
  state: TaskState
  order: number
  blockedById: string | null
  blockedBy?: { id: string; title: string; emoji: string | null } | null
}

interface CollapsibleProjectCardProps {
  id: string
  title: string
  description: string | null
  emoji: string | null
  priority: Priority
  state: TaskState
  childCount: number
  blockedBy?: { id: string; title: string; emoji: string | null } | null
  isCollapsed: boolean
  onToggle: () => void
  onActionComplete: () => void
  dragHandleProps: DragHandleProps
  refreshKey?: number
  taskStateFilter?: string
  isFirst?: boolean
  isLast?: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
}

export function CollapsibleProjectCard({
  id,
  title,
  description,
  emoji,
  priority,
  state,
  childCount,
  blockedBy,
  isCollapsed,
  onToggle,
  onActionComplete,
  dragHandleProps,
  refreshKey,
  taskStateFilter = 'ACTIVE',
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: CollapsibleProjectCardProps) {
  const isProtected = PROTECTED_TITLES.includes(title)
  const borderColor = PRIORITY_COLORS[priority]

  const [children, setChildren] = useState<Task[]>([])
  const [isLoadingChildren, setIsLoadingChildren] = useState(false)
  const fetchedRef = useRef(false)

  const fetchChildren = useCallback(async () => {
    setIsLoadingChildren(true)
    try {
      const res = await fetch(`/api/tasks/long/${id}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setChildren(data.children ?? [])
    } catch {
      toast.error('Failed to load tasks')
    } finally {
      setIsLoadingChildren(false)
    }
  }, [id])

  // Fetch children when card is expanded (either on mount or via toggle)
  useEffect(() => {
    if (!isCollapsed && !fetchedRef.current) {
      fetchedRef.current = true
      fetchChildren()
    }
  }, [isCollapsed, fetchChildren])

  // Re-fetch children when refreshKey changes (e.g. task moved between projects)
  useEffect(() => {
    if (refreshKey && !isCollapsed && fetchedRef.current) {
      fetchChildren()
    }
  }, [refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleToggle() {
    onToggle()
  }

  function handleChildActionComplete() {
    fetchChildren()
    onActionComplete()
  }

  async function handleReorderChildren(reordered: Task[]) {
    const previous = children
    setChildren(reordered)
    try {
      await reorderItems(reordered, '/api/tasks/short')
    } catch {
      setChildren(previous)
      toast.error('Failed to reorder tasks')
    }
  }

  const doneCount = children.filter((t) => t.state === 'DONE').length
  const filteredChildren =
    taskStateFilter === 'ALL'
      ? children
      : children.filter((t) => t.state === taskStateFilter)
  const isFiltered = taskStateFilter !== 'ALL'

  return (
    <CollapsiblePrimitive.Root open={!isCollapsed} onOpenChange={handleToggle}>
      <div
        className="bg-card text-card-foreground rounded-lg border shadow-sm border-l-[3px]"
        style={{ borderLeftColor: borderColor }}
      >
        {/* Header — single row */}
        <div className="flex items-center gap-1 px-1.5 py-1.5 sm:px-2">
          <DragHandle {...dragHandleProps} />
          <div className="flex flex-col -my-0.5">
            <button
              type="button"
              disabled={isFirst}
              onClick={(e) => { e.stopPropagation(); onMoveUp?.() }}
              className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:pointer-events-none p-0 leading-none"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={isLast}
              onClick={(e) => { e.stopPropagation(); onMoveDown?.() }}
              className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:pointer-events-none p-0 leading-none"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
          <CollapsiblePrimitive.Trigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
            >
              <ChevronRight
                className={cn(
                  'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
                  !isCollapsed && 'rotate-90'
                )}
              />
              {emoji && <span className="shrink-0 text-sm">{emoji}</span>}
              <span className="truncate text-sm font-medium">{title}</span>
            </button>
          </CollapsiblePrimitive.Trigger>

          {/* Right side: progress + grouped controls */}
          <div className="flex shrink-0 items-center gap-1.5">
            {childCount > 0 && (
              <ProgressBar
                done={!isCollapsed ? doneCount : 0}
                total={childCount}
                priority={priority}
              />
            )}

            {/* Status group */}
            {!isProtected && (
              <div className="flex items-center rounded-md bg-muted/50 px-0.5">
                <PriorityChanger
                  taskId={id}
                  currentPriority={priority}
                  taskType="long"
                  onPriorityChange={onActionComplete}
                  size="sm"
                />
                <StateChanger
                  taskId={id}
                  currentState={state}
                  taskType="long"
                  hasChildren={childCount > 0}
                  onStateChange={() => onActionComplete()}
                  size="sm"
                />
              </div>
            )}

            {/* CRUD group */}
            <div className="flex items-center rounded-md bg-muted/50 px-0.5">
              <CreateShortTermTaskDialog
                parentId={id}
                onCreated={handleChildActionComplete}
                variant="compact"
              />
              {!isProtected && (
                <>
                  <EditTaskDialog
                    taskId={id}
                    taskType="long"
                    defaultValues={{
                      title,
                      description,
                      emoji,
                      priority,
                    }}
                    onEdited={onActionComplete}
                    showLabel
                  />
                  <DeleteTaskButton
                    taskId={id}
                    taskType="long"
                    taskTitle={title}
                    hasChildren={childCount > 0}
                    onDeleted={onActionComplete}
                    showLabel
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Collapsible body */}
        <CollapsiblePrimitive.Content className="collapsible-content">
          <div>
            <div className="border-t px-3 pb-2 pt-1.5 sm:px-4">
              {/* Description & blocker info */}
              {!isProtected && description && (
                <p className="text-muted-foreground mb-1 text-xs leading-relaxed">
                  {description}
                </p>
              )}
              {!isProtected && blockedBy && (
                <p className="text-muted-foreground mb-1 text-xs">
                  Blocked by: {blockedBy.emoji ? `${blockedBy.emoji} ` : ''}{blockedBy.title}
                </p>
              )}

              {/* Tasks header */}
              <div className="mb-1.5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Tasks {isFiltered ? `(${filteredChildren.length} of ${children.length})` : `(${children.length})`}
                </h3>
              </div>

              {/* Task list */}
              {isLoadingChildren ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                </div>
              ) : filteredChildren.length > 0 ? (
                isFiltered ? (
                  <div className="space-y-0.5">
                    {filteredChildren.map((task) => {
                      const blockerName = task.blockedBy
                        ? task.blockedBy.emoji
                          ? `${task.blockedBy.emoji} ${task.blockedBy.title}`
                          : task.blockedBy.title
                        : null
                      return (
                        <TaskCard
                          key={task.id}
                          id={task.id}
                          title={task.title}
                          description={task.description}
                          emoji={task.emoji}
                          priority={task.priority}
                          state={task.state}
                          blockerName={blockerName}
                          taskType="short"
                          parentId={id}
                          showDelete
                          showMove
                          onActionComplete={handleChildActionComplete}
                          variant="compact"
                        />
                      )
                    })}
                  </div>
                ) : (
                  <SortableList
                    items={filteredChildren}
                    getItemId={(t) => t.id}
                    onReorder={handleReorderChildren}
                    id={`tasks-${id}`}
                    renderItem={(task, taskDragHandleProps) => {
                      const blockerName = task.blockedBy
                        ? task.blockedBy.emoji
                          ? `${task.blockedBy.emoji} ${task.blockedBy.title}`
                          : task.blockedBy.title
                        : null

                      return (
                        <div className="flex items-center gap-0.5">
                          <DragHandle {...taskDragHandleProps} />
                          <div className="min-w-0 flex-1">
                            <TaskCard
                              id={task.id}
                              title={task.title}
                              description={task.description}
                              emoji={task.emoji}
                              priority={task.priority}
                              state={task.state}
                              blockerName={blockerName}
                              taskType="short"
                              parentId={id}
                              showDelete
                              showMove
                              onActionComplete={handleChildActionComplete}
                              variant="compact"
                            />
                          </div>
                        </div>
                      )
                    }}
                  />
                )
              ) : (
                <div className="flex items-center justify-center rounded-md border border-dashed py-4">
                  <p className="text-muted-foreground text-xs">
                    {children.length === 0
                      ? 'No tasks yet. Add your first task.'
                      : `No ${STATE_LABELS[taskStateFilter as TaskState].toLowerCase()} tasks`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CollapsiblePrimitive.Content>
      </div>
    </CollapsiblePrimitive.Root>
  )
}
