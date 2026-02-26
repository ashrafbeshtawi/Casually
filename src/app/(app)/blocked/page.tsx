import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { type Priority, type TaskState } from '@/types'
import { TaskCard } from '@/components/task-card'
import { Ban, ArrowRight } from 'lucide-react'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BlockedPage() {
  const user = await getCurrentUser()
  if (!user?.id) {
    redirect('/login')
  }

  // Fetch all BLOCKED tasks across both types
  const [blockedLongRunning, blockedShortRunning] = await Promise.all([
    // BLOCKED LongRunningTasks owned by user
    prisma.longRunningTask.findMany({
      where: { userId: user.id, state: 'BLOCKED' },
      include: {
        blockedBy: {
          select: { id: true, title: true, emoji: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    // BLOCKED ShortRunningTasks whose parent is owned by user
    prisma.shortRunningTask.findMany({
      where: {
        state: 'BLOCKED',
        parent: { userId: user.id },
      },
      include: {
        parent: {
          select: { id: true, title: true, emoji: true },
        },
        blockedBy: {
          select: { id: true, title: true, emoji: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  const totalBlocked = blockedLongRunning.length + blockedShortRunning.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="bg-red-100 dark:bg-red-900/30 flex h-10 w-10 items-center justify-center rounded-lg">
            <Ban className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Blocked</h1>
            <p className="text-muted-foreground text-sm">
              {totalBlocked > 0
                ? `${totalBlocked} task${totalBlocked !== 1 ? 's' : ''} waiting on dependencies.`
                : 'All clear — nothing is blocked.'}
            </p>
          </div>
        </div>
      </div>

      {totalBlocked === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Ban className="text-muted-foreground/50 mb-3 h-10 w-10" />
          <p className="text-muted-foreground text-sm">
            No blocked tasks! Everything is flowing smoothly.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Projects (LongRunningTasks) */}
          {blockedLongRunning.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-muted-foreground text-sm font-semibold uppercase tracking-wide">
                Projects ({blockedLongRunning.length})
              </h2>
              <div className="grid gap-3">
                {blockedLongRunning.map((task) => {
                  const blockerName = task.blockedBy
                    ? (task.blockedBy.emoji
                        ? `${task.blockedBy.emoji} ${task.blockedBy.title}`
                        : task.blockedBy.title)
                    : null

                  return (
                    <div key={task.id} className="space-y-2">
                      <TaskCard
                        id={task.id}
                        title={task.title}
                        description={task.description}
                        emoji={task.emoji}
                        priority={task.priority as Priority}
                        state={task.state as TaskState}
                        blockerName={blockerName}
                        taskType="long"
                      />
                      {task.blockedBy && (
                        <div className="flex flex-wrap gap-2 pl-1">
                          <Link
                            href={`/projects/${task.blockedBy.id}`}
                            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs transition-colors hover:bg-accent"
                          >
                            <span className="max-w-[150px] sm:max-w-[200px] truncate">
                              {task.blockedBy.emoji ? `${task.blockedBy.emoji} ` : ''}{task.blockedBy.title}
                            </span>
                            <ArrowRight className="h-3 w-3 shrink-0" />
                          </Link>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Tasks (ShortRunningTasks) */}
          {blockedShortRunning.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-muted-foreground text-sm font-semibold uppercase tracking-wide">
                Tasks ({blockedShortRunning.length})
              </h2>
              <div className="grid gap-3">
                {blockedShortRunning.map((task) => {
                  const parentLabel = task.parent.emoji
                    ? `${task.parent.emoji} ${task.parent.title}`
                    : task.parent.title

                  const blockerName = task.blockedBy
                    ? (task.blockedBy.emoji
                        ? `${task.blockedBy.emoji} ${task.blockedBy.title}`
                        : task.blockedBy.title)
                    : null

                  return (
                    <div key={task.id} className="space-y-2">
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-xs">
                          in{' '}
                          <Link
                            href={`/projects/${task.parent.id}`}
                            className="hover:text-foreground underline underline-offset-2 transition-colors"
                          >
                            {parentLabel}
                          </Link>
                        </p>
                        <TaskCard
                          id={task.id}
                          title={task.title}
                          description={task.description}
                          emoji={task.emoji}
                          priority={task.priority as Priority}
                          state={task.state as TaskState}
                          blockerName={blockerName}
                          taskType="short"
                        />
                      </div>
                      {task.blockedBy && (
                        <div className="flex flex-wrap gap-2 pl-1">
                          <Link
                            href={`/projects/${task.parent.id}`}
                            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs transition-colors hover:bg-accent"
                          >
                            <span className="max-w-[150px] sm:max-w-[200px] truncate">
                              {task.blockedBy.emoji ? `${task.blockedBy.emoji} ` : ''}{task.blockedBy.title}
                            </span>
                            <ArrowRight className="h-3 w-3 shrink-0" />
                          </Link>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
