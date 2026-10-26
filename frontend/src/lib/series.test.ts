import assert from 'node:assert/strict';
import test from 'node:test';
import { bestMonth, monthTitle, periodDays, revenueSeries } from './series';

const trip = (date: string, amount: number, paid = true) => ({ date: `${date}T12:00:00.000Z`, amount, paid });

test('месяц: по неделям до текущей, неоплаченные тоже в выручке', () => {
  const rows = [trip('2026-10-01', 100), trip('2026-10-07', 50), trip('2026-10-08', 30), trip('2026-10-19', 70), trip('2026-10-19', 999, false)];
  // to = 19 октября по Москве → 3 недели
  assert.deepEqual(revenueSeries(rows, 'month', '2026-09-30T21:00:00.000Z', '2026-10-19T09:00:00.000Z'), [
    { label: '1 нед', value: 150 },
    { label: '2 нед', value: 30 },
    { label: '3 нед', value: 1069 },
  ]);
});

test('неделя: 7 дней от начала периода по Москве', () => {
  const points = revenueSeries([trip('2026-10-13', 10), trip('2026-10-19', 5)], 'week', '2026-10-12T21:00:00.000Z', '2026-10-19T09:00:00.000Z');
  assert.equal(points.length, 7);
  assert.deepEqual(
    [points[0], points[6]],
    [
      { label: 'вт', value: 10 },
      { label: 'пн', value: 5 },
    ],
  );
});

test('прошлая неделя целиком, текущая — по сегодня', () => {
  const last = revenueSeries([trip('2026-10-25', 5)], 'week', '2026-10-18T21:00:00.000Z', '2026-10-25T21:00:00.000Z');
  assert.deepEqual([last.length, last[0].label, last[6]], [7, 'пн', { label: 'вс', value: 5 }]);
  const current = revenueSeries([], 'week', '2026-10-25T21:00:00.000Z', '2026-10-28T09:00:00.000Z');
  assert.deepEqual(
    current.map((p) => p.label),
    ['пн', 'вт', 'ср'],
  );
  assert.deepEqual(periodDays('2026-10-18T21:00:00.000Z', '2026-10-25T21:00:00.000Z'), ['2026-10-19', '2026-10-25']);
});

test('день — без графика; всё время — по месяцам', () => {
  assert.deepEqual(revenueSeries([trip('2026-10-19', 1)], 'day', '2026-10-18T21:00:00.000Z', '2026-10-19T09:00:00.000Z'), []);
  assert.deepEqual(revenueSeries([trip('2026-09-20', 5), trip('2026-10-01', 7), trip('2026-10-02', 3)], 'all', null, '2026-10-19T09:00:00.000Z'), [
    { label: 'сен', value: 5 },
    { label: 'окт', value: 10 },
  ]);
  assert.deepEqual(
    revenueSeries([trip('2025-12-20', 5), trip('2026-01-01', 7)], 'all', null, '2026-10-19T09:00:00.000Z').map((p) => p.label),
    ['дек 25', 'янв 26'],
  );
});

test('свои даты: короткий период по дням, длинный по неделям', () => {
  const short = revenueSeries([trip('2026-10-02', 4)], 'custom', '2026-09-30T21:00:00.000Z', '2026-10-03T21:00:00.000Z');
  assert.deepEqual(short, [
    { label: '01.10', value: 0 },
    { label: '02.10', value: 4 },
    { label: '03.10', value: 0 },
  ]);
  const long = revenueSeries([trip('2026-09-09', 4)], 'custom', '2026-08-31T21:00:00.000Z', '2026-09-30T21:00:00.000Z');
  assert.deepEqual(long.slice(0, 2), [
    { label: '01.09', value: 0 },
    { label: '08.09', value: 4 },
  ]);
  assert.equal(long.length, 5);
});

test('лучший месяц по выручке вместе с неоплаченными', () => {
  const best = bestMonth([trip('2026-09-01', 300), trip('2026-10-01', 80), trip('2026-10-02', 50), trip('2026-10-03', 500, false)]);
  assert.deepEqual(best, { key: '2026-10', revenue: 630, trips: 3, paid: 2, unpaid: 1 });
  assert.equal(monthTitle('2026-10'), 'Октябрь');
  assert.equal(bestMonth([]), null);
});
