export class InputError extends Error {
  status = 400;
}

export function positiveNumber(value: unknown, label: string) {
  const result = Number(value);
  if (!Number.isFinite(result) || result <= 0) throw new InputError(`${label}: укажите положительное число`);
  return result;
}

export function nonNegativeNumber(value: unknown, label: string) {
  const result = Number(value ?? 0);
  if (!Number.isFinite(result) || result < 0) throw new InputError(`${label}: значение не может быть отрицательным`);
  return result;
}

export function positiveInteger(value: unknown, label: string) {
  const result = Number(value);
  if (!Number.isInteger(result) || result <= 0) throw new InputError(`${label}: укажите положительное целое число`);
  return result;
}

export function requiredText(value: unknown, label: string, max = 200) {
  const result = String(value ?? '').trim();
  if (!result) throw new InputError(`${label}: поле обязательно`);
  if (result.length > max) throw new InputError(`${label}: максимум ${max} символов`);
  return result;
}

export function optionalText(value: unknown, max = 500) {
  const result = String(value ?? '').trim();
  if (result.length > max) throw new InputError(`Максимум ${max} символов`);
  return result || null;
}

export function calendarDate(value: unknown) {
  const source = String(value ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source)) throw new InputError('Укажите корректную дату');
  // Полдень UTC: календарный день не «съезжает» ни в одном часовом поясе России.
  const result = new Date(`${source}T12:00:00.000Z`);
  if (Number.isNaN(result.valueOf()) || result.toISOString().slice(0, 10) !== source) throw new InputError('Укажите корректную дату');
  return result;
}

export function checkbox(value: unknown) {
  return value === true || value === 'true' || value === 'on';
}

const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000;

export function startOfMoscowPeriod(period: unknown, now = new Date()) {
  const local = new Date(now.getTime() + MOSCOW_OFFSET_MS);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const day = local.getUTCDate();
  const daysBack = period === 'week' ? 6 : 0;
  const start = period === 'month' ? Date.UTC(year, month, 1) : Date.UTC(year, month, day - daysBack);
  return new Date(start - MOSCOW_OFFSET_MS);
}
