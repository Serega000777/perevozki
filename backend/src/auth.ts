import crypto from 'node:crypto';
import type { RequestHandler } from 'express';

export type TelegramUser = { id: number; first_name?: string; last_name?: string; username?: string };
export type Role = 'owner' | 'viewer';

const MAX_AGE_SECONDS = 86400;

export class AuthError extends Error {
  constructor(
    readonly status: 401,
    message: string,
  ) {
    super(message);
  }
}

// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
export function verifyInitData(initData: string, botToken: string, nowMs = Date.now()): TelegramUser {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');
  // Telegram сортирует ключи побайтово, а не по локали.
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  if (!hash || hash.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expected))) {
    throw new AuthError(401, 'Некорректная подпись Telegram');
  }
  const authDate = Number(params.get('auth_date'));
  const ageSeconds = nowMs / 1000 - authDate;
  if (!authDate || ageSeconds < -60 || ageSeconds > MAX_AGE_SECONDS) throw new AuthError(401, 'Сессия Telegram устарела');
  let user: TelegramUser;
  try {
    user = JSON.parse(params.get('user') || '{}') as TelegramUser;
  } catch {
    throw new AuthError(401, 'Некорректные данные пользователя Telegram');
  }
  if (!Number.isSafeInteger(user.id) || user.id <= 0) throw new AuthError(401, 'Некорректный Telegram ID');
  return user;
}

export function adminTelegramIds(value = process.env.ADMIN_TELEGRAM_IDS) {
  return new Set(
    (value ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

// Правки вносят только ADMIN_TELEGRAM_IDS; любой другой пользователь Telegram — зритель.
export const roleOf = (userId: number, admins = adminTelegramIds()): Role => (admins.has(String(userId)) ? 'owner' : 'viewer');

export const telegramAuth: RequestHandler = (req, res, next) => {
  const initData = req.header('x-telegram-init-data');
  const token = process.env.BOT_TOKEN;
  if (!initData || !token) {
    res.status(401).json({ error: 'Требуется авторизация Telegram' });
    return;
  }
  try {
    const user = verifyInitData(initData, token);
    res.locals.telegramUser = user;
    res.locals.role = roleOf(user.id);
    next();
  } catch (error) {
    if (!(error instanceof AuthError)) throw error;
    res.status(error.status).json({ error: error.message });
  }
};
