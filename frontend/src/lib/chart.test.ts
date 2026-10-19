import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cashflowBuckets } from './chart';
import type { Trip, Expense } from '../equipment/types';

const vehicle = { id: 1, name: 'КамАЗ' };
const trip = (date: string, amount: string, paid = true): Trip => ({ id: 1, vehicleId: 1, vehicle, date, amount, paid, destination: 'Карьер' });
const expense = (date: string, amount: string): Expense => ({
  id: 1,
  vehicleId: 1,
  vehicle,
  date,
  amount,
  categoryId: 1,
  category: { id: 1, name: 'Топливо' },
});

test('cashflow excludes debt, preserves decimal totals and puts expenses on their own dates', () => {
  const result = cashflowBuckets([trip('2026-10-01', '120.50'), trip('2026-10-01', '900', false)], [expense('2026-10-03', '50.25')]);
  assert.deepEqual(result, [
    { from: '2026-10-01', to: '2026-10-01', revenue: 120.5, expenses: 0 },
    { from: '2026-10-02', to: '2026-10-02', revenue: 0, expenses: 0 },
    { from: '2026-10-03', to: '2026-10-03', revenue: 0, expenses: 50.25 },
  ]);
});
test('cashflow bounds long all-time periods without dropping endpoints or crossing-year labels', () => {
  const result = cashflowBuckets([trip('2020-01-01T12:00:00Z', '1'), trip('2026-10-19T12:00:00Z', '2')], [expense('2023-12-31', '4')]);
  assert.ok(result.length <= 6);
  assert.equal(result[0].from, '2020-01-01');
  assert.equal(result.at(-1)?.to, '2026-10-19');
  assert.equal(
    result.reduce((n, b) => n + b.revenue, 0),
    3,
  );
  assert.equal(
    result.reduce((n, b) => n + b.expenses, 0),
    4,
  );
});
test('cashflow handles empty, expense-only, and zero amounts', () => {
  assert.deepEqual(cashflowBuckets([], []), []);
  assert.deepEqual(cashflowBuckets([], [expense('2026-10-19', '0')]), [{ from: '2026-10-19', to: '2026-10-19', revenue: 0, expenses: 0 }]);
});
