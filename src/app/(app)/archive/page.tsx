import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { type Priority, type TaskState } from '@/types'
import { TaskCard } from '@/components/task-card'
import { Archive, FolderKanban, ListChecks } from 'lucide-react'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCompletionDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ArchivePage() {
  const user = await getCurrentUser()
  if (!user?.id) {
    redirect('/login')
  }

  // Fetch all DONE items in parallel
  const [doneLongRunning, doneShortRunning] = await Promise.all([
    prisma.longRunningTask.findMany({
      where: {
        userId: user.id,
        state: 'DONE',
      },
      include: {
        _count: {
          select: { children: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.shortRunningTask.findMany({
      where: {
        state: 'DONE',
        parent: { userId: user.id },
      },
      include: {
        parent: {
          select: { id: true, title: true, emoji: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  const hasAnyItems = doneLongRunning.length > 0 || doneShortRunning.length > 0

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Archive</h1>
        <p className="text-muted-foreground text-sm">
          All your completed tasks in one place.
        </p>
      </div>

      {!hasAnyItems ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Archive className="text-muted-foreground mb-3 h-10 w-10" />
          <p className="text-muted-foreground text-sm">
            No completed tasks yet. Start checking things off!
          </p>
        </div>
      ) : (
        <>
          {/* Projects (completed LongRunningTasks) */}
          {doneLongRunning.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <FolderKanban className="text-muted-foreground h-5 w-5" />
                <h2 className="text-lg font-semibold">Projects</h2>
                <span className="text-muted-foreground text-sm">
                  ({doneLongRunning.length})
                </span>
              </div>
              <div className="grid gap-2">
                {doneLongRunning.map((task) => (
                  <div key={task.id} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <TaskCard
                        id={task.id}
                        title={task.title}
                        emoji={task.emoji}
                        priority={task.priority as Priority}
                        state={task.state as TaskState}
                        taskType="long"
                        hasChildren={task._count.children > 0}
                        variant="compact"
                      />
                    </div>
                    <span className="text-muted-foreground hidden shrink-0 text-xs sm:block">
                      {formatCompletionDate(task.updatedAt)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Tasks (completed ShortRunningTasks) */}
          {doneShortRunning.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <ListChecks className="text-muted-foreground h-5 w-5" />
                <h2 className="text-lg font-semibold">Tasks</h2>
                <span className="text-muted-foreground text-sm">
                  ({doneShortRunning.length})
                </span>
              </div>
              <div className="grid gap-2">
                {doneShortRunning.map((task) => {
                  const parentLabel = task.parent.emoji
                    ? `${task.parent.emoji} ${task.parent.title}`
                    : task.parent.title

                  return (
                    <div key={task.id} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <TaskCard
                          id={task.id}
                          title={task.title}
                          description={parentLabel}
                          emoji={task.emoji}
                          priority={task.priority as Priority}
                          state={task.state as TaskState}
                          taskType="short"
                          variant="compact"
                        />
                      </div>
                      <span className="text-muted-foreground hidden shrink-0 text-xs sm:block">
                        {formatCompletionDate(task.updatedAt)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
