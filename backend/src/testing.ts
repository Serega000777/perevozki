import crypto from 'node:crypto';
import type { TelegramUser } from './auth.js';

// Подписывает initData так же, как Telegram, — только для тестов.
export function signInitData(user: TelegramUser, botToken: string, authDate = Math.floor(Date.now() / 1000)) {
  const params = new URLSearchParams({ auth_date: String(authDate), query_id: 'test', user: JSON.stringify(user) });
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  params.set('hash', crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex'));
  return params.toString();
}
