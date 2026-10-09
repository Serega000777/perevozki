// API-тесты против настоящей PostgreSQL (DATABASE_URL, миграции применены).
// Создают только свои записи с уникальными именами и удаляют их в конце.
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { createApp } from './app.js';
import { signInitData } from './testing.js';

const token = 'e2e-test-token';
const telegramId = 990_000_000 + Math.floor(Math.random() * 1_000_000);
process.env.BOT_TOKEN = token;
process.env.ADMIN_TELEGRAM_IDS = String(telegramId);

const prisma = new PrismaClient();
const server = createApp(prisma, true).listen(0);
const tag = `e2e-${Date.now()}`;
const created = { vehicles: [] as number[], categories: [] as number[] };
const headers = { 'content-type': 'application/json', 'x-telegram-init-data': signInitData({ id: telegramId, first_name: 'E2E', last_name: 'Тест' }, token) };
const moscowDay = (offsetDays = 0) => new Date(Date.now() + 3 * 3600_000 + offsetDays * 86400_000).toISOString().slice(0, 10);
let base = '';

async function call(method: string, path: string, body?: unknown, extraHeaders: Record<string, string> = headers) {
  const response = await fetch(`${base}${path}`, { method, headers: extraHeaders, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}

before(async () => {
  if (!server.listening) await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  const vehicleId = { in: created.vehicles };
  await prisma.equipmentExpense.deleteMany({ where: { vehicleId } });
  await prisma.equipmentTrip.deleteMany({ where: { vehicleId } });
  await prisma.equipmentVehicle.deleteMany({ where: { id: vehicleId } });
  await prisma.equipmentExpenseCategory.deleteMany({ where: { id: { in: created.categories } } });
  await prisma.user.deleteMany({ where: { telegramId: BigInt(telegramId) } });
  server.close();
  await prisma.$disconnect();
});

test('health проверяет БД и не требует авторизации', async () => {
  assert.deepEqual(await call('GET', '/health', undefined, {}), { status: 200, body: { status: 'ok' } });
});

test('без initData, с чужой подписью и с чужим ID — отказ', async () => {
  assert.equal((await call('GET', '/api/equipment/vehicles', undefined, {})).status, 401);
  const wrongSignature = signInitData({ id: telegramId }, 'not-the-bot-token');
  assert.equal((await call('GET', '/api/equipment/vehicles', undefined, { 'x-telegram-init-data': wrongSignature })).status, 401);
  const stranger = signInitData({ id: telegramId + 1 }, token);
  assert.deepEqual(await call('GET', '/api/equipment/vehicles', undefined, { 'x-telegram-init-data': stranger }), {
    status: 403,
    body: { error: 'Доступ запрещён' },
  });
});

test('auth/me создаёт пользователя с именем из Telegram', async () => {
  const { status, body } = await call('GET', '/api/auth/me');
  assert.equal(status, 200);
  assert.equal(body.name, 'E2E Тест');
  assert.equal(body.telegramId, String(telegramId));
});

test('миграция заполнила стандартные категории расходов', async () => {
  const { body } = await call('GET', '/api/equipment/categories');
  const names = body.map((x: { name: string }) => x.name);
  for (const name of ['Запчасти', 'Зарплата', 'Прочее', 'Ремонт', 'Топливо']) assert.ok(names.includes(name), name);
});

test('полный сценарий: техника → ходки → расходы → аналитика → удаление', async () => {
  // техника
  assert.equal((await call('POST', '/api/equipment/vehicles', { name: '  ' })).status, 400);
  const vehicle = await call('POST', '/api/equipment/vehicles', { name: `${tag} JCB 3CX`, note: 'А123ВС' });
  assert.equal(vehicle.status, 201);
  created.vehicles.push(vehicle.body.id);
  const vehicleId = vehicle.body.id;
  const renamed = await call('PATCH', `/api/equipment/vehicles/${vehicleId}`, { name: `${tag} JCB`, note: '' });
  assert.deepEqual([renamed.body.name, renamed.body.note], [`${tag} JCB`, null]);
  assert.ok((await call('GET', '/api/equipment/vehicles')).body.some((x: { id: number }) => x.id === vehicleId));

  // ходки
  const today = moscowDay();
  assert.deepEqual((await call('POST', '/api/equipment/trips', { vehicleId, date: '2026-02-30', destination: 'Карьер', amount: 1000 })).body, {
    error: 'Укажите корректную дату',
  });
  const paidTrip = await call('POST', '/api/equipment/trips', {
    vehicleId,
    date: today,
    destination: 'Карьер',
    amount: '15000',
    mileage: '120.5',
    comment: 'песок',
    paid: 'on',
  });
  assert.equal(paidTrip.status, 201);
  assert.deepEqual([paidTrip.body.vehicle.id, paidTrip.body.paid, Number(paidTrip.body.mileage)], [vehicleId, true, 120.5]);
  const unpaidTrip = await call('POST', '/api/equipment/trips', { vehicleId, date: today, destination: 'Стройка', amount: '7000', mileage: '' });
  assert.deepEqual([unpaidTrip.body.paid, unpaidTrip.body.mileage], [false, null]);
  const edited = await call('PATCH', `/api/equipment/trips/${unpaidTrip.body.id}`, {
    vehicleId,
    date: today,
    destination: 'Стройка-2',
    amount: 8000,
    mileage: null,
    comment: '',
    paid: false,
  });
  assert.deepEqual([edited.body.destination, Number(edited.body.amount)], ['Стройка-2', 8000]);
  assert.equal((await call('PATCH', `/api/equipment/trips/${unpaidTrip.body.id}/paid`, { paid: true })).body.paid, true);
  assert.equal((await call('PATCH', `/api/equipment/trips/${unpaidTrip.body.id}/paid`, { paid: false })).body.paid, false);

  // категории и расходы
  const category = await call('POST', '/api/equipment/categories', { name: `${tag}-шины` });
  assert.equal(category.status, 201);
  created.categories.push(category.body.id);
  assert.equal((await call('POST', '/api/equipment/categories', { name: `${tag}-шины` })).status, 400);
  assert.equal((await call('POST', '/api/equipment/expenses', { vehicleId, categoryId: category.body.id, date: today, amount: 0 })).status, 400);
  const expense = await call('POST', '/api/equipment/expenses', { vehicleId, categoryId: category.body.id, date: today, amount: '4500.50', comment: 'зимние' });
  assert.equal(expense.status, 201);
  assert.deepEqual([expense.body.category.name, expense.body.vehicle.id], [`${tag}-шины`, vehicleId]);
  const editedExpense = await call('PATCH', `/api/equipment/expenses/${expense.body.id}`, {
    vehicleId,
    categoryId: category.body.id,
    date: today,
    amount: 5000,
    comment: '',
  });
  assert.deepEqual([Number(editedExpense.body.amount), editedExpense.body.comment], [5000, null]);
  assert.ok((await call('GET', '/api/equipment/trips')).body.some((x: { id: number }) => x.id === paidTrip.body.id));
  assert.ok((await call('GET', '/api/equipment/expenses')).body.some((x: { id: number }) => x.id === expense.body.id));

  // аналитика: выручка = оплаченные ходки, «не отдали» = неоплаченные
  const month = await call('GET', `/api/equipment/analytics?period=month&vehicleId=${vehicleId}`);
  assert.equal(month.status, 200);
  const { revenue, expenses, profit, unpaid, trips, byVehicle } = month.body;
  assert.deepEqual({ revenue, expenses, profit, unpaid, trips }, { revenue: 15000, expenses: 5000, profit: 10000, unpaid: 8000, trips: 2 });
  assert.deepEqual(byVehicle, [{ vehicleId, name: `${tag} JCB`, revenue: 15000, unpaid: 8000, expenses: 5000, trips: 2, profit: 10000 }]);
  assert.equal(month.body.tripRows.length, 2);
  assert.equal(month.body.expenseRows.length, 1);
  const custom = await call('GET', `/api/equipment/analytics?period=custom&from=${today}&to=${today}&vehicleId=${vehicleId}`);
  assert.equal(custom.body.trips, 2);
  const yesterday = moscowDay(-1);
  const empty = await call('GET', `/api/equipment/analytics?period=custom&from=${yesterday}&to=${yesterday}&vehicleId=${vehicleId}`);
  assert.deepEqual([empty.body.trips, empty.body.revenue, empty.body.byVehicle], [0, 0, []]);

  // защита от удаления используемых записей
  assert.deepEqual((await call('DELETE', `/api/equipment/vehicles/${vehicleId}`)).body, { error: 'Нельзя удалить технику с ходками или расходами' });
  assert.deepEqual((await call('DELETE', `/api/equipment/categories/${category.body.id}`)).body, { error: 'Категория уже используется в расходах' });

  // удаление
  assert.equal((await call('DELETE', `/api/equipment/expenses/${expense.body.id}`)).status, 200);
  assert.equal((await call('DELETE', `/api/equipment/trips/${paidTrip.body.id}`)).status, 200);
  assert.equal((await call('DELETE', `/api/equipment/trips/${unpaidTrip.body.id}`)).status, 200);
  assert.equal((await call('DELETE', `/api/equipment/trips/${unpaidTrip.body.id}`)).status, 404);
  assert.equal((await call('DELETE', `/api/equipment/categories/${category.body.id}`)).status, 200);
  assert.equal((await call('DELETE', `/api/equipment/vehicles/${vehicleId}`)).status, 200);
  assert.equal((await call('DELETE', `/api/equipment/vehicles/${vehicleId}`)).status, 404);
});
