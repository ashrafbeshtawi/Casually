'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmojiPicker } from '@/components/emoji-picker'
import {
  type Priority,
  type TaskState,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATE_LABELS,
} from '@/types'

export interface TaskFormData {
  title: string
  description: string
  emoji: string
  priority: Priority
  parentId?: string
  state?: TaskState
}

interface TaskFormProps {
  mode: 'create' | 'edit'
  taskType: 'long' | 'short'
  defaultValues?: {
    title?: string
    description?: string
    emoji?: string
    priority?: Priority
    parentId?: string
  }
  parents?: Array<{ id: string; title: string }>
  onSubmit: (data: TaskFormData) => void
  onCancel: () => void
  isLoading?: boolean
}

const PRIORITIES: Priority[] = ['HIGHEST', 'HIGH', 'MEDIUM', 'LOW', 'LOWEST']
const STATES: TaskState[] = ['ACTIVE', 'WAITING', 'BLOCKED', 'DONE']

export function TaskForm({
  mode,
  taskType,
  defaultValues,
  parents,
  onSubmit,
  onCancel,
  isLoading = false,
}: TaskFormProps) {
  const [title, setTitle] = useState(defaultValues?.title ?? '')
  const [description, setDescription] = useState(
    defaultValues?.description ?? ''
  )
  const [emoji, setEmoji] = useState(defaultValues?.emoji ?? '')
  const [priority, setPriority] = useState<Priority>(
    defaultValues?.priority ?? 'MEDIUM'
  )
  const [parentId, setParentId] = useState(defaultValues?.parentId ?? '')
  const [state, setState] = useState<TaskState>('WAITING')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const data: TaskFormData = {
      title: title.trim(),
      description: description.trim(),
      emoji: emoji.trim(),
      priority,
    }

    if (taskType === 'short' && parentId) {
      data.parentId = parentId
    }

    if (taskType === 'long' && mode === 'create') {
      data.state = state
    }

    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Optional description..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      {/* Emoji */}
      <div className="space-y-2">
        <Label>Emoji</Label>
        <EmojiPicker
          value={emoji || null}
          onChange={(val) => setEmoji(val ?? '')}
        />
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <Select
          value={priority}
          onValueChange={(value) => setPriority(value as Priority)}
        >
          <SelectTrigger id="priority" className="w-full">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                <span className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: PRIORITY_COLORS[p] }}
                  />
                  {PRIORITY_LABELS[p]}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Parent selector (short tasks only) */}
      {taskType === 'short' && parents && parents.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="parent">Parent Task</Label>
          <Select value={parentId} onValueChange={setParentId}>
            <SelectTrigger id="parent" className="w-full">
              <SelectValue placeholder="Select parent task" />
            </SelectTrigger>
            <SelectContent>
              {parents.map((parent) => (
                <SelectItem key={parent.id} value={parent.id}>
                  {parent.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* State selector (long tasks, create mode only) */}
      {taskType === 'long' && mode === 'create' && (
        <div className="space-y-2">
          <Label htmlFor="state">Initial State</Label>
          <Select
            value={state}
            onValueChange={(value) => setState(value as TaskState)}
          >
            <SelectTrigger id="state" className="w-full">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {STATES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !title.trim()}>
          {isLoading
            ? mode === 'create'
              ? 'Creating...'
              : 'Saving...'
            : mode === 'create'
              ? 'Create'
              : 'Save'}
        </Button>
      </div>
    </form>
  )
}
