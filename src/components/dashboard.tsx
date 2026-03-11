'use client'

import { useCallback, useEffect, useState } from 'react'
import { type Priority, type TaskState, STATE_LABELS } from '@/types'
import { CreateProjectDialog } from '@/components/create-project-dialog'
import { CollapsibleProjectCard } from '@/components/collapsible-project-card'
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
  collapsed: boolean
  blockedBy?: { id: string; title: string; emoji: string | null } | null
  _count: { children: number }
}

export function Dashboard() {
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projectStateFilter, setProjectStateFilter] = useState('ACTIVE')
  const [taskStateFilter, setTaskStateFilter] = useState('ACTIVE')
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks/long')
      if (!res.ok) throw new Error('Failed to fetch projects')
      const data = await res.json()
      setAllProjects(data)
      setRefreshKey((k) => k + 1)
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

  const filtered =
    projectStateFilter === 'ALL'
      ? allProjects
      : allProjects.filter((p) => p.state === projectStateFilter)

  async function handleReorder(reordered: Project[]) {
    const newAll = [...allProjects]
    for (const project of reordered) {
      const idx = newAll.findIndex((p) => p.id === project.id)
      if (idx !== -1) newAll[idx] = project
    }
    setAllProjects(newAll)

    try {
      await reorderItems(reordered, '/api/tasks/long')
      fetchProjects()
    } catch {
      fetchProjects()
      toast.error('Failed to reorder projects')
    }
  }

  async function handleToggleCollapse(projectId: string) {
    const project = allProjects.find((p) => p.id === projectId)
    if (!project) return
    const newCollapsed = !project.collapsed
    setAllProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, collapsed: newCollapsed } : p))
    )
    try {
      await fetch(`/api/tasks/long/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collapsed: newCollapsed }),
      })
    } catch {
      // revert on failure
      setAllProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, collapsed: !newCollapsed } : p))
      )
    }
  }

  async function handleMoveProject(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= filtered.length) return
    const reordered = [...filtered]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)
    handleReorder(reordered)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Top bar: filters + create */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium w-14 shrink-0">Projects:</span>
            <div className="flex flex-wrap gap-1">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setProjectStateFilter(option.value)}
                  className={cn(
                    'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                    projectStateFilter === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium w-14 shrink-0">Tasks:</span>
            <div className="flex flex-wrap gap-1">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTaskStateFilter(option.value)}
                  className={cn(
                    'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                    taskStateFilter === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <CreateProjectDialog onCreated={fetchProjects} />
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
          renderItem={(project, dragHandleProps) => {
            const index = filtered.indexOf(project)
            return (
              <CollapsibleProjectCard
                id={project.id}
                title={project.title}
                description={project.description}
                emoji={project.emoji}
                priority={project.priority}
                state={project.state}
                childCount={project._count.children}
                blockedBy={project.blockedBy}
                isCollapsed={project.collapsed}
                onToggle={() => handleToggleCollapse(project.id)}
                onActionComplete={fetchProjects}
                dragHandleProps={dragHandleProps}
                refreshKey={refreshKey}
                taskStateFilter={taskStateFilter}
                isFirst={index === 0}
                isLast={index === filtered.length - 1}
                onMoveUp={() => handleMoveProject(index, index - 1)}
                onMoveDown={() => handleMoveProject(index, index + 1)}
              />
            )
          }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-muted-foreground text-sm">
            {projectStateFilter === 'ALL'
              ? 'No projects yet. Create your first project to get started.'
              : `No ${STATE_LABELS[projectStateFilter as TaskState].toLowerCase()} projects.`}
          </p>
        </div>
      )}
    </div>
  )
}
