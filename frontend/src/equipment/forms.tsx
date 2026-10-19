import { useState, type FormEvent } from 'react';
import { IdCard, Truck } from 'lucide-react';
import { toNumberInput, todayKey } from '../lib/format';
import type { Category, Expense, Trip, Vehicle } from './types';
import { Choice, DateChips, ErrorNote, errorText, Field, PrimaryButton } from './ui';

const LAST_VEHICLE = 'perevozki:lastVehicle';

// Последняя выбранная машина — в localStorage; если он недоступен, берём первую.
export function defaultVehicle(vehicles: Vehicle[]) {
  try {
    const id = Number(localStorage.getItem(LAST_VEHICLE));
    if (vehicles.some((v) => v.id === id)) return id;
  } catch {
    // приватный режим WebView
  }
  return vehicles[0]?.id ?? null;
}

export function rememberVehicle(id: number) {
  try {
    localStorage.setItem(LAST_VEHICLE, String(id));
  } catch {
    // не критично
  }
}

function useSubmit<T>(draft: T, onSubmit: (draft: T) => Promise<void>, after?: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSubmit(draft);
      after?.();
    } catch (x) {
      setError(errorText(x));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, submit };
}

export type TripDraft = { vehicleId: number | null; date: string; destination: string; amount: string; mileage: string; comment: string; paid: boolean };

export const newTrip = (vehicles: Vehicle[]): TripDraft => ({
  vehicleId: defaultVehicle(vehicles),
  date: todayKey(),
  destination: '',
  amount: '',
  mileage: '',
  comment: '',
  paid: false,
});
export const tripDraft = (t: Trip): TripDraft => ({
  vehicleId: t.vehicleId,
  date: t.date.slice(0, 10),
  destination: t.destination,
  amount: String(Number(t.amount)),
  mileage: t.mileage == null ? '' : String(Number(t.mileage)),
  comment: t.comment ?? '',
  paid: t.paid,
});
export const tripPayload = (d: TripDraft) => ({ ...d, amount: toNumberInput(d.amount), mileage: toNumberInput(d.mileage) });

export function TripForm({
  vehicles,
  initial,
  submitLabel,
  onSubmit,
  keepVehicleAndDate = false,
  lastDate,
}: {
  vehicles: Vehicle[];
  initial: TripDraft;
  submitLabel: string;
  onSubmit: (draft: TripDraft) => Promise<void>;
  keepVehicleAndDate?: boolean;
  lastDate?: string | null;
}) {
  const [d, setD] = useState(initial);
  const set = <K extends keyof TripDraft>(key: K, value: TripDraft[K]) => setD((x) => ({ ...x, [key]: value }));
  // После добавления обычно вносят следующую ходку той же машины за тот же день.
  const { busy, error, submit } = useSubmit(
    d,
    onSubmit,
    keepVehicleAndDate ? () => setD((x) => ({ ...newTrip(vehicles), vehicleId: x.vehicleId, date: x.date })) : undefined,
  );
  return (
    <form className="form" onSubmit={submit}>
      <Choice label="Машина" options={vehicles.map((v) => ({ value: v.id, label: v.name }))} value={d.vehicleId} onChange={(v) => set('vehicleId', v)} />
      <div className="pair">
        <Field label="Дата" type="date" value={d.date} onChange={(e) => set('date', e.target.value)} required />
        <Field label="Цена, ₽" inputMode="decimal" placeholder="0" value={d.amount} onChange={(e) => set('amount', e.target.value)} required />
      </div>
      <DateChips value={d.date} onChange={(v) => set('date', v)} last={lastDate} />
      <Field label="Куда ездил" placeholder="Карьер, объект, адрес" value={d.destination} onChange={(e) => set('destination', e.target.value)} required />
      <div className="pair">
        <Field label="Пробег, км" inputMode="decimal" placeholder="—" value={d.mileage} onChange={(e) => set('mileage', e.target.value)} />
        <Field label="Комментарий" placeholder="—" value={d.comment} onChange={(e) => set('comment', e.target.value)} />
      </div>
      <label className="switch">
        <input type="checkbox" checked={d.paid} onChange={(e) => set('paid', e.target.checked)} />
        <span>Деньги за ходку получены</span>
      </label>
      <ErrorNote>{error}</ErrorNote>
      <PrimaryButton plus={keepVehicleAndDate} disabled={busy || d.vehicleId == null}>
        {busy ? 'Сохраняем…' : submitLabel}
      </PrimaryButton>
    </form>
  );
}

export type ExpenseDraft = { vehicleId: number | null; categoryId: number | null; date: string; amount: string; comment: string };

export const newExpense = (vehicles: Vehicle[], categories: Category[]): ExpenseDraft => ({
  vehicleId: defaultVehicle(vehicles),
  categoryId: categories[0]?.id ?? null,
  date: todayKey(),
  amount: '',
  comment: '',
});
export const expenseDraft = (x: Expense): ExpenseDraft => ({
  vehicleId: x.vehicleId,
  categoryId: x.categoryId,
  date: x.date.slice(0, 10),
  amount: String(Number(x.amount)),
  comment: x.comment ?? '',
});
export const expensePayload = (d: ExpenseDraft) => ({ ...d, amount: toNumberInput(d.amount) });

export function ExpenseForm({
  vehicles,
  categories,
  initial,
  submitLabel,
  onSubmit,
  keepVehicleAndDate = false,
  lastDate,
}: {
  vehicles: Vehicle[];
  categories: Category[];
  initial: ExpenseDraft;
  submitLabel: string;
  onSubmit: (draft: ExpenseDraft) => Promise<void>;
  keepVehicleAndDate?: boolean;
  lastDate?: string | null;
}) {
  const [d, setD] = useState(initial);
  const set = <K extends keyof ExpenseDraft>(key: K, value: ExpenseDraft[K]) => setD((x) => ({ ...x, [key]: value }));
  const { busy, error, submit } = useSubmit(d, onSubmit, keepVehicleAndDate ? () => setD((x) => ({ ...x, amount: '', comment: '' })) : undefined);
  return (
    <form className="form" onSubmit={submit}>
      <Choice label="Машина" options={vehicles.map((v) => ({ value: v.id, label: v.name }))} value={d.vehicleId} onChange={(v) => set('vehicleId', v)} />
      <Choice
        label="Категория"
        shape="pill"
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
        value={d.categoryId}
        onChange={(v) => set('categoryId', v)}
      />
      <div className="pair">
        <Field label="Дата" type="date" value={d.date} onChange={(e) => set('date', e.target.value)} required />
        <Field label="Сумма, ₽" inputMode="decimal" placeholder="0" value={d.amount} onChange={(e) => set('amount', e.target.value)} required />
      </div>
      <DateChips value={d.date} onChange={(v) => set('date', v)} last={lastDate} />
      <Field label="Комментарий" placeholder="Кому, за что" value={d.comment} onChange={(e) => set('comment', e.target.value)} />
      <ErrorNote>{error}</ErrorNote>
      <PrimaryButton plus={keepVehicleAndDate} disabled={busy || d.vehicleId == null || d.categoryId == null}>
        {busy ? 'Сохраняем…' : submitLabel}
      </PrimaryButton>
    </form>
  );
}

export type VehicleDraft = { name: string; note: string };

export function VehicleForm({
  initial,
  submitLabel,
  onSubmit,
  resetAfter = false,
}: {
  initial: VehicleDraft;
  submitLabel: string;
  onSubmit: (draft: VehicleDraft) => Promise<void>;
  resetAfter?: boolean;
}) {
  const [d, setD] = useState(initial);
  const { busy, error, submit } = useSubmit(d, onSubmit, resetAfter ? () => setD({ name: '', note: '' }) : undefined);
  return (
    <form className="form" onSubmit={submit}>
      <Field
        label="Название"
        icon={<Truck />}
        placeholder="Например, КамАЗ 162"
        value={d.name}
        onChange={(e) => setD({ ...d, name: e.target.value })}
        required
        maxLength={100}
      />
      <Field
        label="Госномер или описание"
        icon={<IdCard />}
        placeholder="Необязательно"
        value={d.note}
        onChange={(e) => setD({ ...d, note: e.target.value })}
        maxLength={250}
      />
      <ErrorNote>{error}</ErrorNote>
      <PrimaryButton plus={resetAfter} disabled={busy}>
        {busy ? 'Сохраняем…' : submitLabel}
      </PrimaryButton>
    </form>
  );
}
