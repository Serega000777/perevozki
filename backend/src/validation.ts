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

const HOUR = 60 * 60 * 1000;
const MOSCOW_OFFSET_MS = 3 * HOUR;
const atMoscowMidnight = (year: number, month: number, day: number) => new Date(Date.UTC(year, month, day) - MOSCOW_OFFSET_MS);

// Границы периода по Москве; to — исключающая граница, если период уже закончился (иначе — «до сейчас»).
// Неделя календарная, с понедельника; в понедельник и вторник в текущей почти нет записей,
// поэтому показываем прошлую неделю целиком.
export function moscowPeriod(period: unknown, now = new Date()): { from: Date; to?: Date } {
  const local = new Date(now.getTime() + MOSCOW_OFFSET_MS);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const day = local.getUTCDate();
  if (period === 'month') return { from: atMoscowMidnight(year, month, 1) };
  if (period === 'week') {
    const weekday = (local.getUTCDay() + 6) % 7;
    const monday = day - weekday;
    if (weekday < 2) return { from: atMoscowMidnight(year, month, monday - 7), to: atMoscowMidnight(year, month, monday) };
    return { from: atMoscowMidnight(year, month, monday) };
  }
  return { from: atMoscowMidnight(year, month, day) };
}

// Свои даты: от полуночи первого дня до полуночи после последнего — так же, как у остальных периодов.
export function customMoscowPeriod(from: unknown, to: unknown) {
  const midnight = (value: unknown, days: number) => new Date(calendarDate(value).getTime() - 12 * HOUR - MOSCOW_OFFSET_MS + days * 24 * HOUR);
  return { from: midnight(from, 0), to: midnight(to, 1) };
}
