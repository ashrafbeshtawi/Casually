import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { type Priority, type TaskState } from '@/types'
import { PriorityBadge } from '@/components/priority-badge'
import { StateChanger } from '@/components/state-changer'
import { CreateShortTermTaskDialog } from '@/components/create-short-term-task-dialog'
import { DeleteTaskButton } from '@/components/delete-task-button'
import { SortableTaskList } from '@/components/sortable-task-list'
import { EditTaskDialog } from '@/components/edit-task-dialog'
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

  const project = await prisma.longRunningTask.findFirst({
    where: {
      id,
      userId: user.id,
    },
    include: {
      children: {
        orderBy: { order: 'asc' },
        include: {
          blockedBy: {
            select: { id: true, title: true, emoji: true },
          },
        },
      },
      blockedBy: {
        select: { id: true, title: true, emoji: true },
      },
    },
  })

  if (!project) {
    notFound()
  }

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
          <div className="flex shrink-0 items-center gap-2">
            <PriorityBadge
              priority={project.priority as Priority}
              showLabel
            />
            <StateChanger
              taskId={project.id}
              currentState={project.state as TaskState}
              taskType="long"
              hasChildren={project.children.length > 0}
            />
            <EditTaskDialog
              taskId={project.id}
              taskType="long"
              defaultValues={{
                title: project.title,
                description: project.description,
                emoji: project.emoji,
                priority: project.priority as Priority,
              }}
            />
            <DeleteTaskButton
              taskId={project.id}
              taskType="long"
              taskTitle={project.title}
              hasChildren={project.children.length > 0}
              redirectTo="/projects"
            />
          </div>
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
            Tasks ({project.children.length})
          </h2>
          <CreateShortTermTaskDialog parentId={project.id} />
        </div>

        {project.children.length > 0 ? (
          <SortableTaskList
            parentId={project.id}
            tasks={project.children.map((task) => ({
              id: task.id,
              title: task.title,
              description: task.description,
              emoji: task.emoji,
              priority: task.priority as Priority,
              state: task.state as TaskState,
              blockedById: task.blockedById,
              blockerName: task.blockedBy
                ? (task.blockedBy.emoji ? `${task.blockedBy.emoji} ${task.blockedBy.title}` : task.blockedBy.title)
                : null,
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
