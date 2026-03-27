import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../src/generated/prisma/client.ts';

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const EMAIL = '4seasons.pizzeria.berlin@gmail.com';

async function main() {
  const user = await prisma.user.findFirst({ where: { email: EMAIL } });
  if (!user) { console.error('User not found!'); return; }
  console.log(`Found user: ${user.id} (${user.name || user.email})`);
  const uid = user.id;

  // Clean existing data (except default "One-Off Tasks" and "Routines" which we'll reuse)
  const existing = await prisma.longRunningTask.findMany({ where: { userId: uid } });
  console.log(`Existing projects: ${existing.length}`);

  // Delete all short tasks first, then long tasks (except defaults), then challenges
  await prisma.shortRunningTask.deleteMany({ where: { parent: { userId: uid } } });
  await prisma.longRunningTask.deleteMany({ where: { userId: uid } });
  await prisma.challenge.deleteMany({ where: { userId: uid } });
  console.log('Cleaned existing data');

  // ========== RECREATE DEFAULTS ==========
  const oneOff = await prisma.longRunningTask.create({
    data: { title: 'One-Off Tasks', emoji: '📌', state: 'ACTIVE', priority: 'MEDIUM', userId: uid, order: 0 },
  });
  const routines = await prisma.longRunningTask.create({
    data: { title: 'Routines', emoji: '🔄', state: 'ACTIVE', priority: 'MEDIUM', userId: uid, order: 1 },
  });

  // ========== ACTIVE PROJECTS ==========
  const fitness = await prisma.longRunningTask.create({
    data: { title: 'Get Fit for Summer', emoji: '💪', state: 'ACTIVE', priority: 'HIGH', userId: uid, order: 2 },
  });
  const apartment = await prisma.longRunningTask.create({
    data: { title: 'Apartment Renovation', emoji: '🏠', state: 'ACTIVE', priority: 'HIGHEST', userId: uid, order: 3 },
  });
  const german = await prisma.longRunningTask.create({
    data: { title: 'Learn German B2', emoji: '🇩🇪', state: 'ACTIVE', priority: 'MEDIUM', userId: uid, order: 4 },
  });
  const appLaunch = await prisma.longRunningTask.create({
    data: { title: 'Launch Side Project', emoji: '🚀', state: 'ACTIVE', priority: 'HIGH', userId: uid, order: 5 },
  });

  // ========== WAITING PROJECT ==========
  const vacation = await prisma.longRunningTask.create({
    data: { title: 'Summer Vacation Planning', emoji: '✈️', state: 'WAITING', priority: 'LOW', userId: uid, order: 6 },
  });

  // ========== BLOCKED PROJECT ==========
  const moveOffice = await prisma.longRunningTask.create({
    data: { title: 'Office Relocation', emoji: '📦', state: 'BLOCKED', priority: 'MEDIUM', userId: uid, order: 7, blockedById: apartment.id },
  });

  // ========== DONE PROJECTS (Achievements) ==========
  const website = await prisma.longRunningTask.create({
    data: { title: 'Portfolio Website', emoji: '🌐', state: 'DONE', priority: 'HIGH', userId: uid, order: 8 },
  });
  const cookbook = await prisma.longRunningTask.create({
    data: { title: 'Family Cookbook', emoji: '📖', state: 'DONE', priority: 'LOW', userId: uid, order: 9 },
  });

  // ========== SHORT TASKS ==========

  // --- One-Off Tasks (mix of states) ---
  const oneOffTasks = [
    { title: 'Buy new running shoes', emoji: '👟', priority: 'MEDIUM', state: 'ACTIVE' },
    { title: 'Cancel old gym membership', emoji: '❌', priority: 'HIGH', state: 'ACTIVE' },
    { title: 'Schedule dentist appointment', emoji: '🦷', priority: 'LOW', state: 'WAITING' },
    { title: 'Return Amazon package', emoji: '📦', priority: 'MEDIUM', state: 'ACTIVE' },
    { title: 'Fix kitchen faucet leak', emoji: '🔧', priority: 'HIGHEST', state: 'DONE' },
    { title: 'Send birthday card to Mom', emoji: '💌', priority: 'HIGH', state: 'DONE' },
    { title: 'Update phone OS', emoji: '📱', priority: 'LOWEST', state: 'DONE' },
  ];

  // --- Routines (mostly active) ---
  const routineTasks = [
    { title: 'Morning stretching', emoji: '🧘', priority: 'MEDIUM', state: 'ACTIVE' },
    { title: 'Weekly meal prep', emoji: '🥗', priority: 'HIGH', state: 'ACTIVE' },
    { title: 'Review finances every Sunday', emoji: '💰', priority: 'MEDIUM', state: 'ACTIVE' },
    { title: 'Water the plants', emoji: '🪴', priority: 'LOW', state: 'ACTIVE' },
    { title: 'Clean apartment every Saturday', emoji: '🧹', priority: 'MEDIUM', state: 'ACTIVE' },
    { title: 'Call parents on weekends', emoji: '📞', priority: 'HIGH', state: 'ACTIVE' },
  ];

  // --- Fitness project ---
  const fitnessTasks = [
    { title: 'Run 5km three times a week', emoji: '🏃', priority: 'HIGH', state: 'ACTIVE' },
    { title: 'Join a climbing gym', emoji: '🧗', priority: 'MEDIUM', state: 'ACTIVE' },
    { title: 'Track macros daily', emoji: '📊', priority: 'MEDIUM', state: 'ACTIVE' },
    { title: 'Buy resistance bands', emoji: '🏋️', priority: 'LOW', state: 'DONE' },
    { title: 'Get body composition scan', emoji: '⚖️', priority: 'LOWEST', state: 'WAITING' },
    { title: 'Sign up for 10K race in August', emoji: '🏅', priority: 'LOW', state: 'WAITING' },
  ];

  // --- Apartment Renovation ---
  const apartmentTasks = [
    { title: 'Pick paint colors for living room', emoji: '🎨', priority: 'HIGH', state: 'DONE' },
    { title: 'Order new kitchen tiles', emoji: '🧱', priority: 'HIGHEST', state: 'DONE' },
    { title: 'Install kitchen backsplash', emoji: '🔨', priority: 'HIGHEST', state: 'ACTIVE' },
    { title: 'Paint bedroom walls', emoji: '🖌️', priority: 'HIGH', state: 'ACTIVE' },
    { title: 'Replace bathroom mirror', emoji: '🪞', priority: 'MEDIUM', state: 'WAITING' },
    { title: 'Assemble IKEA shelving unit', emoji: '📐', priority: 'MEDIUM', state: 'ACTIVE' },
    { title: 'Fix hallway lighting', emoji: '💡', priority: 'LOW', state: 'BLOCKED' },
    { title: 'Deep clean after renovation', emoji: '✨', priority: 'MEDIUM', state: 'WAITING' },
  ];

  // --- Learn German ---
  const germanTasks = [
    { title: 'Complete Goethe B1 course', emoji: '📚', priority: 'HIGH', state: 'DONE' },
    { title: 'Practice speaking with tandem partner', emoji: '🗣️', priority: 'HIGH', state: 'ACTIVE' },
    { title: 'Watch one German movie per week', emoji: '🎬', priority: 'LOW', state: 'ACTIVE' },
    { title: 'Read "Der Vorleser" in German', emoji: '📖', priority: 'MEDIUM', state: 'ACTIVE' },
    { title: 'Write 3 journal entries in German weekly', emoji: '✏️', priority: 'MEDIUM', state: 'ACTIVE' },
    { title: 'Register for B2 exam', emoji: '📝', priority: 'HIGH', state: 'WAITING' },
  ];

  // --- Launch Side Project ---
  const appTasks = [
    { title: 'Finalize MVP feature list', emoji: '📋', priority: 'HIGHEST', state: 'DONE' },
    { title: 'Design landing page mockup', emoji: '🎨', priority: 'HIGH', state: 'DONE' },
    { title: 'Build authentication flow', emoji: '🔐', priority: 'HIGHEST', state: 'DONE' },
    { title: 'Implement payment integration', emoji: '💳', priority: 'HIGHEST', state: 'ACTIVE' },
    { title: 'Write API documentation', emoji: '📄', priority: 'MEDIUM', state: 'ACTIVE' },
    { title: 'Set up CI/CD pipeline', emoji: '⚙️', priority: 'HIGH', state: 'ACTIVE' },
    { title: 'User testing with 5 beta testers', emoji: '🧪', priority: 'HIGH', state: 'WAITING' },
    { title: 'Submit to app store', emoji: '🏪', priority: 'MEDIUM', state: 'BLOCKED' },
  ];

  // --- Vacation Planning (WAITING project) ---
  const vacationTasks = [
    { title: 'Research flights to Lisbon', emoji: '✈️', priority: 'MEDIUM', state: 'WAITING' },
    { title: 'Compare Airbnb options', emoji: '🏡', priority: 'MEDIUM', state: 'WAITING' },
    { title: 'Check passport expiry', emoji: '🛂', priority: 'HIGH', state: 'WAITING' },
    { title: 'Ask team about time off', emoji: '📅', priority: 'HIGH', state: 'WAITING' },
  ];

  // --- Office Relocation (BLOCKED project) ---
  const officeTasks = [
    { title: 'Get quotes from moving companies', emoji: '🚛', priority: 'HIGH', state: 'BLOCKED' },
    { title: 'Pack non-essential equipment', emoji: '📦', priority: 'MEDIUM', state: 'BLOCKED' },
    { title: 'Set up internet at new office', emoji: '📡', priority: 'HIGHEST', state: 'BLOCKED' },
  ];

  // --- Portfolio Website (DONE project - achievements) ---
  const websiteTasks = [
    { title: 'Design wireframes', emoji: '✏️', priority: 'HIGH', state: 'DONE' },
    { title: 'Build responsive layout', emoji: '📱', priority: 'HIGH', state: 'DONE' },
    { title: 'Add project showcase section', emoji: '🖼️', priority: 'MEDIUM', state: 'DONE' },
    { title: 'Optimize for SEO', emoji: '🔍', priority: 'MEDIUM', state: 'DONE' },
    { title: 'Deploy to Vercel', emoji: '🚀', priority: 'LOW', state: 'DONE' },
  ];

  // --- Family Cookbook (DONE project - achievements) ---
  const cookbookTasks = [
    { title: 'Collect grandma\'s recipes', emoji: '👵', priority: 'HIGH', state: 'DONE' },
    { title: 'Photograph all dishes', emoji: '📸', priority: 'MEDIUM', state: 'DONE' },
    { title: 'Format and design layout', emoji: '🎨', priority: 'MEDIUM', state: 'DONE' },
    { title: 'Print 10 copies', emoji: '🖨️', priority: 'LOW', state: 'DONE' },
  ];

  // Bulk insert all short tasks
  const allTasks = [
    ...oneOffTasks.map((t, i) => ({ ...t, parentId: oneOff.id, order: i })),
    ...routineTasks.map((t, i) => ({ ...t, parentId: routines.id, order: i })),
    ...fitnessTasks.map((t, i) => ({ ...t, parentId: fitness.id, order: i })),
    ...apartmentTasks.map((t, i) => ({ ...t, parentId: apartment.id, order: i })),
    ...germanTasks.map((t, i) => ({ ...t, parentId: german.id, order: i })),
    ...appTasks.map((t, i) => ({ ...t, parentId: appLaunch.id, order: i })),
    ...vacationTasks.map((t, i) => ({ ...t, parentId: vacation.id, order: i })),
    ...officeTasks.map((t, i) => ({ ...t, parentId: moveOffice.id, order: i })),
    ...websiteTasks.map((t, i) => ({ ...t, parentId: website.id, order: i })),
    ...cookbookTasks.map((t, i) => ({ ...t, parentId: cookbook.id, order: i })),
  ];

  const created = await prisma.shortRunningTask.createMany({ data: allTasks });
  console.log(`Created ${created.count} tasks`);

  // ========== CHALLENGES ==========
  const now = new Date();
  const challenges = [
    { title: 'No Sugar', emoji: '🍬', startedAt: new Date(now.getTime() - 45 * 86400000), userId: uid },   // 45 days — Platinum
    { title: 'No Smoking', emoji: '🚭', startedAt: new Date(now.getTime() - 128 * 86400000), userId: uid }, // 128 days — Master
    { title: 'No Social Media', emoji: '📵', startedAt: new Date(now.getTime() - 8 * 86400000), userId: uid }, // 8 days — Silver
    { title: 'Wake Up at 6 AM', emoji: '⏰', startedAt: new Date(now.getTime() - 2 * 86400000), userId: uid }, // 2 days — Seedling
    { title: 'Daily Meditation', emoji: '🧘', startedAt: new Date(now.getTime() - 21 * 86400000), userId: uid }, // 21 days — Gold
    { title: 'No Alcohol', emoji: '🍷', startedAt: new Date(now.getTime() - 366 * 86400000), userId: uid }, // 366 days — Legend!
  ];

  for (const c of challenges) {
    await prisma.challenge.create({ data: c });
  }
  console.log(`Created ${challenges.length} challenges`);

  // ========== SUMMARY ==========
  const totalProjects = await prisma.longRunningTask.count({ where: { userId: uid } });
  const totalTasks = await prisma.shortRunningTask.count({ where: { parent: { userId: uid } } });
  const totalChallenges = await prisma.challenge.count({ where: { userId: uid } });

  console.log('\n=== SHOWCASE DATA SUMMARY ===');
  console.log(`Projects: ${totalProjects} (4 ACTIVE, 1 WAITING, 1 BLOCKED, 2 DONE)`);
  console.log(`Tasks: ${totalTasks}`);
  console.log(`Challenges: ${totalChallenges} (Seedling, Silver, Gold, Platinum, Master, Legend)`);
  console.log('Done!');

  await prisma.$disconnect();
}

main().catch(console.error);
