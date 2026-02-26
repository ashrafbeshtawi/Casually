import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { type Priority, type TaskState, STATE_LABELS } from '@/types'
import { TaskCard } from '@/components/task-card'
import { DeleteTaskButton } from '@/components/delete-task-button'
import { CreateShortTermTaskDialog } from '@/components/create-short-term-task-dialog'
import { Zap } from 'lucide-react'

const STATE_ORDER: TaskState[] = ['ACTIVE', 'WAITING', 'BLOCKED', 'DONE']

export default async function OneOffPage() {
  const user = await getCurrentUser()
  if (!user?.id) {
    redirect('/login')
  }

  const oneOff = await prisma.longRunningTask.findFirst({
    where: { userId: user.id, title: 'One-Off Tasks' },
  })

  if (!oneOff) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
            <Zap className="text-primary h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">One-Off Tasks</h1>
            <p className="text-muted-foreground text-sm">
              Quick tasks that don&apos;t belong to any project.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Zap className="text-muted-foreground/50 mb-3 h-10 w-10" />
          <p className="text-muted-foreground text-sm">
            No &quot;One-Off Tasks&quot; project found. Create a project titled &quot;One-Off Tasks&quot; to get started.
          </p>
        </div>
      </div>
    )
  }

  const tasks = await prisma.shortRunningTask.findMany({
    where: { parentId: oneOff.id },
    include: {
      blockedBy: {
        select: { id: true, title: true, emoji: true },
      },
    },
    orderBy: { order: 'asc' },
  })

  // Group tasks by state
  const tasksByState = STATE_ORDER.reduce(
    (acc, state) => {
      acc[state] = tasks.filter((t) => t.state === state)
      return acc
    },
    {} as Record<TaskState, typeof tasks>
  )

  const hasAnyTasks = tasks.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
            <Zap className="text-primary h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">One-Off Tasks</h1>
            <p className="text-muted-foreground text-sm">
              Quick tasks that don&apos;t belong to any project.
            </p>
          </div>
        </div>
        <CreateShortTermTaskDialog parentId={oneOff.id} />
      </div>

      {/* Tasks organized by state */}
      {hasAnyTasks ? (
        <div className="space-y-6">
          {STATE_ORDER.map((state) => {
            const stateTasks = tasksByState[state]
            if (stateTasks.length === 0) return null

            return (
              <div key={state} className="space-y-3">
                <h2 className="text-muted-foreground text-sm font-semibold uppercase tracking-wide">
                  {STATE_LABELS[state]} ({stateTasks.length})
                </h2>
                <div className="grid gap-2">
                  {stateTasks.map((task) => {
                    const blockerName = task.blockedBy
                      ? (task.blockedBy.emoji
                          ? `${task.blockedBy.emoji} ${task.blockedBy.title}`
                          : task.blockedBy.title)
                      : null

                    return (
                      <div key={task.id} className="flex items-center gap-1">
                        <div className="min-w-0 flex-1">
                          <TaskCard
                            id={task.id}
                            title={task.title}
                            description={task.description}
                            emoji={task.emoji}
                            priority={task.priority as Priority}
                            state={task.state as TaskState}
                            blockerName={blockerName}
                            taskType="short"
                            variant="compact"
                          />
                        </div>
                        <DeleteTaskButton
                          taskId={task.id}
                          taskType="short"
                          taskTitle={task.title}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Zap className="text-muted-foreground/50 mb-3 h-10 w-10" />
          <p className="text-muted-foreground text-sm">
            No one-off tasks yet. Add your first task!
          </p>
        </div>
      )}
    </div>
  )
}
