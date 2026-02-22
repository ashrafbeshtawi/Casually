import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { type Priority, type TaskState, type Interval } from '@/types'
import { TaskCard } from '@/components/task-card'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FolderKanban,
  ListChecks,
  Ban,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Clock,
} from 'lucide-react'

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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user?.id) {
    redirect('/login')
  }

  // Fetch all data in parallel
  const [
    activeProjects,
    activeShortTermTasks,
    blockedLongTerm,
    blockedShortTerm,
    blockedRoutines,
    completedLongTerm,
    completedShortTerm,
    completedRoutines,
    activeRoutines,
    recentlyCompletedShort,
    recentlyCompletedRoutines,
  ] = await Promise.all([
    // Active projects count
    prisma.longTermTask.findMany({
      where: { userId: user.id, state: 'ACTIVE' },
      select: { id: true },
    }),
    // Active short-term tasks (with parent info for grouping)
    prisma.shortTermTask.findMany({
      where: {
        state: 'ACTIVE',
        parent: { userId: user.id },
      },
      include: {
        parent: {
          select: { id: true, title: true, emoji: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
    // Blocked counts
    prisma.longTermTask.count({
      where: { userId: user.id, state: 'BLOCKED' },
    }),
    prisma.shortTermTask.count({
      where: {
        state: 'BLOCKED',
        parent: { userId: user.id },
      },
    }),
    prisma.routine.count({
      where: {
        state: 'BLOCKED',
        section: { userId: user.id },
      },
    }),
    // Completed counts
    prisma.longTermTask.count({
      where: { userId: user.id, state: 'DONE' },
    }),
    prisma.shortTermTask.count({
      where: {
        state: 'DONE',
        parent: { userId: user.id },
      },
    }),
    prisma.routine.count({
      where: {
        state: 'DONE',
        section: { userId: user.id },
      },
    }),
    // Active routines
    prisma.routine.findMany({
      where: {
        state: 'ACTIVE',
        section: { userId: user.id },
      },
      include: {
        section: {
          select: { id: true, name: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    // Recently completed short-term tasks
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
      take: 5,
    }),
    // Recently completed routines
    prisma.routine.findMany({
      where: {
        state: 'DONE',
        section: { userId: user.id },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
  ])

  // Active tasks count (total, not just first 10)
  const activeTasksCount = await prisma.shortTermTask.count({
    where: {
      state: 'ACTIVE',
      parent: { userId: user.id },
    },
  })

  const totalBlocked = blockedLongTerm + blockedShortTerm + blockedRoutines
  const totalCompleted = completedLongTerm + completedShortTerm + completedRoutines

  // Group active short-term tasks by parent project
  const tasksByProject = new Map<
    string,
    {
      project: { id: string; title: string; emoji: string | null }
      tasks: typeof activeShortTermTasks
    }
  >()

  for (const task of activeShortTermTasks) {
    const existing = tasksByProject.get(task.parentId)
    if (existing) {
      existing.tasks.push(task)
    } else {
      tasksByProject.set(task.parentId, {
        project: task.parent,
        tasks: [task],
      })
    }
  }

  // Merge recently completed tasks and routines, sort by updatedAt, take top 5
  const recentlyCompleted = [
    ...recentlyCompletedShort.map((t) => ({
      id: t.id,
      title: t.title,
      emoji: t.emoji,
      priority: t.priority as Priority,
      state: t.state as TaskState,
      updatedAt: t.updatedAt,
      kind: 'task' as const,
      parentLabel: t.parent.emoji
        ? `${t.parent.emoji} ${t.parent.title}`
        : t.parent.title,
    })),
    ...recentlyCompletedRoutines.map((r) => ({
      id: r.id,
      title: r.title,
      emoji: r.emoji,
      priority: r.priority as Priority,
      state: r.state as TaskState,
      updatedAt: r.updatedAt,
      kind: 'routine' as const,
      parentLabel: null as string | null,
    })),
  ]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Your task overview at a glance.
        </p>
      </div>

      {/* ── Summary Stats ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<FolderKanban className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
          label="Active Projects"
          value={activeProjects.length}
          href="/projects?state=ACTIVE"
        />
        <StatCard
          icon={<ListChecks className="h-5 w-5 text-green-600 dark:text-green-400" />}
          label="Active Tasks"
          value={activeTasksCount}
          href="/projects"
        />
        <StatCard
          icon={<Ban className="h-5 w-5 text-red-600 dark:text-red-400" />}
          label="Blocked"
          value={totalBlocked}
          href="/blocked"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-gray-500 dark:text-gray-400" />}
          label="Completed"
          value={totalCompleted}
        />
      </div>

      {/* ── Blocked Items Alert ────────────────────────────────────────── */}
      {totalBlocked > 0 && (
        <Link
          href="/blocked"
          className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 transition-colors hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:hover:bg-red-950/50"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <span className="text-sm font-medium text-red-800 dark:text-red-300">
            {totalBlocked} item{totalBlocked !== 1 ? 's are' : ' is'} blocked
          </span>
          <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
        </Link>
      )}

      {/* ── Active Tasks Section ───────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Active Tasks</h2>
          </div>
          {activeTasksCount > 10 && (
            <Link
              href="/projects"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {tasksByProject.size > 0 ? (
          <div className="space-y-5">
            {Array.from(tasksByProject.entries()).map(
              ([projectId, { project, tasks }]) => {
                const projectLabel = project.emoji
                  ? `${project.emoji} ${project.title}`
                  : project.title

                return (
                  <div key={projectId} className="space-y-2">
                    <Link
                      href={`/projects/${projectId}`}
                      className="text-muted-foreground hover:text-foreground text-xs font-medium uppercase tracking-wide transition-colors"
                    >
                      {projectLabel}
                    </Link>
                    <div className="grid gap-2">
                      {tasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          id={task.id}
                          title={task.title}
                          emoji={task.emoji}
                          priority={task.priority as Priority}
                          state={task.state as TaskState}
                          taskType="shortTerm"
                          variant="compact"
                        />
                      ))}
                    </div>
                  </div>
                )
              }
            )}
          </div>
        ) : (
          <EmptyState message="No active tasks. Create tasks within your projects." />
        )}
      </section>

      {/* ── Active Routines Section ────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Active Routines</h2>
          </div>
          <Link
            href="/routines"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {activeRoutines.length > 0 ? (
          <div className="grid gap-2">
            {activeRoutines.map((routine) => (
              <TaskCard
                key={routine.id}
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
            ))}
          </div>
        ) : (
          <EmptyState message="No active routines." />
        )}
      </section>

      {/* ── Recently Completed ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Recently Completed</h2>
        </div>

        {recentlyCompleted.length > 0 ? (
          <div className="grid gap-2">
            {recentlyCompleted.map((item) => (
              <TaskCard
                key={item.id}
                id={item.id}
                title={item.title}
                emoji={item.emoji}
                priority={item.priority}
                state={item.state}
                variant="compact"
              />
            ))}
          </div>
        ) : (
          <EmptyState message="No completed items yet." />
        )}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode
  label: string
  value: number
  href?: string
}) {
  const content = (
    <Card className="gap-3 py-4">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 px-4 py-0">
        <div className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
          {icon}
        </div>
        <div className="min-w-0">
          <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
          <p className="text-muted-foreground truncate text-xs">{label}</p>
        </div>
      </CardHeader>
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="transition-opacity hover:opacity-80">
        {content}
      </Link>
    )
  }

  return content
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed py-8">
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  )
}
