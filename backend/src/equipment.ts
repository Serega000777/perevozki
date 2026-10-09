import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import {
  calendarDate,
  checkbox,
  InputError,
  nonNegativeNumber,
  optionalText,
  positiveInteger,
  positiveNumber,
  requiredText,
  startOfMoscowPeriod,
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

const expenseData = (body: any) => ({
  vehicleId: positiveInteger(body.vehicleId, 'Техника'),
  categoryId: positiveInteger(body.categoryId, 'Категория'),
  date: calendarDate(body.date),
  amount: positiveNumber(body.amount, 'Сумма'),
  comment: optionalText(body.comment),
});

type VehicleSummary = { vehicleId: number; name: string; revenue: number; unpaid: number; expenses: number; trips: number };

export function equipmentRouter(prisma: PrismaClient) {
  const router = Router();

  router.get('/vehicles', async (_req, res) => {
    res.json(await prisma.equipmentVehicle.findMany({ orderBy: { name: 'asc' } }));
  });
  router.post('/vehicles', async (req, res) => {
    const data = { name: requiredText(req.body.name, 'Название техники', 100), note: optionalText(req.body.note, 250) };
    res.status(201).json(await prisma.equipmentVehicle.create({ data }));
  });
  router.patch('/vehicles/:id', async (req, res) => {
    const data = { name: requiredText(req.body.name, 'Название техники', 100), note: optionalText(req.body.note, 250) };
    res.json(await prisma.equipmentVehicle.update({ where: { id: positiveInteger(req.params.id, 'ID техники') }, data }));
  });
  router.delete('/vehicles/:id', async (req, res) => {
    const id = positiveInteger(req.params.id, 'ID техники');
    const used = await prisma.equipmentVehicle.findUniqueOrThrow({ where: { id }, include: { _count: { select: { trips: true, expenses: true } } } });
    if (used._count.trips || used._count.expenses) throw new InputError('Нельзя удалить технику с ходками или расходами');
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
      await prisma.equipmentTrip.update({ where: { id: positiveInteger(req.params.id, 'ID ходки') }, data: tripData(req.body), include: { vehicle: true } }),
    );
  });
  router.patch('/trips/:id/paid', async (req, res) => {
    res.json(await prisma.equipmentTrip.update({ where: { id: positiveInteger(req.params.id, 'ID ходки') }, data: { paid: checkbox(req.body.paid) } }));
  });
  router.delete('/trips/:id', async (req, res) => {
    res.json(await prisma.equipmentTrip.delete({ where: { id: positiveInteger(req.params.id, 'ID ходки') } }));
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
    let from = startOfMoscowPeriod(req.query.period),
      to: Date | undefined;
    if (req.query.period === 'custom') {
      from = calendarDate(req.query.from);
      to = new Date(calendarDate(req.query.to).getTime() + 24 * 60 * 60 * 1000);
    }
    const where = { ...(vehicleId ? { vehicleId } : {}), date: { gte: from, ...(to ? { lt: to } : {}) } };
    const [trips, expenses] = await Promise.all([
      prisma.equipmentTrip.findMany({ where, include: { vehicle: true }, orderBy: { date: 'asc' } }),
      prisma.equipmentExpense.findMany({ where, include: { vehicle: true, category: true }, orderBy: { date: 'asc' } }),
    ]);
    const revenue = trips.filter((x) => x.paid).reduce((sum, x) => sum + n(x.amount), 0);
    const unpaid = trips.filter((x) => !x.paid).reduce((sum, x) => sum + n(x.amount), 0);
    const costs = expenses.reduce((sum, x) => sum + n(x.amount), 0);
    const byVehicle = Object.values(
      [...trips, ...expenses].reduce<Record<number, VehicleSummary>>((all, row) => {
        const item = all[row.vehicleId] ?? { vehicleId: row.vehicleId, name: row.vehicle.name, revenue: 0, unpaid: 0, expenses: 0, trips: 0 };
        if ('paid' in row) {
          item.trips++;
          if (row.paid) item.revenue += n(row.amount);
          else item.unpaid += n(row.amount);
        } else item.expenses += n(row.amount);
        all[row.vehicleId] = item;
        return all;
      }, {}),
    ).map((x) => ({ ...x, profit: x.revenue - x.expenses }));
    res.json({
      from,
      to: to ?? new Date(),
      revenue,
      expenses: costs,
      profit: revenue - costs,
      unpaid,
      trips: trips.length,
      byVehicle,
      tripRows: trips,
      expenseRows: expenses,
    });
  });

  return router;
}
