import type { Expense, Trip } from '../equipment/types';

const DAY = 86_400_000;
const time = (date: string) => Date.parse(`${date.slice(0, 10)}T12:00:00Z`);
const key = (stamp: number) => new Date(stamp).toISOString().slice(0, 10);

// Equal calendar-day intervals, bounded to six columns. Unpaid trips never count as revenue.
// Keep full ISO bounds for accessible labels, including ranges crossing a year.
export function cashflowBuckets(trips: Trip[], expenses: Expense[]) {
  const dates = [...trips, ...expenses].map((r) => time(r.date));
  if (!dates.length) return [];
  const start = dates.reduce((a, b) => Math.min(a, b));
  const end = dates.reduce((a, b) => Math.max(a, b));
  const days = Math.round((end - start) / DAY) + 1;
  const step = Math.ceil(days / 6);
  const buckets = Array.from({ length: Math.ceil(days / step) }, (_, i) => ({
    from: key(start + i * step * DAY),
    to: key(Math.min(end, start + ((i + 1) * step - 1) * DAY)),
    revenue: 0,
    expenses: 0,
  }));
  for (const row of trips) if (row.paid) buckets[Math.floor((time(row.date) - start) / DAY / step)].revenue += Number(row.amount);
  for (const row of expenses) buckets[Math.floor((time(row.date) - start) / DAY / step)].expenses += Number(row.amount);
  return buckets;
}
