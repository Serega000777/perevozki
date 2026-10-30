import { useEffect, useId, useState, type FormEvent } from 'react';
import { Camera, ChevronDown, IdCard, Truck } from 'lucide-react';
import { toNumberInput, todayKey } from '../lib/format';
import { shrinkPhoto } from '../lib/photo';
import { VehicleArt, VehicleImage } from './art';
import { BRANDS, brandModels, KINDS, kindGroup, TRADEMARKS } from './catalog';
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
  // После добавления обычно вносят следующий рейс той же машины за тот же день.
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
        <span>Деньги за рейс получены</span>
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

export type VehicleDraft = {
  name: string;
  note: string;
  brand: string;
  model: string;
  kind: string;
  // Новое фото к загрузке после сохранения или просьба убрать текущее.
  photo: Blob | null;
  removePhoto: boolean;
};

export const vehicleDraft = (v?: Vehicle): VehicleDraft => ({
  name: v?.name ?? '',
  note: v?.note ?? '',
  brand: v?.brand ?? '',
  model: v?.model ?? '',
  kind: v?.kind ?? '',
  photo: null,
  removePhoto: false,
});

const OTHER_BRAND = '__other';

export function VehicleForm({
  initial,
  vehicle,
  tone = 0,
  submitLabel,
  onSubmit,
}: {
  initial: VehicleDraft;
  vehicle?: Vehicle;
  tone?: number;
  submitLabel: string;
  onSubmit: (draft: VehicleDraft) => Promise<void>;
}) {
  const [d, setD] = useState(initial);
  const [customBrand, setCustomBrand] = useState(!!initial.brand && !BRANDS.some((b) => b.name === initial.brand));
  const [photoError, setPhotoError] = useState('');
  const set = <K extends keyof VehicleDraft>(key: K, value: VehicleDraft[K]) => setD((x) => ({ ...x, [key]: value }));
  const autoName = [d.brand, d.model].filter(Boolean).join(' ');
  const { busy, error, submit } = useSubmit({ ...d, name: d.name.trim() || autoName }, onSubmit);
  const models = useId();

  const group = kindGroup(d.kind);
  const brands = BRANDS.filter((b) => !group || b.group === group || b.name === d.brand);
  const chooseBrand = (value: string) => {
    setCustomBrand(value === OTHER_BRAND);
    setD((x) => ({ ...x, brand: value === OTHER_BRAND ? '' : value, model: value === x.brand ? x.model : '' }));
  };
  const pickPhoto = async (file?: File) => {
    if (!file) return;
    setPhotoError('');
    try {
      const photo = await shrinkPhoto(file);
      setD((x) => ({ ...x, photo, removePhoto: false }));
    } catch (x) {
      setPhotoError(errorText(x));
    }
  };
  const hasPhoto = !!d.photo || (!!vehicle?.photoAt && !d.removePhoto);

  return (
    <form className="form" onSubmit={submit}>
      <div className="vehicle-preview">
        <span className="vehicle-photo">
          <PhotoPreview draft={d} vehicle={vehicle} tone={tone} />
          {d.brand && <b className="brand-mark">{d.brand}</b>}
        </span>
        <span className="photo-actions">
          <label className="secondary photo-pick">
            <Camera aria-hidden />
            {hasPhoto ? 'Заменить фото' : 'Загрузить фото'}
            <input type="file" accept="image/*" onChange={(e) => pickPhoto(e.target.files?.[0])} hidden />
          </label>
          {hasPhoto ? (
            <button type="button" className="link" onClick={() => setD((x) => ({ ...x, photo: null, removePhoto: true }))}>
              Убрать фото
            </button>
          ) : (
            <small>Без фото — рисунок по виду техники</small>
          )}
        </span>
      </div>
      <ErrorNote>{photoError}</ErrorNote>
      <label className="field">
        <span>Вид техники</span>
        <span className="select">
          <select value={d.kind} onChange={(e) => set('kind', e.target.value)}>
            <option value="">Не выбран</option>
            {(['truck', 'machine'] as const).map((g) => (
              <optgroup key={g} label={g === 'truck' ? 'Грузовики' : 'Спецтехника'}>
                {KINDS.filter((k) => k.group === g).map((k) => (
                  <option value={k.key} key={k.key}>
                    {k.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown aria-hidden />
        </span>
      </label>
      <div className="pair">
        <label className="field">
          <span>Марка</span>
          <span className="select">
            <select value={customBrand ? OTHER_BRAND : d.brand} onChange={(e) => chooseBrand(e.target.value)}>
              <option value="">Не выбрана</option>
              {brands.map((b) => (
                <option value={b.name} key={b.name}>
                  {b.name}
                </option>
              ))}
              <option value={OTHER_BRAND}>Другая…</option>
            </select>
            <ChevronDown aria-hidden />
          </span>
        </label>
        <Field label="Модель" list={models} placeholder="65115" value={d.model} onChange={(e) => set('model', e.target.value)} maxLength={60} />
      </div>
      <datalist id={models}>
        {brandModels(d.brand).map((m) => (
          <option value={m} key={m} />
        ))}
      </datalist>
      {customBrand && <Field label="Название марки" value={d.brand} onChange={(e) => set('brand', e.target.value)} maxLength={60} required />}
      <Field
        label="Название"
        icon={<Truck />}
        placeholder={autoName || 'Например, КамАЗ 162'}
        value={d.name}
        onChange={(e) => set('name', e.target.value)}
        required={!autoName}
        maxLength={100}
      />
      <Field
        label="Госномер или описание"
        icon={<IdCard />}
        placeholder="Необязательно"
        value={d.note}
        onChange={(e) => set('note', e.target.value)}
        maxLength={250}
      />
      <details className="fine-print">
        <summary>Марки — товарные знаки их правообладателей</summary>
        <p>{TRADEMARKS}</p>
      </details>
      <ErrorNote>{error}</ErrorNote>
      <PrimaryButton plus={!vehicle} disabled={busy}>
        {busy ? 'Сохраняем…' : submitLabel}
      </PrimaryButton>
    </form>
  );
}

// Превью: только что выбранное фото, иначе текущее фото машины, иначе рисунок по виду техники.
function PhotoPreview({ draft, vehicle, tone }: { draft: VehicleDraft; vehicle?: Vehicle; tone: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!draft.photo) return setUrl(null);
    const next = URL.createObjectURL(draft.photo);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [draft.photo]);
  if (url) return <img className="vehicle-img" src={url} alt="" />;
  if (vehicle?.photoAt && !draft.removePhoto) return <VehicleImage vehicle={{ ...vehicle, kind: draft.kind }} tone={tone} />;
  return <VehicleArt kind={draft.kind} tone={tone} />;
}
