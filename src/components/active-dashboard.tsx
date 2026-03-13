'use client'

import { useCallback, useEffect, useState } from 'react'
import { type Priority, type TaskState, PRIORITY_COLORS } from '@/types'
import { TaskCard } from '@/components/task-card'
import { CreateShortTermTaskDialog } from '@/components/create-short-term-task-dialog'
import { AddTaskDialog } from '@/components/add-task-dialog'
import { Loader2, ChevronRight, ChevronDown } from 'lucide-react'

interface Project {
  id: string
  title: string
  description: string | null
  emoji: string | null
  priority: Priority
  state: TaskState
  collapsed: boolean
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

  async function handleToggleCollapse(projectId: string) {
    const project = projects.find((p) => p.id === projectId)
    if (!project) return
    const newCollapsed = !project.collapsed
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, collapsed: newCollapsed } : p))
    )
    try {
      await fetch(`/api/tasks/long/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collapsed: newCollapsed }),
      })
    } catch {
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, collapsed: !newCollapsed } : p))
      )
    }
  }

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

  // Group active short tasks by parent
  const tasksByParent = new Map<string, Task[]>()
  for (const task of activeShortTasks) {
    const list = tasksByParent.get(task.parentId) ?? []
    list.push(task)
    tasksByParent.set(task.parentId, list)
  }

  // Show projects that have at least one active subtask, in server order
  const visibleProjects = projects.filter(
    (p) => (tasksByParent.get(p.id) ?? []).length > 0
  )

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex items-center justify-end">
        <AddTaskDialog onCreated={fetchData} />
      </div>
      {visibleProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <p className="text-muted-foreground text-sm">
            No active items. Everything is either waiting or done!
          </p>
        </div>
      ) : (
        visibleProjects.map((project) => {
          const children = tasksByParent.get(project.id) ?? []
          const borderColor = PRIORITY_COLORS[project.priority]

          return (
            <div
              key={project.id}
              className="bg-card text-card-foreground rounded-lg border shadow-sm border-l-[3px]"
              style={{ borderLeftColor: borderColor }}
            >
              {/* Project header */}
              <div
                className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
                onClick={() => handleToggleCollapse(project.id)}
              >
                {project.collapsed ? (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
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
                <div onClick={(e) => e.stopPropagation()}>
                  <CreateShortTermTaskDialog
                    parentId={project.id}
                    onCreated={fetchData}
                    variant="icon"
                  />
                </div>
              </div>

              {/* Active subtasks */}
              {!project.collapsed && children.length > 0 && (
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
                      hideEdit
                      variant="compact"
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
