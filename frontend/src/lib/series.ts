// Точки графика выручки и «лучший месяц». Без React — покрыто тестами (series.test.ts).
import { dayKey, shiftDay, shortDate } from './format';

export type Point = { label: string; value: number };
type TripLike = { date: string; amount: number | string; paid: boolean };

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTH_TITLES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
export const monthTitle = (ym: string) => MONTH_TITLES[Number(ym.slice(5, 7)) - 1];

// Границы периодов сервер считает от полуночи по Москве (UTC+3), поэтому день начала — со сдвигом.
const moscowDay = (iso: string) => new Date(Date.parse(iso) + 3 * 3_600_000).toISOString().slice(0, 10);
// Первый и последний день периода; to — исключающая граница или «сейчас».
export const periodDays = (from: string, to: string) => [moscowDay(from), moscowDay(new Date(Date.parse(to) - 1).toISOString())] as const;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
const weekday = (key: string) => new Date(`${key}T12:00:00Z`).toLocaleDateString('ru-RU', { weekday: 'short', timeZone: 'UTC' });

function bucket(rows: TripLike[], keys: string[], keyOf: (day: string) => string, labelOf: (key: string) => string): Point[] {
  const totals = new Map(keys.map((k) => [k, 0]));
  for (const row of rows) {
    const key = keyOf(dayKey(row.date));
    if (totals.has(key)) totals.set(key, totals.get(key)! + Number(row.amount));
  }
  return keys.map((k) => ({ label: labelOf(k), value: totals.get(k)! }));
}

// Выручка (все ходки, и неоплаченные тоже) по интервалам выбранного периода; для «дня» график не нужен.
export function revenueSeries(rows: TripLike[], period: string, from: string | null, to: string): Point[] {
  if (period === 'day') return [];
  if (period === 'month') {
    const weeks = Math.floor((Number(moscowDay(to).slice(8, 10)) - 1) / 7) + 1;
    const keys = Array.from({ length: weeks }, (_, i) => String(i));
    return bucket(
      rows,
      keys,
      (d) => String(Math.floor((Number(d.slice(8, 10)) - 1) / 7)),
      (k) => `${Number(k) + 1} нед`,
    );
  }
  if (from && (period === 'week' || period === 'custom')) {
    const [start, end] = periodDays(from, to);
    const days = daysBetween(start, end) + 1;
    const keys = Array.from({ length: days }, (_, i) => shiftDay(start, i));
    // Текущая неделя — только по сегодняшний день, без будущих нулей.
    if (period === 'week') return bucket(rows, keys, (d) => d, weekday);
    if (days <= 14) return bucket(rows, keys, (d) => d, shortDate);
    if (days <= 98) {
      const weeks = keys.filter((_, i) => i % 7 === 0);
      return bucket(rows, weeks, (d) => shiftDay(start, Math.floor(daysBetween(start, d) / 7) * 7), shortDate);
    }
  }
  // «Всё время» и длинный свой период — по месяцам, последние 12.
  const months = [...new Set(rows.map((r) => r.date.slice(0, 7)))].sort().slice(-12);
  const multiYear = new Set(months.map((m) => m.slice(0, 4))).size > 1;
  return bucket(
    rows,
    months,
    (d) => d.slice(0, 7),
    (m) => `${MONTHS[Number(m.slice(5, 7)) - 1]}${multiYear ? ` ${m.slice(2, 4)}` : ''}`,
  );
}

// Месяц с наибольшей выручкой (с неоплаченными) и сколько в нём было ходок.
export function bestMonth(rows: TripLike[]) {
  const months = new Map<string, { revenue: number; trips: number; paid: number }>();
  for (const row of rows) {
    const key = row.date.slice(0, 7);
    const m = months.get(key) ?? { revenue: 0, trips: 0, paid: 0 };
    m.trips++;
    m.revenue += Number(row.amount);
    if (row.paid) m.paid++;
    months.set(key, m);
  }
  let best: ({ key: string; unpaid: number } & { revenue: number; trips: number; paid: number }) | null = null;
  for (const [key, m] of months) if (!best || m.revenue > best.revenue) best = { key, ...m, unpaid: m.trips - m.paid };
  return best;
}
