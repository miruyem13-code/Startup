import { randomBytes, scryptSync } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod/v4';

// Local operator command. There is intentionally no HTTP endpoint for privileged self-registration.
const accountSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.email().max(254),
  password: z.string().min(16).max(128),
});
const db = new PrismaClient();
const hashPassword = (password) => {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
};

try {
  const account = accountSchema.parse({
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
  const email = account.email.toLowerCase();
  if (await db.user.findUnique({ where: { email } }))
    throw new Error('This email already exists. Choose a separate privileged account.');
  await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: account.name,
        email,
        passwordHash: hashPassword(account.password),
        role: 'SUPER_ADMIN',
        publicProfile: false,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: 'SUPER_ADMIN_PROVISIONED',
        resource: user.id,
        summary: 'Provisioned through the local operator command.',
      },
    });
  });
  console.log('Super administrator created. Credentials were not printed.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Provisioning failed.');
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
