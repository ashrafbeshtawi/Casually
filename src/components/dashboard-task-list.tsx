'use client'

import { useCallback, useEffect, useState } from 'react'
import { type Priority, type TaskState, STATE_LABELS, sortByPriority } from '@/types'
import { TaskCard } from '@/components/task-card'
import { CreateShortTermTaskDialog } from '@/components/create-short-term-task-dialog'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: STATE_LABELS.ACTIVE },
  { value: 'WAITING', label: STATE_LABELS.WAITING },
  { value: 'BLOCKED', label: STATE_LABELS.BLOCKED },
  { value: 'DONE', label: STATE_LABELS.DONE },
]

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

interface DashboardTaskListProps {
  parentId: string
  header: React.ReactNode
  emptyIcon: React.ReactNode
  emptyMessage: string
}

export function DashboardTaskList({
  parentId,
  header,
  emptyIcon,
  emptyMessage,
}: DashboardTaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stateFilter, setStateFilter] = useState('ACTIVE')

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/short?parentId=${parentId}`)
      if (!res.ok) throw new Error('Failed to fetch tasks')
      const data = await res.json()
      setTasks(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setIsLoading(false)
    }
  }, [parentId])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const filteredTasks = sortByPriority(
    stateFilter === 'ALL'
      ? tasks
      : tasks.filter((t) => t.state === stateFilter)
  )

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header with create button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {header}
        <CreateShortTermTaskDialog parentId={parentId} onCreated={fetchTasks} />
      </div>

      {/* State filter */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs font-medium w-14 shrink-0">Filter:</span>
        <div className="flex flex-wrap gap-1">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setStateFilter(option.value)}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                stateFilter === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      ) : filteredTasks.length > 0 ? (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              id={task.id}
              title={task.title}
              description={task.description}
              emoji={task.emoji}
              priority={task.priority}
              state={task.state}
              taskType="short"
              showDelete
              onActionComplete={fetchTasks}
              variant="compact"
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          {tasks.length === 0 ? emptyIcon : null}
          <p className="text-muted-foreground text-sm">
            {tasks.length === 0
              ? emptyMessage
              : `No ${STATE_LABELS[stateFilter as TaskState].toLowerCase()} tasks.`}
          </p>
        </div>
      )}
    </div>
  )
}
