'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type Priority, type TaskState } from '@/types'
import { TaskCard } from '@/components/task-card'
import { PriorityChanger } from '@/components/priority-changer'
import { StateChanger } from '@/components/state-changer'
import { EditTaskDialog } from '@/components/edit-task-dialog'
import { DeleteTaskButton } from '@/components/delete-task-button'
import { CreateShortTermTaskDialog } from '@/components/create-short-term-task-dialog'
import { SortableList, DragHandle } from '@/components/sortable-list'
import { MoveTaskButton } from '@/components/move-task-button'
import { reorderItems } from '@/lib/reorder'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const PROTECTED_TITLES = ['One-Off Tasks', 'Routines']

interface Project {
  id: string
  title: string
  description: string | null
  emoji: string | null
  priority: Priority
  state: TaskState
  blockedBy?: { id: string; title: string; emoji: string | null } | null
  children: Task[]
}

interface Task {
  id: string
  title: string
  description: string | null
  emoji: string | null
  priority: Priority
  state: TaskState
  order: number
  blockedById: string | null
  blockedBy?: { id: string; title: string; emoji: string | null } | null
}

interface ProjectDetailViewProps {
  projectId: string
}

export function ProjectDetailView({ projectId }: ProjectDetailViewProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/long/${projectId}`)
      if (!res.ok) {
        if (res.status === 404) {
          router.push('/projects')
          return
        }
        throw new Error('Failed to fetch project')
      }
      const data = await res.json()
      setProject(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project')
    } finally {
      setIsLoading(false)
    }
  }, [projectId, router])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  async function handleReorder(reordered: Task[]) {
    if (!project) return
    const previous = project.children
    setProject({ ...project, children: reordered })
    try {
      await reorderItems(reordered, '/api/tasks/short')
    } catch {
      setProject({ ...project, children: previous })
      toast.error('Failed to reorder tasks')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-destructive text-sm">{error || 'Project not found'}</p>
        </div>
      </div>
    )
  }

  const isProtected = PROTECTED_TITLES.includes(project.title)
  const children = project.children ?? []

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      {/* Project header */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {project.emoji && (
              <span className="text-3xl shrink-0">{project.emoji}</span>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight truncate">
                {project.title}
              </h1>
            </div>
          </div>
          {!isProtected && (
            <div className="flex shrink-0 items-center gap-2">
              <PriorityChanger
                taskId={project.id}
                currentPriority={project.priority}
                taskType="long"
                onPriorityChange={fetchProject}
              />
              <StateChanger
                taskId={project.id}
                currentState={project.state}
                taskType="long"
                hasChildren={children.length > 0}
                onStateChange={() => fetchProject()}
              />
              <EditTaskDialog
                taskId={project.id}
                taskType="long"
                defaultValues={{
                  title: project.title,
                  description: project.description,
                  emoji: project.emoji,
                  priority: project.priority,
                }}
                onEdited={fetchProject}
              />
              <DeleteTaskButton
                taskId={project.id}
                taskType="long"
                taskTitle={project.title}
                hasChildren={children.length > 0}
                redirectTo="/"
              />
            </div>
          )}
        </div>

        {project.description && (
          <p className="text-muted-foreground text-sm">
            {project.description}
          </p>
        )}

        {project.blockedBy && (
          <p className="text-muted-foreground text-xs">
            Blocked by: {project.blockedBy.emoji ? `${project.blockedBy.emoji} ` : ''}{project.blockedBy.title}
          </p>
        )}
      </div>

      {/* Short-running tasks section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Tasks ({children.length})
          </h2>
          <CreateShortTermTaskDialog parentId={project.id} onCreated={fetchProject} />
        </div>

        {children.length > 0 ? (
          <SortableList
            items={children}
            getItemId={(t) => t.id}
            onReorder={handleReorder}
            renderItem={(task, dragHandleProps) => {
              const blockerName = task.blockedBy
                ? (task.blockedBy.emoji
                    ? `${task.blockedBy.emoji} ${task.blockedBy.title}`
                    : task.blockedBy.title)
                : null

              return (
                <div className="flex items-center gap-1">
                  <DragHandle {...dragHandleProps} />
                  <div className="min-w-0 flex-1">
                    <TaskCard
                      id={task.id}
                      title={task.title}
                      description={task.description}
                      emoji={task.emoji}
                      priority={task.priority as Priority}
                      state={task.state as TaskState}
                      blockerName={blockerName}
                      taskType="short"
                      parentId={project.id}
                      showDelete
                      onActionComplete={fetchProject}
                      variant="compact"
                    />
                  </div>
                  <MoveTaskButton
                    taskId={task.id}
                    currentParentId={project.id}
                  />
                </div>
              )
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8">
            <p className="text-muted-foreground text-sm">
              No tasks yet. Add your first task to this project.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
