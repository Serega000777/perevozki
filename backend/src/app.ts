import cors from 'cors';
import express from 'express';
import type { PrismaClient } from '@prisma/client';
import { telegramAuth, type Role, type TelegramUser } from './auth.js';
import { equipmentRouter } from './equipment.js';
import { InputError } from './validation.js';

export function createApp(prisma: PrismaClient, isProduction = process.env.NODE_ENV === 'production') {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: process.env.APP_URL || false }));
  app.use(express.json({ limit: '64kb' }));

  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'db-unavailable' });
    }
  });

  app.use('/api', telegramAuth);
  app.get('/api/auth/me', async (_req, res) => {
    const telegram = res.locals.telegramUser as TelegramUser;
    const name = [telegram.first_name, telegram.last_name].filter(Boolean).join(' ') || telegram.username || 'Администратор';
    const telegramId = BigInt(telegram.id);
    const user = await prisma.user.upsert({ where: { telegramId }, update: { name }, create: { telegramId, name } });
    res.json({ id: user.id, telegramId: user.telegramId.toString(), name: user.name, role: res.locals.role as Role });
  });
  app.use('/api/equipment', equipmentRouter(prisma));

  app.use((err: Error & { status?: number; code?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    // P2002 — нарушение уникальности, P2025 — запись не найдена (Prisma).
    const known = err instanceof InputError || err.code === 'P2002' || err.code === 'P2025';
    const status = err.status ?? (err.code === 'P2025' ? 404 : known ? 400 : 500);
    res.status(status).json({ error: known || !isProduction ? err.message : 'Не удалось выполнить операцию' });
  });
  return app;
}
