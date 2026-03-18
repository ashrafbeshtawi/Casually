'use client'

import { useCallback, useEffect, useState } from 'react'
import { type Priority, type TaskState, PRIORITY_COLORS, sortByPriority } from '@/types'
import { TaskCard } from '@/components/task-card'
import { Trophy, ChevronRight, ChevronDown, Loader2 } from 'lucide-react'

interface DoneProject {
  id: string
  title: string
  description: string | null
  emoji: string | null
  priority: Priority
  state: TaskState
  children: DoneTask[]
  _count: { children: number }
}

interface DoneTask {
  id: string
  title: string
  description: string | null
  emoji: string | null
  priority: Priority
  state: TaskState
  parentId: string
  parent?: { id: string; title: string; emoji: string | null }
}

interface GroupedTasks {
  parentId: string
  parentTitle: string
  parentEmoji: string | null
  tasks: DoneTask[]
}

export default function AchievementsPage() {
  const [doneProjects, setDoneProjects] = useState<DoneProject[]>([])
  const [taskGroups, setTaskGroups] = useState<GroupedTasks[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Track expanded projects (empty set = all collapsed by default)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    try {
      const [projectsRes, tasksRes] = await Promise.all([
        fetch('/api/tasks/long?state=DONE'),
        fetch('/api/tasks/short?state=DONE'),
      ])

      if (!projectsRes.ok || !tasksRes.ok) throw new Error('Failed to fetch')

      const projects: DoneProject[] = await projectsRes.json()
      const tasks: DoneTask[] = await tasksRes.json()

      // Fetch children for done projects
      const projectsWithChildren = await Promise.all(
        projects.map(async (p) => {
          try {
            const res = await fetch(`/api/tasks/long/${p.id}`)
            if (res.ok) {
              const data = await res.json()
              return { ...p, children: (data.children ?? []).filter((c: DoneTask) => c.state === 'DONE') }
            }
          } catch {}
          return { ...p, children: [] }
        })
      )

      setDoneProjects(sortByPriority(projectsWithChildren))

      // Group done tasks from non-done projects
      const doneProjectIds = new Set(projects.map((p) => p.id))
      const grouped = new Map<string, GroupedTasks>()
      for (const task of tasks) {
        if (doneProjectIds.has(task.parentId)) continue
        const existing = grouped.get(task.parentId)
        if (existing) {
          existing.tasks.push(task)
        } else {
          grouped.set(task.parentId, {
            parentId: task.parentId,
            parentTitle: task.parent?.title ?? 'Unknown',
            parentEmoji: task.parent?.emoji ?? null,
            tasks: [task],
          })
        }
      }
      setTaskGroups(Array.from(grouped.values()))

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
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Achievements</h1>
          <p className="text-muted-foreground text-sm">All your completed tasks in one place.</p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      </div>
    )
  }

  const hasAnyItems = doneProjects.length > 0 || taskGroups.length > 0

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Achievements</h1>
        <p className="text-muted-foreground text-sm">
          All your completed tasks in one place.
        </p>
      </div>

      {!hasAnyItems ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Trophy className="text-muted-foreground mb-3 h-10 w-10" />
          <p className="text-muted-foreground text-sm">
            No completed tasks yet. Start checking things off!
          </p>
        </div>
      ) : (
        <>
          {/* All project groups — both done projects and active projects with done tasks */}
          <div className="space-y-3">
            {[
              ...doneProjects.map((project) => ({
                id: project.id,
                title: project.title,
                emoji: project.emoji,
                priority: project.priority,
                tasks: project.children ?? [],
              })),
              ...taskGroups.map((group) => ({
                id: `group-${group.parentId}`,
                title: group.parentTitle,
                emoji: group.parentEmoji,
                priority: (group.tasks[0]?.priority ?? 'MEDIUM') as Priority,
                tasks: group.tasks,
              })),
            ].map((group) => {
              const borderColor = PRIORITY_COLORS[group.priority]
              const isExpanded = expandedProjects.has(group.id)

              return (
                <div
                  key={group.id}
                  className="bg-card text-card-foreground rounded-lg border shadow-sm border-l-[3px]"
                  style={{ borderLeftColor: borderColor }}
                >
                  {/* Project header — clickable to toggle */}
                  <div
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
                    onClick={() => {
                      setExpandedProjects((prev) => {
                        const next = new Set(prev)
                        if (next.has(group.id)) next.delete(group.id)
                        else next.add(group.id)
                        return next
                      })
                    }}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    {group.emoji && (
                      <span className="shrink-0 text-sm">{group.emoji}</span>
                    )}
                    <span className="truncate text-sm font-medium">
                      {group.title}
                    </span>
                    {group.tasks.length > 0 && (
                      <span className="text-muted-foreground text-xs">
                        ({group.tasks.length} done)
                      </span>
                    )}
                  </div>

                  {/* Done subtasks — only when expanded */}
                  {isExpanded && group.tasks.length > 0 && (
                    <div className="border-t px-2 py-1.5 space-y-0.5">
                      {group.tasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          id={task.id}
                          title={task.title}
                          description={task.description}
                          emoji={task.emoji}
                          priority={task.priority as Priority}
                          state={task.state as TaskState}
                          variant="compact"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
