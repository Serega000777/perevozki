#!/usr/bin/env node
// Локальная разработка без Telegram: подписывает initData тем же BOT_TOKEN, что и backend,
// и печатает ссылку, открыв которую в браузере, Mini App пройдёт настоящую проверку подписи.
// Проверку на сервере ничто не отключает — нужен только тот же BOT_TOKEN в .env.
//
//   npm run dev:init-data -- [--id 123] [--name "Иван"] [--url http://localhost:5180]
import crypto from 'node:crypto';
import { parseArgs } from 'node:util';

try {
  process.loadEnvFile('.env');
} catch {
  // .env не обязателен: переменные могут прийти из окружения.
}

const { values } = parseArgs({
  options: {
    id: { type: 'string', default: (process.env.ADMIN_TELEGRAM_IDS ?? '').split(',')[0].trim() || '1' },
    name: { type: 'string', default: 'Локальный' },
    url: { type: 'string', default: 'http://localhost:5180' },
  },
});

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('BOT_TOKEN не задан (в .env или окружении). Локально подойдёт любая строка, если она совпадает с backend.');
  process.exit(1);
}

const params = new URLSearchParams({
  auth_date: String(Math.floor(Date.now() / 1000)),
  query_id: 'dev',
  user: JSON.stringify({ id: Number(values.id), first_name: values.name }),
});
const dataCheckString = [...params.entries()]
  .sort(([a], [b]) => (a < b ? -1 : 1))
  .map(([k, v]) => `${k}=${v}`)
  .join('\n');
const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
params.set('hash', crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex'));
const initData = params.toString();

console.log(`initData (действует 24 ч, заголовок x-telegram-init-data):\n${initData}\n`);
// telegram-web-app.js читает initData из #tgWebAppData так же, как внутри Telegram.
console.log(`Ссылка для браузера:\n${values.url}/#tgWebAppData=${encodeURIComponent(initData)}`);
