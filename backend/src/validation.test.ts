import assert from 'node:assert/strict';
import test from 'node:test';
import { calendarDate, checkbox, nonNegativeNumber, optionalText, positiveInteger, positiveNumber, requiredText, startOfMoscowPeriod } from './validation.js';

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
  const earlyMoscow = new Date('2026-07-23T22:00:00.000Z');
  assert.equal(startOfMoscowPeriod('day', earlyMoscow).toISOString(), '2026-07-23T21:00:00.000Z');
  assert.equal(startOfMoscowPeriod('week', earlyMoscow).toISOString(), '2026-07-17T21:00:00.000Z');
  assert.equal(startOfMoscowPeriod('month', earlyMoscow).toISOString(), '2026-06-30T21:00:00.000Z');
});
