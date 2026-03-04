'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { type Priority, type TaskState, STATE_LABELS } from '@/types'
import { ProjectCardLink } from '@/components/project-card-link'
import { CreateProjectDialog } from '@/components/create-project-dialog'
import { SortableList, DragHandle } from '@/components/sortable-list'
import { reorderItems } from '@/lib/reorder'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: STATE_LABELS.ACTIVE },
  { value: 'WAITING', label: STATE_LABELS.WAITING },
  { value: 'BLOCKED', label: STATE_LABELS.BLOCKED },
  { value: 'DONE', label: STATE_LABELS.DONE },
]

interface Project {
  id: string
  title: string
  description: string | null
  emoji: string | null
  priority: Priority
  state: TaskState
  _count: { children: number }
}

export function ProjectsDashboard() {
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stateFilter, setStateFilter] = useState('ALL')

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks/long')
      if (!res.ok) throw new Error('Failed to fetch projects')
      const data = await res.json()
      setAllProjects(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const filtered = stateFilter === 'ALL'
    ? allProjects
    : allProjects.filter((p) => p.state === stateFilter)

  async function handleReorder(reordered: Project[]) {
    // Optimistically update filtered view AND the full list
    const reorderedIds = reordered.map((p) => p.id)
    const newAll = [...allProjects]
    // Update order for reordered items based on their new position
    for (const project of reordered) {
      const idx = newAll.findIndex((p) => p.id === project.id)
      if (idx !== -1) newAll[idx] = project
    }
    setAllProjects(newAll)

    try {
      await reorderItems(reordered, '/api/tasks/long')
      // Re-fetch to get consistent order
      fetchProjects()
    } catch {
      fetchProjects()
      toast.error('Failed to reorder projects')
    }
  }

  return (
    <div className="space-y-6">
      {/* Create button */}
      <div className="flex justify-end">
        <CreateProjectDialog onCreated={fetchProjects} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setStateFilter(option.value)}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors',
              stateFilter === option.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Projects */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      ) : filtered.length > 0 ? (
        <SortableList
          items={filtered}
          getItemId={(p) => p.id}
          onReorder={handleReorder}
          renderItem={(project, dragHandleProps) => (
            <div className="flex items-center gap-1">
              <DragHandle {...dragHandleProps} />
              <div className="min-w-0 flex-1">
                <ProjectCardLink
                  id={project.id}
                  title={project.title}
                  description={project.description}
                  emoji={project.emoji}
                  priority={project.priority as Priority}
                  state={project.state as TaskState}
                  shortTermTaskCount={project._count.children}
                  onActionComplete={fetchProjects}
                />
              </div>
            </div>
          )}
        />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-muted-foreground text-sm">
            {stateFilter === 'ALL'
              ? 'No projects yet. Create your first project to get started.'
              : `No ${STATE_LABELS[stateFilter as TaskState].toLowerCase()} projects.`}
          </p>
        </div>
      )}
    </div>
  )
}
