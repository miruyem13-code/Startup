import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
try {
  const accounts = await db.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    select: { email: true, role: true, status: true },
    orderBy: { email: 'asc' },
  });
  if (accounts.length) console.log(JSON.stringify(accounts, null, 2));
  else console.log('No administrator accounts found in the configured database.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Unable to inspect administrator accounts.');
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
