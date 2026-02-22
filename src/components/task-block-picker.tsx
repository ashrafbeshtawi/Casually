'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { StateBadge } from '@/components/state-badge'
import { PriorityBadge } from '@/components/priority-badge'
import type { TaskState, Priority } from '@/types'
import { Loader2, Search, Ban } from 'lucide-react'
import { toast } from 'sonner'

interface TaskBlockPickerProps {
  taskId: string
  taskType: 'longTerm' | 'shortTerm' | 'routine'
  currentBlockedBy: Array<{ type: string; taskId: string }>
  open: boolean
  onOpenChange: (open: boolean) => void
  onBlockAdded?: () => void
}

interface TaskItem {
  id: string
  title: string
  emoji: string | null
  priority: Priority
  state: TaskState
}

function getListApiEndpoint(
  taskType: 'longTerm' | 'shortTerm' | 'routine'
): string {
  switch (taskType) {
    case 'longTerm':
      return '/api/long-term-tasks'
    case 'shortTerm':
      return '/api/short-term-tasks'
    case 'routine':
      return '/api/routines'
  }
}

function getBlockApiEndpoint(
  taskType: 'longTerm' | 'shortTerm' | 'routine',
  taskId: string
): string {
  switch (taskType) {
    case 'longTerm':
      return `/api/long-term-tasks/${taskId}/block`
    case 'shortTerm':
      return `/api/short-term-tasks/${taskId}/block`
    case 'routine':
      return `/api/routines/${taskId}/block`
  }
}

export function TaskBlockPicker({
  taskId,
  taskType,
  currentBlockedBy,
  open,
  onOpenChange,
  onBlockAdded,
}: TaskBlockPickerProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)
  const [isAddingBlock, setIsAddingBlock] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // IDs of tasks that are already blocking this task
  const alreadyBlockingIds = useMemo(
    () => new Set(currentBlockedBy.map((b) => b.taskId)),
    [currentBlockedBy]
  )

  // Fetch tasks when dialog opens
  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setError(null)
      return
    }

    async function fetchTasks() {
      setIsLoadingTasks(true)
      setError(null)
      try {
        const res = await fetch(getListApiEndpoint(taskType))
        if (!res.ok) {
          throw new Error('Failed to fetch tasks')
        }
        const data = await res.json()

        // Map to a consistent shape (API responses may vary)
        const mapped: TaskItem[] = data.map(
          (t: {
            id: string
            title: string
            emoji: string | null
            priority: string
            state: string
          }) => ({
            id: t.id,
            title: t.title,
            emoji: t.emoji,
            priority: t.priority as Priority,
            state: t.state as TaskState,
          })
        )

        setTasks(mapped)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load tasks'
        setError(message)
      } finally {
        setIsLoadingTasks(false)
      }
    }

    fetchTasks()
  }, [open, taskType])

  // Filter: exclude current task, already-blocking tasks, and apply search
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.id === taskId) return false
      if (alreadyBlockingIds.has(t.id)) return false
      if (searchQuery.trim()) {
        return t.title.toLowerCase().includes(searchQuery.toLowerCase())
      }
      return true
    })
  }, [tasks, taskId, alreadyBlockingIds, searchQuery])

  async function handleSelectBlocker(blockerTaskId: string) {
    setIsAddingBlock(true)
    setError(null)

    try {
      const res = await fetch(getBlockApiEndpoint(taskType, taskId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockerTaskId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add blocker')
      }

      onBlockAdded?.()
      onOpenChange(false)
      router.refresh()
      toast.success('Blocker added')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to add blocker'
      setError(message)
      toast.error(message)
    } finally {
      setIsAddingBlock(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Blocker</DialogTitle>
          <DialogDescription>
            Select a task that should block this one. This task will be set to
            Blocked until the blocker is completed.
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
            {error}
          </div>
        )}

        {/* Task list */}
        <div className="max-h-[40vh] overflow-y-auto">
          {isLoadingTasks ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Ban className="text-muted-foreground/50 mb-2 h-8 w-8" />
              <p className="text-muted-foreground text-sm">
                {searchQuery.trim()
                  ? 'No matching tasks found.'
                  : 'No available tasks to add as blockers.'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTasks.map((task) => (
                <Button
                  key={task.id}
                  variant="ghost"
                  className="h-auto w-full justify-start px-3 py-2"
                  disabled={isAddingBlock}
                  onClick={() => handleSelectBlocker(task.id)}
                >
                  <div className="flex w-full items-center gap-2">
                    {task.emoji && (
                      <span className="shrink-0 text-base">{task.emoji}</span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-left text-sm">
                      {task.title}
                    </span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <PriorityBadge priority={task.priority} size="sm" />
                      <StateBadge state={task.state} />
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
