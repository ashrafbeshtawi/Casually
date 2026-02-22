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

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(data: TaskFormData) {
    setIsLoading(true)
    try {
      const res = await fetch('/api/long-term-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          description: data.description || null,
          emoji: data.emoji || null,
          priority: data.priority,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create project')
      }

      setOpen(false)
      router.refresh()
    } catch (error) {
      console.error('Failed to create project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <TaskForm
          mode="create"
          taskType="longTerm"
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  )
}
