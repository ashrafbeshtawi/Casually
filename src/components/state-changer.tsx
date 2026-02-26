'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { type TaskState, STATE_LABELS } from '@/types'
import { getValidNextStates } from '@/lib/state-machine-client'
import { StateBadge } from '@/components/state-badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Button } from '@/components/ui/button'
import { ChevronDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface StateChangerProps {
  taskId: string
  currentState: TaskState
  taskType: 'long' | 'short'
  hasChildren?: boolean
  onStateChange?: (newState: TaskState) => void
  size?: 'default' | 'sm'
}

function getApiEndpoint(
  taskType: 'long' | 'short',
  taskId: string
): string {
  return `/api/tasks/${taskType}/${taskId}/state`
}

export function StateChanger({
  taskId,
  currentState,
  taskType,
  hasChildren = false,
  onStateChange,
  size = 'default',
}: StateChangerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingState, setPendingState] = useState<TaskState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const validNextStates = getValidNextStates(currentState)

  async function executeStateChange(newState: TaskState) {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(getApiEndpoint(taskType, taskId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to change state')
      }

      onStateChange?.(newState)
      router.refresh()
      toast.success('State updated')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to change state'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleStateSelect(newState: TaskState) {
    // If this is a long-running task with children and the new state is not ACTIVE,
    // show a confirmation dialog since children will be blocked
    if (
      taskType === 'long' &&
      hasChildren &&
      newState !== 'ACTIVE' &&
      currentState === 'ACTIVE'
    ) {
      setPendingState(newState)
      setShowConfirmDialog(true)
      return
    }

    executeStateChange(newState)
  }

  function handleConfirm() {
    if (pendingState) {
      executeStateChange(pendingState)
    }
    setShowConfirmDialog(false)
    setPendingState(null)
  }

  function handleCancelConfirm() {
    setShowConfirmDialog(false)
    setPendingState(null)
  }

  if (validNextStates.length === 0) {
    // No valid transitions; just show the badge
    return <StateBadge state={currentState} />
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size={size === 'sm' ? 'xs' : 'sm'}
            className="gap-1 px-1.5"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <StateBadge state={currentState} />
                <ChevronDown className="h-3 w-3 opacity-50" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="text-xs">
            Change state
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {validNextStates.map((state) => (
            <DropdownMenuItem
              key={state}
              onClick={() => handleStateSelect(state)}
            >
              <StateBadge state={state} />
              <span className="ml-1 text-xs">{STATE_LABELS[state]}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {error && (
        <span className="text-destructive text-xs">{error}</span>
      )}

      {/* Confirmation dialog for cascading state changes */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change project state?</AlertDialogTitle>
            <AlertDialogDescription>
              Changing this project&apos;s state away from Active will block all
              its sub-tasks. They will not be workable until the project is set
              back to Active. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelConfirm}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
