import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { DashboardTaskList } from '@/components/dashboard-task-list'
import { RefreshCw } from 'lucide-react'

export default async function RoutinesPage() {
  const user = await getCurrentUser()
  if (!user?.id) {
    redirect('/login')
  }

  const routinesProject = await prisma.longRunningTask.findFirst({
    where: { userId: user.id, title: 'Routines' },
  })

  if (!routinesProject) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
            <RefreshCw className="text-primary h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Routines</h1>
            <p className="text-muted-foreground text-sm">
              Recurring tasks and habits.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <RefreshCw className="text-muted-foreground/50 mb-3 h-10 w-10" />
          <p className="text-muted-foreground text-sm">
            No &quot;Routines&quot; project found. Create a project titled &quot;Routines&quot; to get started.
          </p>
        </div>
      </div>
    )
  }

  return (
    <DashboardTaskList
      parentId={routinesProject.id}
      header={
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
            <RefreshCw className="text-primary h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Routines</h1>
            <p className="text-muted-foreground text-sm">
              Recurring tasks and habits.
            </p>
          </div>
        </div>
      }
      emptyIcon={<RefreshCw className="text-muted-foreground/50 mb-3 h-10 w-10" />}
      emptyMessage="No routines yet. Add your first routine!"
    />
  )
}
