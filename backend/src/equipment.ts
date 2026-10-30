import express, { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import {
  calendarDate,
  checkbox,
  customMoscowPeriod,
  InputError,
  moscowPeriod,
  nonNegativeNumber,
  optionalText,
  positiveInteger,
  positiveNumber,
  requiredText,
} from './validation.js';

const n = (value: unknown) => Number(value || 0);

const tripData = (body: any) => ({
  vehicleId: positiveInteger(body.vehicleId, 'Техника'),
  date: calendarDate(body.date),
  destination: requiredText(body.destination, 'Куда ездил', 250),
  amount: nonNegativeNumber(body.amount, 'Цена'),
  mileage: body.mileage === '' || body.mileage == null ? null : nonNegativeNumber(body.mileage, 'Пробег'),
  comment: optionalText(body.comment),
  paid: checkbox(body.paid),
});

const vehicleData = (body: any) => ({
  name: requiredText(body.name, 'Название техники', 100),
  note: optionalText(body.note, 250),
  brand: optionalText(body.brand, 60),
  model: optionalText(body.model, 60),
  kind: optionalText(body.kind, 30),
});

// Тип фото проверяем по первым байтам, а не только по заголовку запроса.
const PHOTO_TYPES: Record<string, (b: Buffer) => boolean> = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
};

const expenseData = (body: any) => ({
  vehicleId: positiveInteger(body.vehicleId, 'Техника'),
  categoryId: positiveInteger(body.categoryId, 'Категория'),
  date: calendarDate(body.date),
  amount: positiveNumber(body.amount, 'Сумма'),
  comment: optionalText(body.comment),
});

// Зрителю открыта только статистика (и список машин для её фильтра); остальное закрыто по умолчанию.
const viewerRoutes = new Set(['/analytics', '/vehicles']);

type VehicleSummary = { vehicleId: number; name: string; revenue: number; unpaid: number; expenses: number; trips: number };

export function equipmentRouter(prisma: PrismaClient) {
  const router = Router();

  router.use((req, res, next) => {
    if (res.locals.role === 'owner' || (req.method === 'GET' && viewerRoutes.has(req.path))) return next();
    res.status(403).json({ error: 'Доступен только просмотр статистики' });
  });

  router.get('/vehicles', async (_req, res) => {
    res.json(await prisma.equipmentVehicle.findMany({ orderBy: { name: 'asc' } }));
  });
  router.post('/vehicles', async (req, res) => {
    res.status(201).json(await prisma.equipmentVehicle.create({ data: vehicleData(req.body) }));
  });
  router.patch('/vehicles/:id', async (req, res) => {
    res.json(await prisma.equipmentVehicle.update({ where: { id: positiveInteger(req.params.id, 'ID техники') }, data: vehicleData(req.body) }));
  });
  router.get('/vehicles/:id/photo', async (req, res) => {
    const photo = await prisma.equipmentVehiclePhoto.findUnique({ where: { vehicleId: positiveInteger(req.params.id, 'ID техники') } });
    if (!photo) return void res.status(404).json({ error: 'Фото нет' });
    // Адрес меняется вместе с photoAt, поэтому картинку можно кэшировать надолго.
    res.set('Cache-Control', 'private, max-age=31536000, immutable').type(photo.mime).send(Buffer.from(photo.data));
  });
  router.put('/vehicles/:id/photo', express.raw({ type: Object.keys(PHOTO_TYPES), limit: '3mb' }), async (req, res) => {
    const id = positiveInteger(req.params.id, 'ID техники');
    const mime = String(req.headers['content-type'] ?? '')
      .split(';')[0]
      .trim();
    const data = req.body;
    if (!Buffer.isBuffer(data) || !PHOTO_TYPES[mime]?.(data)) throw new InputError('Загрузите фото в формате JPEG, PNG или WebP');
    const photoAt = new Date();
    const bytes = new Uint8Array(data);
    await prisma.$transaction([
      prisma.equipmentVehicle.update({ where: { id }, data: { photoAt } }),
      prisma.equipmentVehiclePhoto.upsert({ where: { vehicleId: id }, create: { vehicleId: id, mime, data: bytes }, update: { mime, data: bytes } }),
    ]);
    res.json({ photoAt });
  });
  router.delete('/vehicles/:id/photo', async (req, res) => {
    const id = positiveInteger(req.params.id, 'ID техники');
    await prisma.$transaction([
      prisma.equipmentVehiclePhoto.deleteMany({ where: { vehicleId: id } }),
      prisma.equipmentVehicle.update({ where: { id }, data: { photoAt: null } }),
    ]);
    res.json({ photoAt: null });
  });
  router.delete('/vehicles/:id', async (req, res) => {
    const id = positiveInteger(req.params.id, 'ID техники');
    const used = await prisma.equipmentVehicle.findUniqueOrThrow({ where: { id }, include: { _count: { select: { trips: true, expenses: true } } } });
    if (used._count.trips || used._count.expenses) throw new InputError('Нельзя удалить технику с рейсами или расходами');
    res.json(await prisma.equipmentVehicle.delete({ where: { id } }));
  });

  router.get('/trips', async (_req, res) => {
    res.json(await prisma.equipmentTrip.findMany({ include: { vehicle: true }, orderBy: [{ date: 'desc' }, { id: 'desc' }] }));
  });
  router.post('/trips', async (req, res) => {
    res.status(201).json(await prisma.equipmentTrip.create({ data: tripData(req.body), include: { vehicle: true } }));
  });
  router.patch('/trips/:id', async (req, res) => {
    res.json(
      await prisma.equipmentTrip.update({ where: { id: positiveInteger(req.params.id, 'ID рейса') }, data: tripData(req.body), include: { vehicle: true } }),
    );
  });
  router.patch('/trips/:id/paid', async (req, res) => {
    res.json(await prisma.equipmentTrip.update({ where: { id: positiveInteger(req.params.id, 'ID рейса') }, data: { paid: checkbox(req.body.paid) } }));
  });
  router.delete('/trips/:id', async (req, res) => {
    res.json(await prisma.equipmentTrip.delete({ where: { id: positiveInteger(req.params.id, 'ID рейса') } }));
  });

  router.get('/categories', async (_req, res) => {
    res.json(await prisma.equipmentExpenseCategory.findMany({ orderBy: { name: 'asc' } }));
  });
  router.post('/categories', async (req, res) => {
    res.status(201).json(await prisma.equipmentExpenseCategory.create({ data: { name: requiredText(req.body.name, 'Название категории', 50) } }));
  });
  router.delete('/categories/:id', async (req, res) => {
    const id = positiveInteger(req.params.id, 'ID категории');
    if (await prisma.equipmentExpense.count({ where: { categoryId: id } })) throw new InputError('Категория уже используется в расходах');
    res.json(await prisma.equipmentExpenseCategory.delete({ where: { id } }));
  });

  router.get('/expenses', async (_req, res) => {
    res.json(await prisma.equipmentExpense.findMany({ include: { vehicle: true, category: true }, orderBy: [{ date: 'desc' }, { id: 'desc' }] }));
  });
  router.post('/expenses', async (req, res) => {
    res.status(201).json(await prisma.equipmentExpense.create({ data: expenseData(req.body), include: { vehicle: true, category: true } }));
  });
  router.patch('/expenses/:id', async (req, res) => {
    res.json(
      await prisma.equipmentExpense.update({
        where: { id: positiveInteger(req.params.id, 'ID расхода') },
        data: expenseData(req.body),
        include: { vehicle: true, category: true },
      }),
    );
  });
  router.delete('/expenses/:id', async (req, res) => {
    res.json(await prisma.equipmentExpense.delete({ where: { id: positiveInteger(req.params.id, 'ID расхода') } }));
  });

  router.get('/analytics', async (req, res) => {
    const vehicleId = req.query.vehicleId && req.query.vehicleId !== 'all' ? positiveInteger(req.query.vehicleId, 'Техника') : undefined;
    const { from, to } = req.query.period === 'custom' ? customMoscowPeriod(req.query.from, req.query.to) : moscowPeriod(req.query.period);
    // period=all — «Всё время»: без ограничения по дате.
    const allTime = req.query.period === 'all';
    const where = { ...(vehicleId ? { vehicleId } : {}), ...(allTime ? {} : { date: { gte: from, ...(to ? { lt: to } : {}) } }) };
    const [trips, expenses] = await Promise.all([
      prisma.equipmentTrip.findMany({ where, include: { vehicle: true }, orderBy: { date: 'asc' } }),
      prisma.equipmentExpense.findMany({ where, include: { vehicle: true, category: true }, orderBy: { date: 'asc' } }),
    ]);
    // Выручка и прибыль — по всем рейсам сразу; баланс — только полученные деньги:
    // неоплаченный рейс попадает в него, когда её отметят «Оплачено».
    const revenue = trips.reduce((sum, x) => sum + n(x.amount), 0);
    const unpaid = trips.filter((x) => !x.paid).reduce((sum, x) => sum + n(x.amount), 0);
    const costs = expenses.reduce((sum, x) => sum + n(x.amount), 0);
    const byVehicle = Object.values(
      [...trips, ...expenses].reduce<Record<number, VehicleSummary>>((all, row) => {
        const item = all[row.vehicleId] ?? { vehicleId: row.vehicleId, name: row.vehicle.name, revenue: 0, unpaid: 0, expenses: 0, trips: 0 };
        if ('paid' in row) {
          item.trips++;
          item.revenue += n(row.amount);
          if (!row.paid) item.unpaid += n(row.amount);
        } else item.expenses += n(row.amount);
        all[row.vehicleId] = item;
        return all;
      }, {}),
    ).map((x) => ({ ...x, profit: x.revenue - x.expenses }));
    res.json({
      from: allTime ? null : from,
      to: to ?? new Date(),
      revenue,
      expenses: costs,
      profit: revenue - costs,
      balance: revenue - unpaid - costs,
      unpaid,
      trips: trips.length,
      byVehicle,
      tripRows: trips,
      expenseRows: expenses,
    });
  });

  return router;
}
