import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { type Priority, type TaskState, PRIORITY_COLORS } from '@/types'
import { TaskCard } from '@/components/task-card'
import { Trophy, FolderKanban } from 'lucide-react'

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

  // IDs of done projects (to separate their children from orphan tasks)
  const doneProjectIds = new Set(doneLongRunning.map((p) => p.id))

  // Group done tasks from non-done projects
  const tasksByProject = new Map<string, { parent: { id: string; title: string; emoji: string | null }; tasks: typeof doneShortRunning }>()
  for (const task of doneShortRunning) {
    if (doneProjectIds.has(task.parent.id)) continue // shown under the project card
    const existing = tasksByProject.get(task.parent.id)
    if (existing) {
      existing.tasks.push(task)
    } else {
      tasksByProject.set(task.parent.id, { parent: task.parent, tasks: [task] })
    }
  }

  const hasAnyItems = doneLongRunning.length > 0 || doneShortRunning.length > 0

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
          {/* Completed Projects (dashboard-style container cards) */}
          {doneLongRunning.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <FolderKanban className="text-muted-foreground h-4 w-4" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Projects
                </h2>
              </div>
              <div className="space-y-3">
                {doneLongRunning.map((project) => {
                  const borderColor = PRIORITY_COLORS[project.priority as Priority]
                  const children = project.children ?? []

                  return (
                    <div
                      key={project.id}
                      className="bg-card text-card-foreground rounded-lg border shadow-sm border-l-[3px]"
                      style={{ borderLeftColor: borderColor }}
                    >
                      {/* Project header */}
                      <div className="flex items-center gap-2 px-3 py-2">
                        {project.emoji && (
                          <span className="shrink-0 text-sm">{project.emoji}</span>
                        )}
                        <span className="truncate text-sm font-medium">
                          {project.title}
                        </span>
                        {children.length > 0 && (
                          <span className="text-muted-foreground text-xs">
                            ({children.length} done)
                          </span>
                        )}
                      </div>

                      {/* Done subtasks */}
                      {children.length > 0 && (
                        <div className="border-t px-2 py-1.5 space-y-0.5">
                          {children.map((task) => (
                            <TaskCard
                              key={task.id}
                              id={task.id}
                              title={task.title}
                              emoji={task.emoji}
                              priority={task.priority as Priority}
                              state={task.state as TaskState}
                              taskType="short"
                              minimal
                              variant="compact"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Done tasks from active projects — grouped by project */}
          {Array.from(tasksByProject.values()).map(({ parent, tasks }) => {
            const projectLabel = parent.emoji
              ? `${parent.emoji} ${parent.title}`
              : parent.title

            return (
              <section key={parent.id} className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {projectLabel}
                </h3>
                <div className="space-y-0.5">
                  {tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      id={task.id}
                      title={task.title}
                      emoji={task.emoji}
                      priority={task.priority as Priority}
                      state={task.state as TaskState}
                      taskType="short"
                      minimal
                      variant="compact"
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </>
      )}
    </div>
  )
}
