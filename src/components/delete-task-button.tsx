'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { cn } from '@/lib/utils'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface DeleteTaskButtonProps {
  taskId: string
  taskType: 'long' | 'short'
  taskTitle: string
  hasChildren?: boolean
  onDeleted?: () => void
  redirectTo?: string
  size?: 'default' | 'sm' | 'icon'
  showLabel?: boolean
}

const API_PATHS: Record<DeleteTaskButtonProps['taskType'], string> = {
  long: '/api/tasks/long',
  short: '/api/tasks/short',
}

function getConfirmMessage(
  taskType: DeleteTaskButtonProps['taskType'],
  hasChildren?: boolean
): { title: string; description: string } {
  if (taskType === 'long' && hasChildren) {
    return {
      title: 'Delete project?',
      description:
        'Are you sure you want to delete this project? This will also delete all its sub-tasks. This action cannot be undone.',
    }
  }

  if (taskType === 'long') {
    return {
      title: 'Delete project?',
      description:
        'Are you sure you want to delete this project? This action cannot be undone.',
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
  showLabel,
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

  const buttonSize = showLabel ? 'xs' as const : size === 'icon' ? 'icon-xs' as const : size

  return (
    <>
      <Button
        variant="ghost"
        size={buttonSize}
        className={cn(
          'text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-950',
          showLabel && 'gap-1 px-1.5'
        )}
        onClick={(e) => {
          e.stopPropagation()
          setShowConfirm(true)
        }}
        title={`Delete ${taskTitle}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {showLabel && <span className="text-xs font-medium">Delete</span>}
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
