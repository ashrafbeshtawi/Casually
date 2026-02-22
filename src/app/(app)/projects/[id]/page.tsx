import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { type Priority, type TaskState } from '@/types'
import { PriorityBadge } from '@/components/priority-badge'
import { StateChanger } from '@/components/state-changer'
import { CreateShortTermTaskDialog } from '@/components/create-short-term-task-dialog'
import { SortableTaskList } from '@/components/sortable-task-list'
import { ArrowLeft } from 'lucide-react'

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const user = await getCurrentUser()
  if (!user?.id) {
    redirect('/login')
  }

  const { id } = await params

  const project = await prisma.longTermTask.findFirst({
    where: {
      id,
      userId: user.id,
    },
    include: {
      shortTermTasks: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!project) {
    notFound()
  }

  const blockedBy = project.blockedBy as Array<{
    type: string
    taskId: string
  }>

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Link
        href="/projects"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      {/* Project header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {project.emoji && (
              <span className="text-3xl">{project.emoji}</span>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {project.title}
              </h1>
              {project.isOneOff && (
                <span className="text-primary text-xs font-medium">
                  One-Off Tasks
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PriorityBadge
              priority={project.priority as Priority}
              showLabel
            />
            <StateChanger
              taskId={project.id}
              currentState={project.state as TaskState}
              taskType="longTerm"
              hasChildren={project.shortTermTasks.length > 0}
            />
          </div>
        </div>

        {project.description && (
          <p className="text-muted-foreground text-sm">
            {project.description}
          </p>
        )}

        {blockedBy.length > 0 && (
          <p className="text-muted-foreground text-xs">
            Blocked by {blockedBy.length} task
            {blockedBy.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Short-term tasks section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Tasks ({project.shortTermTasks.length})
          </h2>
          <CreateShortTermTaskDialog parentId={project.id} />
        </div>

        {project.shortTermTasks.length > 0 ? (
          <SortableTaskList
            parentId={project.id}
            tasks={project.shortTermTasks.map((task) => ({
              id: task.id,
              title: task.title,
              description: task.description,
              emoji: task.emoji,
              priority: task.priority as Priority,
              state: task.state as TaskState,
              blockedBy: (task.blockedBy ?? []) as Array<{
                type: string
                taskId: string
              }>,
              parentId: project.id,
            }))}
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
