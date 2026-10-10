import { PrismaClient, Prisma } from '@prisma/client';
if (!process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Production requires an explicit DATABASE_URL.');
  process.env.DATABASE_URL = 'file:./velocity.db';
}
if (
  process.env.NODE_ENV === 'production' &&
  !/^postgres(?:ql)?:\/\//i.test(process.env.DATABASE_URL)
) {
  throw new Error('Production DATABASE_URL must point to PostgreSQL.');
}
export const db = new PrismaClient();
export type Transaction = Prisma.TransactionClient;
// Serialize local write transactions. SQLite remains durable and authoritative;
// conditional updates also protect writes between independent processes.
let queue: Promise<unknown> = Promise.resolve();
export function transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
  const result = queue.then(() => db.$transaction(fn, { timeout: 15000 }));
  queue = result.catch(() => undefined);
  return result;
}
