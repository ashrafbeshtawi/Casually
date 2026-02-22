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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TaskForm, type TaskFormData } from '@/components/task-form'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

interface Section {
  id: string
  name: string
}

interface CreateRoutineDialogProps {
  sections: Section[]
  defaultSectionId?: string | null
}

export function CreateRoutineDialog({
  sections,
  defaultSectionId,
}: CreateRoutineDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [sectionId, setSectionId] = useState<string>(
    defaultSectionId ?? 'NONE'
  )
  const router = useRouter()

  async function handleSubmit(data: TaskFormData) {
    setIsLoading(true)
    try {
      const res = await fetch('/api/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          description: data.description || null,
          emoji: data.emoji || null,
          priority: data.priority,
          interval: data.interval || null,
          customInterval: data.customInterval || null,
          sectionId: sectionId === 'NONE' ? null : sectionId,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create routine')
      }

      setOpen(false)
      setSectionId(defaultSectionId ?? 'NONE')
      router.refresh()
      toast.success('Routine created')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create routine'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Routine
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Routine</DialogTitle>
        </DialogHeader>

        {/* Section selector */}
        <div className="space-y-2">
          <Label>Section</Label>
          <Select value={sectionId} onValueChange={setSectionId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">Unsorted</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TaskForm
          mode="create"
          taskType="routine"
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  )
}
