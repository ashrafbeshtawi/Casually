'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface DeleteTaskButtonProps {
  taskId: string
  taskType: 'longTerm' | 'shortTerm' | 'routine'
  taskTitle: string
  hasChildren?: boolean
  onDeleted?: () => void
  redirectTo?: string
  size?: 'default' | 'sm' | 'icon'
}

const API_PATHS: Record<DeleteTaskButtonProps['taskType'], string> = {
  longTerm: '/api/long-term-tasks',
  shortTerm: '/api/short-term-tasks',
  routine: '/api/routines',
}

function getConfirmMessage(
  taskType: DeleteTaskButtonProps['taskType'],
  hasChildren?: boolean
): { title: string; description: string } {
  if (taskType === 'longTerm' && hasChildren) {
    return {
      title: 'Delete project?',
      description:
        'Are you sure you want to delete this project? This will also delete all its sub-tasks. This action cannot be undone.',
    }
  }

  if (taskType === 'longTerm') {
    return {
      title: 'Delete project?',
      description:
        'Are you sure you want to delete this project? This action cannot be undone.',
    }
  }

  if (taskType === 'routine') {
    return {
      title: 'Delete routine?',
      description:
        'Are you sure you want to delete this routine? This action cannot be undone.',
    }
  }

  return {
    title: 'Delete task?',
    description:
      'Are you sure you want to delete this task? This action cannot be undone.',
  }
}

export function DeleteTaskButton({
  taskId,
  taskType,
  taskTitle,
  hasChildren,
  onDeleted,
  redirectTo,
  size = 'icon',
}: DeleteTaskButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const { title, description } = getConfirmMessage(taskType, hasChildren)

  async function handleDelete() {
    setIsLoading(true)
    try {
      const res = await fetch(`${API_PATHS[taskType]}/${taskId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete')
      }
      setShowConfirm(false)
      toast.success('Deleted successfully')
      if (onDeleted) {
        onDeleted()
      } else if (redirectTo) {
        router.push(redirectTo)
      } else {
        router.refresh()
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const buttonSize = size === 'icon' ? 'icon-xs' as const : size

  return (
    <>
      <Button
        variant="ghost"
        size={buttonSize}
        className="text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation()
          setShowConfirm(true)
        }}
        title={`Delete ${taskTitle}`}
      >
        <Trash2 className="h-3 w-3" />
      </Button>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title={title}
        description={description}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={isLoading}
      />
    </>
  )
}
