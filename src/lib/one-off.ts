import { prisma } from '@/lib/prisma'

export async function getOrCreateOneOffProject(userId: string) {
  let oneOff = await prisma.longTermTask.findFirst({
    where: { userId, isOneOff: true },
  })

  if (!oneOff) {
    oneOff = await prisma.longTermTask.create({
      data: {
        title: 'One-Off Tasks',
        isOneOff: true,
        state: 'ACTIVE',
        priority: 'MEDIUM',
        userId,
        order: 0,
      },
    })
  }

  return oneOff
}
