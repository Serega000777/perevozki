import assert from 'node:assert/strict';
import test from 'node:test';
import { dayTitle, lastAddedDay, groupBy, groupByDay, groupByVehicle, plural, rub, shiftDay, shortDate, toNumberInput, todayKey } from './format';

const nbsp = (s: string) => s.replace(/[  ]/g, ' ');

test('рубли без копеек для целых сумм и с копейками для дробных', () => {
  assert.equal(nbsp(rub(5551540)), '5 551 540 ₽');
  assert.equal(nbsp(rub('12000.5')), '12 000,5 ₽');
  assert.equal(nbsp(rub(-207735)), '-207 735 ₽');
});

test('сегодня считается в поясе устройства, а не в UTC', () => {
  // 00:30 по Москве = 21:30 UTC предыдущего дня; getTimezoneOffset зависит от машины, поэтому проверяем инвариант.
  const now = new Date(2026, 9, 17, 0, 30);
  assert.equal(todayKey(now), '2026-10-17');
});

test('заголовок дня: сегодня, текущий и прошлый год', () => {
  assert.equal(dayTitle('2026-10-17', '2026-10-17'), 'Сегодня, 17 октября');
  assert.equal(dayTitle('2026-10-14', '2026-10-17'), '14 октября, ср');
  assert.equal(dayTitle('2025-12-31', '2026-10-17'), '31 декабря 2025 г., ср');
});

test('вчера, позавчера и короткая дата', () => {
  assert.equal(shiftDay('2026-10-19', -1), '2026-10-18');
  assert.equal(shiftDay('2026-03-01', -2), '2026-02-27');
  assert.equal(shiftDay('2026-01-01', -1), '2025-12-31');
  assert.equal(shortDate('2026-10-11'), '11.10');
});

test('ввод чисел с телефона: запятая и пробелы', () => {
  assert.equal(toNumberInput('12,5'), '12.5');
  assert.equal(toNumberInput(' 12 000 '), '12000');
  assert.equal(toNumberInput(null), '');
});

test('склонения', () => {
  assert.deepEqual(
    [1, 2, 5, 11, 12, 21, 22, 25, 111].map((n) => plural(n, ['ходка', 'ходки', 'ходок'])),
    ['ходка', 'ходки', 'ходок', 'ходок', 'ходок', 'ходка', 'ходки', 'ходок', 'ходок'],
  );
});

const trip = (id: number, date: string, vehicleId: number, amount = 100) => ({ id, date: `${date}T12:00:00.000Z`, vehicleId, amount });

test('последняя добавленная — по id, а не по самой поздней дате', () => {
  assert.equal(lastAddedDay([trip(5, '2026-10-11', 1), trip(9, '2026-10-02', 1), trip(7, '2026-10-17', 2)]), '2026-10-02');
  assert.equal(lastAddedDay([]), null);
});

test('по дням: даты по убыванию, внутри дня свежие сверху', () => {
  const groups = groupByDay([trip(1, '2026-10-12', 1), trip(3, '2026-10-14', 1), trip(2, '2026-10-12', 2)]);
  assert.deepEqual(
    groups.map((g) => [g.day, g.rows.map((r) => r.id)]),
    [
      ['2026-10-14', [3]],
      ['2026-10-12', [2, 1]],
    ],
  );
});

test('по машинам: порядок справочника, пустые машины скрыты', () => {
  const vehicles = [
    { id: 2, name: 'КамАЗ 162' },
    { id: 1, name: 'МАЗ 212' },
    { id: 3, name: 'JCB' },
  ];
  const groups = groupByVehicle([trip(1, '2026-10-12', 1), trip(2, '2026-10-13', 2), trip(3, '2026-10-14', 1)], vehicles);
  assert.deepEqual(
    groups.map((g) => [g.vehicle.name, g.rows.map((r) => r.id)]),
    [
      ['КамАЗ 162', [2]],
      ['МАЗ 212', [1, 3]],
    ],
  );
});

test('по ключу: суммы и сортировка от крупных к мелким', () => {
  const rows = [
    { category: 'Топливо', amount: 100 },
    { category: 'Запчасти', amount: 500 },
    { category: 'Топливо', amount: '50.5' },
  ];
  const groups = groupBy(
    rows,
    (r) => r.category,
    (r) => Number(r.amount),
  );
  assert.deepEqual(
    groups.map((g) => [g.name, g.total, g.rows.length]),
    [
      ['Запчасти', 500, 1],
      ['Топливо', 150.5, 2],
    ],
  );
});
