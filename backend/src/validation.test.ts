import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calendarDate,
  checkbox,
  nonNegativeNumber,
  optionalText,
  positiveInteger,
  positiveNumber,
  requiredText,
  customMoscowPeriod,
  moscowPeriod,
} from './validation.js';

test('отрицательные и нулевые значения отклоняются', () => {
  assert.throws(() => positiveNumber(-1, 'Сумма'));
  assert.throws(() => positiveNumber(0, 'Сумма'));
  assert.throws(() => positiveInteger(1.5, 'ID'));
  assert.equal(positiveInteger('10', 'ID'), 10);
  assert.equal(nonNegativeNumber(undefined, 'Цена'), 0);
  assert.throws(() => nonNegativeNumber(-0.01, 'Цена'));
});

test('текстовые поля обрезаются и ограничиваются', () => {
  assert.equal(requiredText('  JCB  ', 'Название'), 'JCB');
  assert.throws(() => requiredText('   ', 'Название'));
  assert.throws(() => requiredText('x'.repeat(101), 'Название', 100));
  assert.equal(optionalText('  '), null);
});

test('календарная дата сохраняет выбранный день', () => {
  assert.equal(calendarDate('2026-07-24').toISOString(), '2026-07-24T12:00:00.000Z');
  assert.throws(() => calendarDate('2026-02-30'));
  assert.throws(() => calendarDate('24.07.2026'));
});

test('чекбокс из формы и JSON', () => {
  assert.equal(checkbox('on'), true);
  assert.equal(checkbox(true), true);
  assert.equal(checkbox('true'), true);
  assert.equal(checkbox(undefined), false);
  assert.equal(checkbox(false), false);
});

test('границы периода рассчитываются по Москве', () => {
  const earlyMoscow = new Date('2026-07-23T22:00:00.000Z'); // пятница, 01:00 по Москве
  assert.equal(moscowPeriod('day', earlyMoscow).from.toISOString(), '2026-07-23T21:00:00.000Z');
  assert.equal(moscowPeriod('month', earlyMoscow).from.toISOString(), '2026-06-30T21:00:00.000Z');
  assert.deepEqual(moscowPeriod('week', earlyMoscow), { from: new Date('2026-07-19T21:00:00.000Z') });
});

test('неделя: в пн и вт — прошлая целиком, со среды — текущая', () => {
  const lastWeek = { from: new Date('2026-10-18T21:00:00.000Z'), to: new Date('2026-10-25T21:00:00.000Z') };
  assert.deepEqual(moscowPeriod('week', new Date('2026-10-25T21:00:00.000Z')), lastWeek); // пн 00:00
  assert.deepEqual(moscowPeriod('week', new Date('2026-10-27T20:59:00.000Z')), lastWeek); // вт 23:59
  assert.deepEqual(moscowPeriod('week', new Date('2026-10-27T21:00:00.000Z')), { from: new Date('2026-10-25T21:00:00.000Z') }); // ср
  assert.deepEqual(moscowPeriod('week', new Date('2026-10-25T20:00:00.000Z')), { from: new Date('2026-10-18T21:00:00.000Z') }); // вс
  assert.deepEqual(moscowPeriod('week', new Date('2026-03-02T09:00:00.000Z')), {
    from: new Date('2026-02-22T21:00:00.000Z'),
    to: new Date('2026-03-01T21:00:00.000Z'),
  }); // через границу месяца
});

test('свои даты — от полуночи первого дня до полуночи после последнего', () => {
  assert.deepEqual(customMoscowPeriod('2026-10-19', '2026-10-25'), {
    from: new Date('2026-10-18T21:00:00.000Z'),
    to: new Date('2026-10-25T21:00:00.000Z'),
  });
  assert.throws(() => customMoscowPeriod('2026-10-19', ''), /дату/);
});
