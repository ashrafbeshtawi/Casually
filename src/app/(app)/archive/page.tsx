import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { type Priority, type TaskState, type Interval } from '@/types'
import { TaskCard } from '@/components/task-card'
import { Archive, FolderKanban, ListChecks, RefreshCw } from 'lucide-react'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const INTERVAL_LABELS: Record<string, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Biweekly',
  MONTHLY: 'Monthly',
  CUSTOM: 'Custom',
}

function getIntervalLabel(
  interval: Interval | null,
  customInterval: string | null
): string | null {
  if (!interval) return null
  if (interval === 'CUSTOM' && customInterval) return customInterval
  return INTERVAL_LABELS[interval] ?? null
}

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
  const [doneLongTerm, doneShortTerm, doneRoutines] = await Promise.all([
    prisma.longTermTask.findMany({
      where: {
        userId: user.id,
        state: 'DONE',
      },
      include: {
        _count: {
          select: { shortTermTasks: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.shortTermTask.findMany({
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
    prisma.routine.findMany({
      where: {
        state: 'DONE',
        OR: [
          {
            section: {
              userId: user.id,
            },
          },
          {
            sectionId: null,
          },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  const hasAnyItems =
    doneLongTerm.length > 0 ||
    doneShortTerm.length > 0 ||
    doneRoutines.length > 0

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
          {/* Projects (completed LongTermTasks) */}
          {doneLongTerm.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <FolderKanban className="text-muted-foreground h-5 w-5" />
                <h2 className="text-lg font-semibold">Projects</h2>
                <span className="text-muted-foreground text-sm">
                  ({doneLongTerm.length})
                </span>
              </div>
              <div className="grid gap-2">
                {doneLongTerm.map((task) => (
                  <div key={task.id} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <TaskCard
                        id={task.id}
                        title={task.title}
                        emoji={task.emoji}
                        priority={task.priority as Priority}
                        state={task.state as TaskState}
                        taskType="longTerm"
                        hasChildren={task._count.shortTermTasks > 0}
                        variant="compact"
                      />
                    </div>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {formatCompletionDate(task.updatedAt)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Tasks (completed ShortTermTasks) */}
          {doneShortTerm.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <ListChecks className="text-muted-foreground h-5 w-5" />
                <h2 className="text-lg font-semibold">Tasks</h2>
                <span className="text-muted-foreground text-sm">
                  ({doneShortTerm.length})
                </span>
              </div>
              <div className="grid gap-2">
                {doneShortTerm.map((task) => {
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
                          taskType="shortTerm"
                          variant="compact"
                        />
                      </div>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {formatCompletionDate(task.updatedAt)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Routines (completed Routines) */}
          {doneRoutines.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="text-muted-foreground h-5 w-5" />
                <h2 className="text-lg font-semibold">Routines</h2>
                <span className="text-muted-foreground text-sm">
                  ({doneRoutines.length})
                </span>
              </div>
              <div className="grid gap-2">
                {doneRoutines.map((routine) => (
                  <div key={routine.id} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <TaskCard
                        id={routine.id}
                        title={routine.title}
                        emoji={routine.emoji}
                        priority={routine.priority as Priority}
                        state={routine.state as TaskState}
                        taskType="routine"
                        intervalLabel={getIntervalLabel(
                          routine.interval as Interval | null,
                          routine.customInterval
                        )}
                        variant="compact"
                      />
                    </div>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {formatCompletionDate(routine.updatedAt)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
