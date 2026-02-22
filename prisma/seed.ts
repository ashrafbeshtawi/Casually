import { PrismaClient } from '../src/generated/prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clean existing data (order matters due to foreign key constraints)
  await prisma.routine.deleteMany()
  await prisma.routineSection.deleteMany()
  await prisma.shortTermTask.deleteMany()
  await prisma.longTermTask.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.verificationToken.deleteMany()
  await prisma.user.deleteMany()

  // Create test user
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
    },
  })

  // Create One-Off Tasks container (special, isOneOff=true)
  const oneOffProject = await prisma.longTermTask.create({
    data: {
      title: 'One-Off Tasks',
      isOneOff: true,
      state: 'ACTIVE',
      priority: 'MEDIUM',
      userId: user.id,
      order: 0,
    },
  })

  // Create sample long-term tasks (projects)
  const websiteProject = await prisma.longTermTask.create({
    data: {
      title: 'Redesign Website',
      description: 'Complete overhaul of the company website',
      emoji: '🌐',
      priority: 'HIGH',
      state: 'ACTIVE',
      userId: user.id,
      order: 1,
    },
  })

  const fitnessProject = await prisma.longTermTask.create({
    data: {
      title: 'Get Fit',
      description: 'Health and fitness goals for the year',
      emoji: '💪',
      priority: 'MEDIUM',
      state: 'ACTIVE',
      userId: user.id,
      order: 2,
    },
  })

  const learningProject = await prisma.longTermTask.create({
    data: {
      title: 'Learn Rust',
      description: 'Complete the Rust programming course',
      emoji: '🦀',
      priority: 'LOW',
      state: 'WAITING',
      userId: user.id,
      order: 3,
    },
  })

  // Create short-term tasks under projects
  await prisma.shortTermTask.createMany({
    data: [
      // One-off tasks
      { title: 'Buy groceries', emoji: '🛒', priority: 'MEDIUM', state: 'ACTIVE', parentId: oneOffProject.id, order: 0 },
      { title: 'Call dentist', emoji: '🦷', priority: 'HIGH', state: 'WAITING', parentId: oneOffProject.id, order: 1 },
      { title: 'Return package', priority: 'LOW', state: 'DONE', parentId: oneOffProject.id, order: 2 },

      // Website project tasks
      { title: 'Create wireframes', emoji: '✏️', priority: 'HIGHEST', state: 'ACTIVE', parentId: websiteProject.id, order: 0 },
      { title: 'Design mockups', emoji: '🎨', priority: 'HIGH', state: 'WAITING', parentId: websiteProject.id, order: 1 },
      { title: 'Implement frontend', priority: 'HIGH', state: 'WAITING', parentId: websiteProject.id, order: 2 },
      { title: 'Set up hosting', priority: 'MEDIUM', state: 'WAITING', parentId: websiteProject.id, order: 3 },

      // Fitness project tasks
      { title: 'Join a gym', emoji: '🏋️', priority: 'HIGH', state: 'DONE', parentId: fitnessProject.id, order: 0 },
      { title: 'Create workout plan', priority: 'MEDIUM', state: 'ACTIVE', parentId: fitnessProject.id, order: 1 },
      { title: 'Meal prep Sunday', emoji: '🥗', priority: 'MEDIUM', state: 'WAITING', parentId: fitnessProject.id, order: 2 },

      // Learning project tasks (parent is WAITING, so children should be BLOCKED with parent_block)
      { title: 'Set up Rust toolchain', priority: 'MEDIUM', state: 'BLOCKED', parentId: learningProject.id, order: 0, blockedBy: JSON.stringify([{ type: 'parent_block', taskId: learningProject.id }]) },
      { title: 'Complete chapter 1', emoji: '📖', priority: 'MEDIUM', state: 'BLOCKED', parentId: learningProject.id, order: 1, blockedBy: JSON.stringify([{ type: 'parent_block', taskId: learningProject.id }]) },
    ],
  })

  // Create routine sections
  const morningSection = await prisma.routineSection.create({
    data: {
      name: 'Morning Routine',
      order: 0,
      userId: user.id,
    },
  })

  const weeklySection = await prisma.routineSection.create({
    data: {
      name: 'Weekly Tasks',
      order: 1,
      userId: user.id,
    },
  })

  // Create routines
  await prisma.routine.createMany({
    data: [
      { title: 'Meditate', emoji: '🧘', priority: 'HIGH', state: 'ACTIVE', interval: 'DAILY', sectionId: morningSection.id, order: 0 },
      { title: 'Exercise', emoji: '🏃', priority: 'HIGHEST', state: 'ACTIVE', interval: 'DAILY', sectionId: morningSection.id, order: 1 },
      { title: 'Journal', emoji: '📓', priority: 'MEDIUM', state: 'ACTIVE', interval: 'DAILY', sectionId: morningSection.id, order: 2 },
      { title: 'Review goals', emoji: '🎯', priority: 'HIGH', state: 'ACTIVE', interval: 'WEEKLY', sectionId: weeklySection.id, order: 0 },
      { title: 'Clean apartment', emoji: '🧹', priority: 'MEDIUM', state: 'ACTIVE', interval: 'WEEKLY', sectionId: weeklySection.id, order: 1 },
      { title: 'Check finances', emoji: '💰', priority: 'LOW', state: 'WAITING', interval: 'MONTHLY', sectionId: weeklySection.id, order: 2 },
    ],
  })

  console.log('Seed completed successfully!')
  console.log(`Created user: ${user.email}`)
  console.log(`Created ${await prisma.longTermTask.count()} long-term tasks`)
  console.log(`Created ${await prisma.shortTermTask.count()} short-term tasks`)
  console.log(`Created ${await prisma.routineSection.count()} routine sections`)
  console.log(`Created ${await prisma.routine.count()} routines`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
