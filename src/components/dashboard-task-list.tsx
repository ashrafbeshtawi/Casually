'use client'

import { useCallback, useEffect, useState } from 'react'
import { type Priority, type TaskState, STATE_LABELS } from '@/types'
import { TaskCard } from '@/components/task-card'
import { CreateShortTermTaskDialog } from '@/components/create-short-term-task-dialog'
import { SortableList, DragHandle } from '@/components/sortable-list'
import { reorderItems } from '@/lib/reorder'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const STATE_ORDER: TaskState[] = ['ACTIVE', 'WAITING', 'BLOCKED', 'DONE']

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

  async function handleReorder(reordered: Task[]) {
    const previous = tasks
    setTasks(reordered)
    try {
      await reorderItems(reordered, '/api/tasks/short')
    } catch {
      setTasks(previous)
      toast.error('Failed to reorder tasks')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with create button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {header}
        <CreateShortTermTaskDialog parentId={parentId} onCreated={fetchTasks} />
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
      ) : tasks.length > 0 ? (
        <SortableList
          items={tasks}
          getItemId={(t) => t.id}
          onReorder={handleReorder}
          renderItem={(task, dragHandleProps) => (
            <div className="flex items-center gap-1">
              <DragHandle {...dragHandleProps} />
              <div className="min-w-0 flex-1">
                <TaskCard
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
              </div>
            </div>
          )}
        />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          {emptyIcon}
          <p className="text-muted-foreground text-sm">
            {emptyMessage}
          </p>
        </div>
      )}
    </div>
  )
}
