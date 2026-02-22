import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { type Priority, type TaskState, type Interval } from '@/types'
import { RoutinesClient } from '@/components/routines-client'

export default async function RoutinesPage() {
  const user = await getCurrentUser()
  if (!user?.id) {
    redirect('/login')
  }

  // Fetch sections with routine counts
  const sections = await prisma.routineSection.findMany({
    where: {
      userId: user.id,
    },
    include: {
      _count: {
        select: { routines: true },
      },
    },
    orderBy: { order: 'asc' },
  })

  // Fetch all routines for the user (those in user's sections + orphaned ones)
  const routines = await prisma.routine.findMany({
    where: {
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
    include: {
      section: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { order: 'asc' },
  })

  const sectionData = sections.map((s) => ({
    id: s.id,
    name: s.name,
    order: s.order,
    routineCount: s._count.routines,
  }))

  const routineData = routines.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    emoji: r.emoji,
    priority: r.priority as Priority,
    state: r.state as TaskState,
    interval: r.interval as Interval | null,
    customInterval: r.customInterval,
    order: r.order,
    sectionId: r.sectionId,
    blockedBy: (r.blockedBy ?? []) as Array<{ type: string; taskId: string }>,
  }))

  return <RoutinesClient sections={sectionData} routines={routineData} />
}
