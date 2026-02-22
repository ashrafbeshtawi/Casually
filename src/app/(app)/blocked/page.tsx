import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { type Priority, type TaskState, type BlockEntry } from '@/types'
import { TaskCard } from '@/components/task-card'
import { Ban, ArrowRight } from 'lucide-react'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseBlockedBy(raw: unknown): BlockEntry[] {
  if (Array.isArray(raw)) return raw as BlockEntry[]
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as BlockEntry[]
    } catch {
      return []
    }
  }
  return []
}

/**
 * Given a set of BlockEntry items, look up their titles from the respective
 * task tables and return a map of taskId -> { title, type, linkHref }.
 */
async function resolveBlockerNames(
  allBlockEntries: BlockEntry[]
): Promise<
  Map<string, { title: string; type: string; linkHref: string }>
> {
  const result = new Map<
    string,
    { title: string; type: string; linkHref: string }
  >()

  // Collect unique task IDs grouped by block type
  const taskBlockIds = new Set<string>()
  const parentBlockIds = new Set<string>()

  for (const entry of allBlockEntries) {
    if (entry.type === 'task_block') {
      taskBlockIds.add(entry.taskId)
    } else if (entry.type === 'parent_block') {
      parentBlockIds.add(entry.taskId)
    }
  }

  // Parent blocks always reference LongTermTasks
  if (parentBlockIds.size > 0) {
    const parents = await prisma.longTermTask.findMany({
      where: { id: { in: Array.from(parentBlockIds) } },
      select: { id: true, title: true, emoji: true },
    })
    for (const p of parents) {
      const label = p.emoji ? `${p.emoji} ${p.title}` : p.title
      result.set(p.id, {
        title: label,
        type: 'parent_block',
        linkHref: `/projects/${p.id}`,
      })
    }
  }

  // Task blocks can reference LongTermTasks, ShortTermTasks, or Routines.
  // We query all three tables and see which one matches.
  if (taskBlockIds.size > 0) {
    const ids = Array.from(taskBlockIds)

    const [longTermTasks, shortTermTasks, routines] = await Promise.all([
      prisma.longTermTask.findMany({
        where: { id: { in: ids } },
        select: { id: true, title: true, emoji: true },
      }),
      prisma.shortTermTask.findMany({
        where: { id: { in: ids } },
        select: { id: true, title: true, emoji: true, parentId: true },
      }),
      prisma.routine.findMany({
        where: { id: { in: ids } },
        select: { id: true, title: true, emoji: true },
      }),
    ])

    for (const t of longTermTasks) {
      const label = t.emoji ? `${t.emoji} ${t.title}` : t.title
      result.set(t.id, {
        title: label,
        type: 'longTerm',
        linkHref: `/projects/${t.id}`,
      })
    }

    for (const t of shortTermTasks) {
      const label = t.emoji ? `${t.emoji} ${t.title}` : t.title
      result.set(t.id, {
        title: label,
        type: 'shortTerm',
        linkHref: `/projects/${t.parentId}`,
      })
    }

    for (const t of routines) {
      const label = t.emoji ? `${t.emoji} ${t.title}` : t.title
      result.set(t.id, {
        title: label,
        type: 'routine',
        linkHref: '/routines',
      })
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BlockedPage() {
  const user = await getCurrentUser()
  if (!user?.id) {
    redirect('/login')
  }

  // Fetch all BLOCKED tasks across all types
  const [blockedLongTerm, blockedShortTerm, blockedRoutines] =
    await Promise.all([
      // BLOCKED LongTermTasks owned by user
      prisma.longTermTask.findMany({
        where: { userId: user.id, state: 'BLOCKED' },
        orderBy: { updatedAt: 'desc' },
      }),
      // BLOCKED ShortTermTasks whose parent is owned by user
      prisma.shortTermTask.findMany({
        where: {
          state: 'BLOCKED',
          parent: { userId: user.id },
        },
        include: {
          parent: {
            select: { id: true, title: true, emoji: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      // BLOCKED Routines through section -> userId
      prisma.routine.findMany({
        where: {
          state: 'BLOCKED',
          section: { userId: user.id },
        },
        include: {
          section: {
            select: { id: true, name: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ])

  // Collect all block entries across every blocked task so we can resolve names in bulk
  const allBlockEntries: BlockEntry[] = []

  for (const t of blockedLongTerm) {
    allBlockEntries.push(...parseBlockedBy(t.blockedBy))
  }
  for (const t of blockedShortTerm) {
    allBlockEntries.push(...parseBlockedBy(t.blockedBy))
  }
  for (const t of blockedRoutines) {
    allBlockEntries.push(...parseBlockedBy(t.blockedBy))
  }

  const blockerMap = await resolveBlockerNames(allBlockEntries)

  const totalBlocked =
    blockedLongTerm.length + blockedShortTerm.length + blockedRoutines.length

  // Helpers to get blocker display names for a given task's blockedBy
  function getBlockerNames(raw: unknown): string[] {
    const entries = parseBlockedBy(raw)
    return entries.map((e) => {
      const info = blockerMap.get(e.taskId)
      if (info) return info.title
      if (e.type === 'parent_block') return 'Parent project (inactive)'
      return 'Unknown task'
    })
  }

  function getBlockerLinks(
    raw: unknown
  ): Array<{ id: string; title: string; href: string; type: string }> {
    const entries = parseBlockedBy(raw)
    return entries.map((e) => {
      const info = blockerMap.get(e.taskId)
      return {
        id: e.taskId,
        title: info?.title ?? (e.type === 'parent_block' ? 'Parent project' : 'Unknown task'),
        href: info?.linkHref ?? '#',
        type: e.type,
      }
    })
  }

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
          {/* Projects (LongTermTasks) */}
          {blockedLongTerm.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-muted-foreground text-sm font-semibold uppercase tracking-wide">
                Projects ({blockedLongTerm.length})
              </h2>
              <div className="grid gap-3">
                {blockedLongTerm.map((task) => (
                  <div key={task.id} className="space-y-2">
                    <TaskCard
                      id={task.id}
                      title={task.title}
                      description={task.description}
                      emoji={task.emoji}
                      priority={task.priority as Priority}
                      state={task.state as TaskState}
                      blockerNames={getBlockerNames(task.blockedBy)}
                      taskType="longTerm"
                    />
                    <BlockedByLinks links={getBlockerLinks(task.blockedBy)} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Tasks (ShortTermTasks) */}
          {blockedShortTerm.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-muted-foreground text-sm font-semibold uppercase tracking-wide">
                Tasks ({blockedShortTerm.length})
              </h2>
              <div className="grid gap-3">
                {blockedShortTerm.map((task) => {
                  const parentLabel = task.parent.emoji
                    ? `${task.parent.emoji} ${task.parent.title}`
                    : task.parent.title

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
                          blockerNames={getBlockerNames(task.blockedBy)}
                          taskType="shortTerm"
                        />
                      </div>
                      <BlockedByLinks links={getBlockerLinks(task.blockedBy)} />
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Routines */}
          {blockedRoutines.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-muted-foreground text-sm font-semibold uppercase tracking-wide">
                Routines ({blockedRoutines.length})
              </h2>
              <div className="grid gap-3">
                {blockedRoutines.map((task) => {
                  const sectionLabel = task.section?.name

                  return (
                    <div key={task.id} className="space-y-2">
                      {sectionLabel && (
                        <p className="text-muted-foreground text-xs">
                          in {sectionLabel}
                        </p>
                      )}
                      <TaskCard
                        id={task.id}
                        title={task.title}
                        description={task.description}
                        emoji={task.emoji}
                        priority={task.priority as Priority}
                        state={task.state as TaskState}
                        blockerNames={getBlockerNames(task.blockedBy)}
                        taskType="routine"
                      />
                      <BlockedByLinks links={getBlockerLinks(task.blockedBy)} />
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

// ---------------------------------------------------------------------------
// Sub-component: links to the blocking tasks
// ---------------------------------------------------------------------------

function BlockedByLinks({
  links,
}: {
  links: Array<{ id: string; title: string; href: string; type: string }>
}) {
  if (links.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 pl-1">
      {links.map((link) => (
        <Link
          key={link.id}
          href={link.href}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs transition-colors hover:bg-accent"
        >
          <span className="max-w-[150px] sm:max-w-[200px] truncate">{link.title}</span>
          <ArrowRight className="h-3 w-3 shrink-0" />
        </Link>
      ))}
    </div>
  )
}
