'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { type Priority, PRIORITY_COLORS, PRIORITY_LABELS } from '@/types'
import { PriorityBadge } from '@/components/priority-badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ChevronDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const ALL_PRIORITIES: Priority[] = ['HIGHEST', 'HIGH', 'MEDIUM', 'LOW', 'LOWEST']

interface PriorityChangerProps {
  taskId: string
  currentPriority: Priority
  taskType: 'long' | 'short'
  onPriorityChange?: () => void
  size?: 'default' | 'sm'
}

export function PriorityChanger({
  taskId,
  currentPriority,
  taskType,
  onPriorityChange,
  size = 'default',
}: PriorityChangerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleSelect(newPriority: Priority) {
    if (newPriority === currentPriority) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/tasks/${taskType}/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to change priority')
      }

      onPriorityChange?.()
      router.refresh()
      toast.success('Priority updated')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to change priority'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={size === 'sm' ? 'xs' : 'sm'}
          className="gap-1 px-1.5"
          disabled={isLoading}
          onClick={(e) => e.stopPropagation()}
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <PriorityBadge priority={currentPriority} size="sm" showLabel />
              <ChevronDown className="h-3 w-3 opacity-50" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="text-xs">
          Change priority
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ALL_PRIORITIES.map((p) => (
          <DropdownMenuItem
            key={p}
            onClick={(e) => {
              e.stopPropagation()
              handleSelect(p)
            }}
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: PRIORITY_COLORS[p] }}
            />
            <span className="ml-1.5 text-xs">{PRIORITY_LABELS[p]}</span>
            {p === currentPriority && (
              <span className="text-muted-foreground ml-auto text-xs">current</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
