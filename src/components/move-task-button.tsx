'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ArrowRightLeft, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type LongTermTask, type Priority, PRIORITY_COLORS } from '@/types'

interface MoveTaskButtonProps {
  taskId: string
  currentParentId: string
}

export function MoveTaskButton({
  taskId,
  currentParentId,
}: MoveTaskButtonProps) {
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<LongTermTask[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (open) {
      setSelectedId(null)
      setIsLoadingProjects(true)
      fetch('/api/long-term-tasks')
        .then((res) => res.json())
        .then((data: LongTermTask[]) => {
          setProjects(data)
        })
        .catch((err) => {
          console.error('Failed to load projects:', err)
        })
        .finally(() => {
          setIsLoadingProjects(false)
        })
    }
  }, [open])

  async function handleMove() {
    if (!selectedId || selectedId === currentParentId) return

    setIsMoving(true)
    try {
      const res = await fetch(`/api/short-term-tasks/${taskId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newParentId: selectedId }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to move task')
      }

      setOpen(false)
      router.refresh()
    } catch (error) {
      console.error('Failed to move task:', error)
    } finally {
      setIsMoving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-xs" title="Move to another project">
          <ArrowRightLeft className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move Task</DialogTitle>
          <DialogDescription>
            Select a project to move this task to.
          </DialogDescription>
        </DialogHeader>

        {isLoadingProjects ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {projects.map((project) => {
              const isCurrent = project.id === currentParentId
              const isSelected = project.id === selectedId
              const borderColor = PRIORITY_COLORS[project.priority as Priority]

              return (
                <button
                  key={project.id}
                  onClick={() => {
                    if (!isCurrent) {
                      setSelectedId(project.id)
                    }
                  }}
                  disabled={isCurrent}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md border-l-[3px] px-3 py-2 text-left text-sm transition-colors',
                    isCurrent
                      ? 'bg-accent/50 text-muted-foreground cursor-default'
                      : isSelected
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-accent cursor-pointer'
                  )}
                  style={{
                    borderLeftColor: isSelected ? undefined : borderColor,
                  }}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {project.emoji && (
                      <span className="shrink-0 text-base">
                        {project.emoji}
                      </span>
                    )}
                    <span className="truncate font-medium">
                      {project.title}
                    </span>
                    {project.isOneOff && (
                      <span className="text-muted-foreground shrink-0 text-xs">
                        (One-Off)
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={cn(
                        'text-xs',
                        project.state === 'ACTIVE'
                          ? 'text-green-600'
                          : 'text-muted-foreground'
                      )}
                    >
                      {project.state}
                    </span>
                    {isCurrent && (
                      <span className="text-muted-foreground text-xs">
                        (current)
                      </span>
                    )}
                    {isSelected && (
                      <Check className="text-primary h-4 w-4" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleMove}
            disabled={
              !selectedId || selectedId === currentParentId || isMoving
            }
          >
            {isMoving ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Moving...
              </>
            ) : (
              'Move'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
