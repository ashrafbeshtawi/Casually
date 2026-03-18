'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { type Priority, type TaskState, STATE_LABELS, sortByPriority } from '@/types'
import { CreateProjectDialog } from '@/components/create-project-dialog'
import { PriorityChanger } from '@/components/priority-changer'
import { StateChanger } from '@/components/state-changer'
import { EditTaskDialog } from '@/components/edit-task-dialog'
import { DeleteTaskButton } from '@/components/delete-task-button'
import { ProgressBar } from '@/components/progress-bar'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { PRIORITY_COLORS } from '@/types'

const FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: STATE_LABELS.ACTIVE },
  { value: 'WAITING', label: STATE_LABELS.WAITING },
  { value: 'BLOCKED', label: STATE_LABELS.BLOCKED },
  { value: 'DONE', label: STATE_LABELS.DONE },
]

const PROTECTED_TITLES = ['One-Off Tasks', 'Routines']

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
  const router = useRouter()

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

  const filtered = sortByPriority(
    projectStateFilter === 'ALL'
      ? allProjects
      : allProjects.filter((p) => p.state === projectStateFilter)
  )

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Top bar: filters + create */}
      <div className="flex items-center justify-between gap-3">
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
        <div className="grid gap-3">
          {filtered.map((project) => {
            const isProtected = PROTECTED_TITLES.includes(project.title)
            const borderColor = PRIORITY_COLORS[project.priority]

            return (
              <div
                key={project.id}
                className="bg-card text-card-foreground rounded-lg border shadow-sm border-l-[3px] cursor-pointer hover:bg-accent/50 transition-colors"
                style={{ borderLeftColor: borderColor }}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/projects/${project.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    router.push(`/projects/${project.id}`)
                  }
                }}
              >
                <div className="flex items-center gap-1.5 px-2 py-2 sm:px-3">
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    {project.emoji && <span className="shrink-0 text-sm">{project.emoji}</span>}
                    <span className="truncate text-sm font-medium">{project.title}</span>
                  </div>

                  <div
                    className="flex shrink-0 items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {project._count.children > 0 && (
                      <ProgressBar
                        done={0}
                        total={project._count.children}
                        priority={project.priority}
                      />
                    )}

                    {!isProtected && (
                      <div className="flex items-center rounded-md bg-muted/50 px-0.5">
                        <PriorityChanger
                          taskId={project.id}
                          currentPriority={project.priority}
                          taskType="long"
                          onPriorityChange={fetchProjects}
                          size="sm"
                        />
                        <StateChanger
                          taskId={project.id}
                          currentState={project.state}
                          taskType="long"
                          hasChildren={project._count.children > 0}
                          onStateChange={() => fetchProjects()}
                          size="sm"
                        />
                      </div>
                    )}

                    {!isProtected && (
                      <div className="flex items-center rounded-md bg-muted/50 px-0.5">
                        <EditTaskDialog
                          taskId={project.id}
                          taskType="long"
                          defaultValues={{
                            title: project.title,
                            description: project.description,
                            emoji: project.emoji,
                            priority: project.priority,
                          }}
                          onEdited={fetchProjects}
                          showLabel
                        />
                        <DeleteTaskButton
                          taskId={project.id}
                          taskType="long"
                          taskTitle={project.title}
                          hasChildren={project._count.children > 0}
                          onDeleted={fetchProjects}
                          showLabel
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {project.description && (
                  <p className="text-muted-foreground px-3 pb-2 text-xs leading-relaxed line-clamp-2">
                    {project.description}
                  </p>
                )}
              </div>
            )
          })}
        </div>
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
