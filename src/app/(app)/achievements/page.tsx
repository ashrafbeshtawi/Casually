import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { type Priority, type TaskState, PRIORITY_COLORS } from '@/types'
import { TaskCard } from '@/components/task-card'
import { Trophy, FolderKanban } from 'lucide-react'

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

export default async function AchievementsPage() {
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
        children: {
          where: { state: 'DONE' },
          orderBy: { updatedAt: 'desc' },
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

  // Group done tasks by their parent project
  const tasksByProject = new Map<string, { parent: { id: string; title: string; emoji: string | null }; tasks: typeof doneShortRunning }>()
  for (const task of doneShortRunning) {
    const existing = tasksByProject.get(task.parent.id)
    if (existing) {
      existing.tasks.push(task)
    } else {
      tasksByProject.set(task.parent.id, { parent: task.parent, tasks: [task] })
    }
  }

  const hasAnyItems = doneLongRunning.length > 0 || doneShortRunning.length > 0

  return (
    <div className="space-y-8">
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
          {/* Completed Projects */}
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
                        minimal
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

          {/* Completed Tasks — grouped by project */}
          {tasksByProject.size > 0 && (
            <section className="space-y-6">
              {Array.from(tasksByProject.values()).map(({ parent, tasks }) => {
                const projectLabel = parent.emoji
                  ? `${parent.emoji} ${parent.title}`
                  : parent.title

                return (
                  <div key={parent.id} className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {projectLabel}
                    </h3>
                    <div className="grid gap-1">
                      {tasks.map((task) => (
                        <div key={task.id} className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <TaskCard
                              id={task.id}
                              title={task.title}
                              emoji={task.emoji}
                              priority={task.priority as Priority}
                              state={task.state as TaskState}
                              taskType="short"
                              minimal
                              variant="compact"
                            />
                          </div>
                          <span className="text-muted-foreground hidden shrink-0 text-xs sm:block">
                            {formatCompletionDate(task.updatedAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </section>
          )}
        </>
      )}
    </div>
  )
}
