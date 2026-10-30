const base = import.meta.env.VITE_API_URL || '/api';
const initData = () => window.Telegram?.WebApp.initData || '';

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': initData(), ...options?.headers },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Ошибка сервера');
  return body;
}

// Картинки тоже за подписью Telegram, поэтому <img src> напрямую не подходит — берём файл и делаем blob-ссылку.
export async function apiBlob(path: string): Promise<Blob> {
  const response = await fetch(`${base}${path}`, { headers: { 'x-telegram-init-data': initData() } });
  if (!response.ok) throw new Error('Не удалось загрузить фото');
  return response.blob();
}
