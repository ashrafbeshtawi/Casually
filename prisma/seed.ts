import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '../src/generated/prisma/client'

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
})
const prisma = new PrismaClient({ adapter })

async function main() {
  await prisma.shortRunningTask.deleteMany()
  await prisma.longRunningTask.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.verificationToken.deleteMany()
  await prisma.user.deleteMany()

  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
    },
  })

  const oneOff = await prisma.longRunningTask.create({
    data: {
      title: 'One-Off Tasks',
      emoji: '📌',
      state: 'ACTIVE',
      priority: 'MEDIUM',
      userId: user.id,
      order: 0,
    },
  })

  const routines = await prisma.longRunningTask.create({
    data: {
      title: 'Routines',
      emoji: '🔄',
      state: 'ACTIVE',
      priority: 'MEDIUM',
      userId: user.id,
      order: 1,
    },
  })

  const websiteProject = await prisma.longRunningTask.create({
    data: {
      title: 'Redesign Website',
      description: 'Complete overhaul of the company website',
      emoji: '🌐',
      priority: 'HIGH',
      state: 'ACTIVE',
      userId: user.id,
      order: 2,
    },
  })

  const fitnessProject = await prisma.longRunningTask.create({
    data: {
      title: 'Get Fit',
      description: 'Health and fitness goals for the year',
      emoji: '💪',
      priority: 'MEDIUM',
      state: 'ACTIVE',
      userId: user.id,
      order: 3,
    },
  })

  await prisma.longRunningTask.create({
    data: {
      title: 'Learn Rust',
      description: 'Complete the Rust programming course',
      emoji: '🦀',
      priority: 'LOW',
      state: 'WAITING',
      userId: user.id,
      order: 4,
    },
  })

  await prisma.shortRunningTask.createMany({
    data: [
      { title: 'Buy groceries', emoji: '🛒', priority: 'MEDIUM', state: 'ACTIVE', parentId: oneOff.id, order: 0 },
      { title: 'Call dentist', emoji: '🦷', priority: 'HIGH', state: 'WAITING', parentId: oneOff.id, order: 1 },
      { title: 'Return package', priority: 'LOW', state: 'DONE', parentId: oneOff.id, order: 2 },
      { title: 'Meditate', emoji: '🧘', priority: 'HIGH', state: 'ACTIVE', parentId: routines.id, order: 0 },
      { title: 'Exercise', emoji: '🏃', priority: 'HIGHEST', state: 'ACTIVE', parentId: routines.id, order: 1 },
      { title: 'Journal', emoji: '📓', priority: 'MEDIUM', state: 'ACTIVE', parentId: routines.id, order: 2 },
      { title: 'Create wireframes', emoji: '✏️', priority: 'HIGHEST', state: 'ACTIVE', parentId: websiteProject.id, order: 0 },
      { title: 'Design mockups', emoji: '🎨', priority: 'HIGH', state: 'WAITING', parentId: websiteProject.id, order: 1 },
      { title: 'Implement frontend', priority: 'HIGH', state: 'WAITING', parentId: websiteProject.id, order: 2 },
      { title: 'Join a gym', emoji: '🏋️', priority: 'HIGH', state: 'DONE', parentId: fitnessProject.id, order: 0 },
      { title: 'Create workout plan', priority: 'MEDIUM', state: 'ACTIVE', parentId: fitnessProject.id, order: 1 },
      { title: 'Meal prep Sunday', emoji: '🥗', priority: 'MEDIUM', state: 'WAITING', parentId: fitnessProject.id, order: 2 },
    ],
  })

  console.log('Seed completed!')
  console.log(`Created user: ${user.email}`)
  console.log(`Created ${await prisma.longRunningTask.count()} long-running tasks`)
  console.log(`Created ${await prisma.shortRunningTask.count()} short-running tasks`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
