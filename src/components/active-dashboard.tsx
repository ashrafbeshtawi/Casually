'use client'

import { useCallback, useEffect, useState } from 'react'
import { type Priority, type TaskState, PRIORITY_COLORS } from '@/types'
import { TaskCard } from '@/components/task-card'
import { CreateShortTermTaskDialog } from '@/components/create-short-term-task-dialog'
import { Loader2, FolderKanban, Zap, RefreshCw } from 'lucide-react'

interface Project {
  id: string
  title: string
  description: string | null
  emoji: string | null
  priority: Priority
  state: TaskState
  _count: { children: number }
  children?: Task[]
}

interface Task {
  id: string
  title: string
  description: string | null
  emoji: string | null
  priority: Priority
  state: TaskState
  order: number
  parentId: string
  blockedById: string | null
  blockedBy?: { id: string; title: string; emoji: string | null } | null
}

const SPECIAL_TITLES = ['One-Off Tasks', 'Routines']

export function ActiveDashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeShortTasks, setActiveShortTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [projectsRes, tasksRes] = await Promise.all([
        fetch('/api/tasks/long?state=ACTIVE'),
        fetch('/api/tasks/short?state=ACTIVE'),
      ])

      if (!projectsRes.ok || !tasksRes.ok) throw new Error('Failed to fetch')

      const allProjects: Project[] = await projectsRes.json()
      const allTasks: Task[] = await tasksRes.json()

      setProjects(allProjects)
      setActiveShortTasks(allTasks)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    )
  }

  // Separate special projects from regular ones
  const oneOffProject = projects.find((p) => p.title === 'One-Off Tasks')
  const routinesProject = projects.find((p) => p.title === 'Routines')
  const allRegularProjects = projects.filter((p) => !SPECIAL_TITLES.includes(p.title))

  // Group active short tasks by parent
  const tasksByParent = new Map<string, Task[]>()
  for (const task of activeShortTasks) {
    const list = tasksByParent.get(task.parentId) ?? []
    list.push(task)
    tasksByParent.set(task.parentId, list)
  }

  const oneOffTasks = oneOffProject ? (tasksByParent.get(oneOffProject.id) ?? []) : []
  const routineTasks = routinesProject ? (tasksByParent.get(routinesProject.id) ?? []) : []

  // Only show projects that have at least one active subtask
  const regularProjects = allRegularProjects.filter(
    (p) => (tasksByParent.get(p.id) ?? []).length > 0
  )

  const hasProjects = regularProjects.length > 0
  const hasOneOffs = oneOffTasks.length > 0
  const hasRoutines = routineTasks.length > 0
  const hasAnything = hasProjects || hasOneOffs || hasRoutines

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {!hasAnything ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <p className="text-muted-foreground text-sm">
            No active items. Everything is either waiting or done!
          </p>
        </div>
      ) : (
        <>
          {/* Active Projects with their active subtasks */}
          {hasProjects && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <FolderKanban className="text-muted-foreground h-4 w-4" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Projects
                </h2>
              </div>
              <div className="space-y-3">
                {regularProjects.map((project) => {
                  const children = tasksByParent.get(project.id) ?? []
                  const borderColor = PRIORITY_COLORS[project.priority]

                  return (
                    <div
                      key={project.id}
                      className="bg-card text-card-foreground rounded-lg border shadow-sm border-l-[3px]"
                      style={{ borderLeftColor: borderColor }}
                    >
                      {/* Project header */}
                      <div className="flex items-center gap-2 px-3 py-2">
                        {project.emoji && (
                          <span className="shrink-0 text-sm">{project.emoji}</span>
                        )}
                        <span className="truncate text-sm font-medium">
                          {project.title}
                        </span>
                        {children.length > 0 && (
                          <span className="text-muted-foreground text-xs">
                            ({children.length} active)
                          </span>
                        )}
                        <CreateShortTermTaskDialog
                          parentId={project.id}
                          onCreated={fetchData}
                          variant="icon"
                        />
                      </div>

                      {/* Active subtasks */}
                      {children.length > 0 && (
                        <div className="border-t px-2 py-1.5 space-y-0.5">
                          {children.map((task) => (
                            <TaskCard
                              key={task.id}
                              id={task.id}
                              title={task.title}
                              emoji={task.emoji}
                              priority={task.priority}
                              state={task.state}
                              taskType="short"
                              parentId={task.parentId}
                              onActionComplete={fetchData}
                              variant="compact"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Active one-off tasks */}
          {hasOneOffs && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="text-muted-foreground h-4 w-4" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  One-Off Tasks
                </h2>
              </div>
              <div className="space-y-0.5">
                {oneOffTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    id={task.id}
                    title={task.title}
                    emoji={task.emoji}
                    priority={task.priority}
                    state={task.state}
                    taskType="short"
                    parentId={task.parentId}
                    onActionComplete={fetchData}
                    variant="compact"
                  />
                ))}
              </div>
            </section>
          )}

          {/* Active routines */}
          {hasRoutines && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="text-muted-foreground h-4 w-4" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Routines
                </h2>
              </div>
              <div className="space-y-0.5">
                {routineTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    id={task.id}
                    title={task.title}
                    emoji={task.emoji}
                    priority={task.priority}
                    state={task.state}
                    taskType="short"
                    parentId={task.parentId}
                    onActionComplete={fetchData}
                    variant="compact"
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
