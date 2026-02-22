'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

/* ---------- Add Section ---------- */

export function AddSectionButton() {
  const [showInput, setShowInput] = useState(false)
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleCreate() {
    if (!name.trim()) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/routine-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create section')
      }
      setName('')
      setShowInput(false)
      router.refresh()
      toast.success('Section created')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create section'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!showInput) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowInput(true)}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Section
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Section name..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleCreate()
          if (e.key === 'Escape') {
            setShowInput(false)
            setName('')
          }
        }}
        className="h-8 w-48"
        autoFocus
        disabled={isLoading}
      />
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={handleCreate}
        disabled={isLoading || !name.trim()}
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={() => {
          setShowInput(false)
          setName('')
        }}
        disabled={isLoading}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

/* ---------- Edit Section Name ---------- */

interface EditSectionNameProps {
  sectionId: string
  currentName: string
}

export function EditSectionName({
  sectionId,
  currentName,
}: EditSectionNameProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(currentName)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleSave() {
    if (!name.trim() || name.trim() === currentName) {
      setEditing(false)
      setName(currentName)
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/routine-sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update section')
      }
      setEditing(false)
      router.refresh()
      toast.success('Section updated')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update section'
      toast.error(message)
      setName(currentName)
      setEditing(false)
    } finally {
      setIsLoading(false)
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-1">
        <h2 className="text-lg font-semibold">{currentName}</h2>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') {
            setEditing(false)
            setName(currentName)
          }
        }}
        className="h-8 w-48"
        autoFocus
        disabled={isLoading}
      />
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={handleSave}
        disabled={isLoading || !name.trim()}
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={() => {
          setEditing(false)
          setName(currentName)
        }}
        disabled={isLoading}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

/* ---------- Delete Section ---------- */

interface DeleteSectionButtonProps {
  sectionId: string
  sectionName: string
  routineCount: number
}

export function DeleteSectionButton({
  sectionId,
  sectionName,
  routineCount,
}: DeleteSectionButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/routine-sections/${sectionId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete section')
      }
      setShowConfirm(false)
      router.refresh()
      toast.success('Section deleted')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete section'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={() => setShowConfirm(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &ldquo;{sectionName}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {routineCount > 0
                ? `This section has ${routineCount} routine${routineCount > 1 ? 's' : ''}. Deleting it will move them to the Unsorted group. This action cannot be undone.`
                : 'This will permanently delete the section. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
