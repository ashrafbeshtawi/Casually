import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { DashboardTaskList } from '@/components/dashboard-task-list'
import { Zap } from 'lucide-react'

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

  return (
    <DashboardTaskList
      parentId={oneOff.id}
      header={
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
      }
      emptyIcon={<Zap className="text-muted-foreground/50 mb-3 h-10 w-10" />}
      emptyMessage="No one-off tasks yet. Add your first task!"
    />
  )
}
