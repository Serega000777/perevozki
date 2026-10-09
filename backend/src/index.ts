import { PrismaClient } from '@prisma/client';
import { createApp } from './app.js';

const isProduction = process.env.NODE_ENV === 'production';
const required = isProduction ? ['DATABASE_URL', 'BOT_TOKEN', 'ADMIN_TELEGRAM_IDS', 'APP_URL'] : ['DATABASE_URL'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) throw new Error(`Не заданы переменные окружения: ${missing.join(', ')}`);
if (!process.env.BOT_TOKEN) console.warn('BOT_TOKEN не задан — все запросы к /api будут отклонены (401)');

const prisma = new PrismaClient();
const port = Number(process.env.PORT || 3000);
const server = createApp(prisma, isProduction).listen(port, () => console.log(`API listening on ${port}`));

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    server.close(() => void prisma.$disconnect().finally(() => process.exit(0)));
  });
}
