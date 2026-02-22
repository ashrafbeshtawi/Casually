'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SortableList, DragHandle, type DragHandleProps } from '@/components/sortable-list'
import { TaskCard } from '@/components/task-card'
import { MoveTaskButton } from '@/components/move-task-button'
import { DeleteTaskButton } from '@/components/delete-task-button'
import { reorderItems } from '@/lib/reorder'
import { type Priority, type TaskState } from '@/types'
import { toast } from 'sonner'

interface TaskItem {
  id: string
  title: string
  description: string | null
  emoji: string | null
  priority: Priority
  state: TaskState
  blockedBy: Array<{ type: string; taskId: string }>
  parentId: string
}

interface SortableTaskListProps {
  tasks: TaskItem[]
  parentId: string
}

export function SortableTaskList({ tasks: initial, parentId }: SortableTaskListProps) {
  const [tasks, setTasks] = useState(initial)
  const router = useRouter()

  async function handleReorder(reordered: TaskItem[]) {
    const previous = tasks
    setTasks(reordered)
    try {
      await reorderItems(reordered, '/api/short-term-tasks')
      router.refresh()
    } catch {
      setTasks(previous)
      toast.error('Failed to reorder tasks')
    }
  }

  if (tasks.length === 0) return null

  return (
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
              blockedBy={task.blockedBy}
              taskType="shortTerm"
              variant="compact"
            />
          </div>
          <MoveTaskButton
            taskId={task.id}
            currentParentId={parentId}
          />
          <DeleteTaskButton
            taskId={task.id}
            taskType="shortTerm"
            taskTitle={task.title}
          />
        </div>
      )}
    />
  )
}
