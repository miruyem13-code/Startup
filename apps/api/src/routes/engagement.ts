import { Router, type RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod/v4';
import { db, transaction } from '../db';
import { requireThat, token, digest } from '../security';

export function engagementRouter(
  auth: RequestHandler,
  admin: RequestHandler,
  guardDemo: RequestHandler,
) {
  const router = Router();
  const contactLimiter = rateLimit({
    windowMs: 3600000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Please wait before sending another message.' },
  });
  router.post('/contact', contactLimiter, async (req, res) => {
    const data = z
      .object({
        name: z.string().trim().min(2).max(60),
        email: z.email().max(254),
        message: z.string().trim().min(10).max(2000),
        category: z.enum(['CONTACT', 'FEEDBACK', 'SAFETY']).default('CONTACT'),
      })
      .parse(req.body);
    const result = await db.feedbackReport.create({ data });
    res
      .status(201)
      .json({ id: result.id, message: 'Your message is saved for the operations team.' });
  });
  router.get('/admin/feedback', auth, admin, async (_req, res) =>
    res.json(await db.feedbackReport.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })),
  );
  router.patch('/admin/feedback/:id', auth, admin, async (req, res) => {
    const { status } = z.object({ status: z.enum(['OPEN', 'CLOSED']) }).parse(req.body);
    const result = await transaction(async (tx) => {
      const feedback = await tx.feedbackReport.update({
        where: { id: String(req.params.id) },
        data: { status },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.viewer!.id,
          action: 'FEEDBACK_UPDATED',
          resource: feedback.id,
          summary: status,
        },
      });
      return feedback;
    });
    res.json(result);
  });
  router.get('/plans', async (_req, res) =>
    res.json(
      await db.pricingPlan.findMany({ where: { enabled: true }, orderBy: { price: 'asc' } }),
    ),
  );
  router.get('/subscriptions', auth, async (req, res) =>
    res.json(
      await db.subscription.findMany({
        where: { userId: req.viewer!.id },
        include: { plan: true },
        orderBy: { startsAt: 'desc' },
        take: 50,
      }),
    ),
  );
  router.post('/subscriptions', auth, guardDemo, async (req, res) => {
    const { planId, key } = z.object({ planId: z.string(), key: z.uuid() }).parse(req.body);
    const result = await transaction(async (tx) => {
      const existing = await tx.subscription.findUnique({ where: { key } });
      if (existing) {
        requireThat(
          existing.userId === req.viewer!.id && existing.planId === planId,
          409,
          'Request key is already used.',
        );
        return existing;
      }
      const now = new Date();
      requireThat(
        !(await tx.subscription.count({
          where: { userId: req.viewer!.id, startsAt: { lte: now }, endsAt: { gt: now } },
        })),
        409,
        'Your current pass is still valid.',
      );
      const plan = await tx.pricingPlan.findUnique({ where: { id: planId } });
      requireThat(plan?.enabled, 404, 'Pass is unavailable.');
      const changed = await tx.user.updateMany({
        where: { id: req.viewer!.id, wallet: { gte: plan!.price } },
        data: { wallet: { decrement: plan!.price } },
      });
      requireThat(changed.count, 422, 'Add demo wallet credit before purchasing this pass.');
      const subscription = await tx.subscription.create({
        data: {
          userId: req.viewer!.id,
          planId,
          startsAt: now,
          endsAt: new Date(now.getTime() + plan!.durationDays * 86400000),
          price: plan!.price,
          discountPercent: plan!.discountPercent,
          key,
        },
      });
      await tx.walletTransaction.create({
        data: {
          userId: req.viewer!.id,
          amount: -plan!.price,
          kind: 'DEMO_PASS',
          reference: subscription.id,
        },
      });
      await tx.notification.create({
        data: {
          userId: req.viewer!.id,
          title: 'Your ride pass is active',
          body: `${plan!.name}: ${plan!.discountPercent}% discount on minute pricing until ${subscription.endsAt.toISOString().slice(0, 10)}.`,
        },
      });
      return subscription;
    });
    res.status(201).json(result);
  });
  router.post('/subscriptions/:id/cancel', auth, async (req, res) => {
    const subscription = await db.subscription.findFirst({
      where: { id: String(req.params.id), userId: req.viewer!.id },
    });
    requireThat(subscription, 404, 'Pass not found.');
    res.json(
      await db.subscription.update({
        where: { id: subscription!.id },
        data: { cancelledAt: new Date(), endsAt: new Date() },
      }),
    );
  });
  router.post('/auth/verification/request', auth, guardDemo, async (req, res) => {
    const raw = token();
    await transaction(async (tx) => {
      await tx.emailVerification.deleteMany({ where: { userId: req.viewer!.id } });
      await tx.emailVerification.create({
        data: {
          id: digest(raw),
          userId: req.viewer!.id,
          expiresAt: new Date(Date.now() + 15 * 60000),
        },
      });
    });
    res.json({
      devToken: raw,
      message: 'Local verification adapter. External email delivery is not connected.',
    });
  });
  router.post('/auth/verification/confirm', auth, guardDemo, async (req, res) => {
    const { token: raw } = z.object({ token: z.string().length(64) }).parse(req.body);
    await transaction(async (tx) => {
      const verification = await tx.emailVerification.findUnique({ where: { id: digest(raw) } });
      requireThat(
        verification &&
          verification.userId === req.viewer!.id &&
          !verification.used &&
          verification.expiresAt > new Date(),
        422,
        'Verification is expired or invalid.',
      );
      await tx.emailVerification.update({ where: { id: verification!.id }, data: { used: true } });
      await tx.user.update({ where: { id: req.viewer!.id }, data: { emailVerified: true } });
    });
    res.json({ ok: true });
  });
  router.patch('/profile/avatar', auth, async (req, res) => {
    const { avatar } = z
      .object({
        avatar: z
          .string()
          .max(60000)
          .regex(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/)
          .nullable(),
      })
      .parse(req.body);
    await db.user.update({ where: { id: req.viewer!.id }, data: { avatar } });
    res.json({ ok: true });
  });
  router.get('/admin/plans', auth, admin, async (_req, res) =>
    res.json(await db.pricingPlan.findMany({ orderBy: { price: 'asc' } })),
  );
  router.patch('/admin/plans/:id', auth, admin, async (req, res) => {
    const data = z
      .object({
        name: z.string().min(3).max(80),
        price: z.number().int().min(0).max(1000000),
        durationDays: z.number().int().min(1).max(365),
        discountPercent: z.number().int().min(0).max(75),
        enabled: z.boolean(),
      })
      .parse(req.body);
    const result = await transaction(async (tx) => {
      const plan = await tx.pricingPlan.update({ where: { id: String(req.params.id) }, data });
      await tx.auditLog.create({
        data: {
          actorId: req.viewer!.id,
          action: 'PASS_UPDATED',
          resource: plan.id,
          summary: JSON.stringify(data),
        },
      });
      return plan;
    });
    res.json(result);
  });
  return router;
}
