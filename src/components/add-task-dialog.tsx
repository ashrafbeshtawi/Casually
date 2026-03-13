'use client'

import { useState, useEffect } from 'react'
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
import { type Priority, type TaskState } from '@/types'

interface Project {
  id: string
  title: string
  emoji: string | null
  priority: Priority
  state: TaskState
}

export function AddTaskDialog({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    if (!open) return
    fetch('/api/tasks/long?state=ACTIVE')
      .then((res) => res.json())
      .then((data) => setProjects(data))
      .catch(() => {})
  }, [open])

  async function handleSubmit(data: TaskFormData) {
    if (!data.parentId) {
      toast.error('Please select a project')
      return
    }
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
          parentId: data.parentId,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create task')
      }

      setOpen(false)
      onCreated?.()
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
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
        </DialogHeader>
        <TaskForm
          mode="create"
          taskType="short"
          parents={projects.map((p) => ({ id: p.id, title: p.emoji ? `${p.emoji} ${p.title}` : p.title }))}
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  )
}
