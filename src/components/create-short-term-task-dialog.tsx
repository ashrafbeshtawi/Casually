'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { TaskForm, type TaskFormData } from '@/components/task-form'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

interface CreateShortTermTaskDialogProps {
  parentId: string
  onCreated?: () => void
  variant?: 'default' | 'icon' | 'compact'
}

export function CreateShortTermTaskDialog({
  parentId,
  onCreated,
  variant = 'default',
}: CreateShortTermTaskDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(data: TaskFormData) {
    setIsLoading(true)
    try {
      const res = await fetch('/api/tasks/short', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          description: data.description || null,
          emoji: data.emoji || null,
          priority: data.priority,
          parentId,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create task')
      }

      setOpen(false)
      onCreated?.()
      router.refresh()
      toast.success('Task created')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create task'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === 'icon' ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-950"
            onClick={(e) => e.stopPropagation()}
            title="Add task"
          >
            <Plus className="h-4 w-4" />
          </Button>
        ) : variant === 'compact' ? (
          <Button
            variant="ghost"
            size="xs"
            className="gap-1 px-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-950"
            onClick={(e) => e.stopPropagation()}
            title="Add task"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Add</span>
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Short-Term Task</DialogTitle>
        </DialogHeader>
        <TaskForm
          mode="create"
          taskType="short"
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  )
}
