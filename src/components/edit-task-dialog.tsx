'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { SquarePen } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { TaskForm, type TaskFormData } from '@/components/task-form'
import type { Priority } from '@/types'

interface EditTaskDialogProps {
  taskId: string
  taskType: 'long' | 'short'
  defaultValues: {
    title: string
    description?: string | null
    emoji?: string | null
    priority: Priority
    parentId?: string
  }
  parents?: Array<{ id: string; title: string }>
  trigger?: React.ReactNode
  showLabel?: boolean
  onEdited?: () => void
}

const API_BASE: Record<string, string> = {
  long: '/api/tasks/long',
  short: '/api/tasks/short',
}

export function EditTaskDialog({
  taskId,
  taskType,
  defaultValues,
  parents,
  trigger,
  showLabel,
  onEdited,
}: EditTaskDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (data: TaskFormData) => {
    setIsLoading(true)
    try {
      const body: Record<string, unknown> = {
        title: data.title,
        description: data.description || null,
        emoji: data.emoji || null,
        priority: data.priority,
      }

      const res = await fetch(`${API_BASE[taskType]}/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update')
      }

      toast.success('Updated successfully')
      setOpen(false)
      onEdited?.()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          showLabel ? (
            <Button
              variant="ghost"
              size="xs"
              className="gap-1 px-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950"
              onClick={(e) => e.stopPropagation()}
              title="Edit"
            >
              <SquarePen className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Edit</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950"
              onClick={(e) => e.stopPropagation()}
              title="Edit"
            >
              <SquarePen className="h-3.5 w-3.5" />
            </Button>
          )
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {taskType === 'long' ? 'Project' : 'Task'}</DialogTitle>
        </DialogHeader>
        <TaskForm
          mode="edit"
          taskType={taskType}
          defaultValues={{
            title: defaultValues.title,
            description: defaultValues.description ?? undefined,
            emoji: defaultValues.emoji ?? undefined,
            priority: defaultValues.priority,
            parentId: defaultValues.parentId,
          }}
          parents={parents}
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  )
}
