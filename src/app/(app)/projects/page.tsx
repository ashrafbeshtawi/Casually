import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { type Priority, type TaskState } from '@/types'
import { ProjectCardLink } from '@/components/project-card-link'
import { ProjectListFilters } from '@/components/project-list-filters'
import { CreateProjectDialog } from '@/components/create-project-dialog'

interface ProjectsPageProps {
  searchParams: Promise<{ state?: string; priority?: string }>
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const user = await getCurrentUser()
  if (!user?.id) {
    redirect('/login')
  }

  const params = await searchParams
  const stateFilter = params.state as TaskState | undefined
  const priorityFilter = params.priority as Priority | undefined

  const where: Record<string, unknown> = {
    userId: user.id,
  }

  if (stateFilter && ['ACTIVE', 'WAITING', 'BLOCKED', 'DONE'].includes(stateFilter)) {
    where.state = stateFilter
  }

  if (priorityFilter && ['HIGHEST', 'HIGH', 'MEDIUM', 'LOW', 'LOWEST'].includes(priorityFilter)) {
    where.priority = priorityFilter
  }

  const tasks = await prisma.longTermTask.findMany({
    where,
    include: {
      _count: {
        select: { shortTermTasks: true },
      },
    },
    orderBy: { order: 'asc' },
  })

  // Separate One-Off Tasks to pin at top
  const oneOffTask = tasks.find((t) => t.isOneOff)
  const regularTasks = tasks.filter((t) => !t.isOneOff)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm">
            Manage your long-term projects and goals.
          </p>
        </div>
        <CreateProjectDialog />
      </div>

      {/* Filters */}
      <Suspense fallback={null}>
        <ProjectListFilters />
      </Suspense>

      {/* One-Off Tasks pinned at top */}
      {oneOffTask && (
        <div>
          <ProjectCardLink
            id={oneOffTask.id}
            title={oneOffTask.title}
            description={oneOffTask.description}
            emoji={oneOffTask.emoji}
            priority={oneOffTask.priority as Priority}
            state={oneOffTask.state as TaskState}
            isOneOff={true}
            shortTermTaskCount={oneOffTask._count.shortTermTasks}
          />
        </div>
      )}

      {/* Regular projects */}
      {regularTasks.length > 0 ? (
        <div className="grid gap-3">
          {regularTasks.map((task) => (
            <ProjectCardLink
              key={task.id}
              id={task.id}
              title={task.title}
              description={task.description}
              emoji={task.emoji}
              priority={task.priority as Priority}
              state={task.state as TaskState}
              isOneOff={false}
              shortTermTaskCount={task._count.shortTermTasks}
            />
          ))}
        </div>
      ) : (
        !oneOffTask && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <p className="text-muted-foreground text-sm">
              No projects yet. Create your first project to get started.
            </p>
          </div>
        )
      )}
    </div>
  )
}
