import { useState } from 'react';
import { ChevronRight, Coins, Route, Truck } from 'lucide-react';
import { api } from '../api';
import { plural, rub, sum } from '../lib/format';
import { VehicleImage } from './art';
import { kindLabel } from './catalog';
import { VehicleForm, vehicleDraft, type VehicleDraft } from './forms';
import { recordsLabel } from './Expenses';
import { tripsLabel } from './Trips';
import type { Expense, Trip, Vehicle } from './types';
import { Card, DeleteButton, Empty, ErrorNote, errorText, haptic, IconTile, SectionHead, Sheet, Stats } from './ui';

const vehiclesLabel = (n: number) => plural(n, ['машина', 'машины', 'машин']);

export function Vehicles({ vehicles, trips, expenses, reload }: { vehicles: Vehicle[]; trips: Trip[]; expenses: Expense[]; reload: () => Promise<void> }) {
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [error, setError] = useState('');
  const usage = (v: Vehicle) => ({ trips: trips.filter((t) => t.vehicleId === v.id).length, expenses: expenses.filter((x) => x.vehicleId === v.id).length });

  // Фото уходит отдельным запросом после сохранения карточки: у новой машины до этого нет id.
  const savePhoto = async (id: number, { photo, removePhoto }: VehicleDraft) => {
    if (photo) await api(`/equipment/vehicles/${id}/photo`, { method: 'PUT', body: photo, headers: { 'Content-Type': photo.type } });
    else if (removePhoto) await api(`/equipment/vehicles/${id}/photo`, { method: 'DELETE' });
  };
  const create = async ({ photo, removePhoto, ...card }: VehicleDraft) => {
    const created = await api<Vehicle>('/equipment/vehicles', { method: 'POST', body: JSON.stringify(card) });
    await savePhoto(created.id, { ...card, photo, removePhoto });
    haptic();
    await reload();
  };
  const save = async ({ photo, removePhoto, ...card }: VehicleDraft) => {
    await api(`/equipment/vehicles/${editing!.id}`, { method: 'PATCH', body: JSON.stringify(card) });
    await savePhoto(editing!.id, { ...card, photo, removePhoto });
    haptic();
    setEditing(null);
    await reload();
  };
  const tone = (v: Vehicle) => vehicles.indexOf(v);
  const remove = async () => {
    try {
      await api(`/equipment/vehicles/${editing!.id}`, { method: 'DELETE' });
      setEditing(null);
      await reload();
    } catch (x) {
      setError(errorText(x));
    }
  };
  const close = () => {
    setEditing(null);
    setError('');
  };

  return (
    <>
      <Stats
        items={[
          { icon: <Truck />, value: vehicles.length, unit: vehiclesLabel(vehicles.length), sub: 'в автопарке' },
          { icon: <Route />, value: trips.length, unit: plural(trips.length, ['ходка', 'ходки', 'ходок']), sub: 'всего' },
          { icon: <Coins />, value: rub(sum(expenses, (x) => x.amount)), sub: 'расходы всего' },
        ]}
      />

      <Card
        icon={
          <IconTile plus>
            <Truck />
          </IconTile>
        }
        title="Новая машина"
        aside={<span className="card-hint">Добавьте машину, чтобы учитывать ходки и расходы</span>}
      >
        <VehicleForm initial={vehicleDraft()} tone={vehicles.length} submitLabel="Добавить машину" onSubmit={create} resetAfter />
      </Card>

      <SectionHead title="Мои машины" aside={`${vehicles.length} ${vehiclesLabel(vehicles.length)}`} />
      {!vehicles.length && <Empty>Машин пока нет.</Empty>}
      <div className="vehicle-list">
        {vehicles.map((v, i) => {
          const used = usage(v);
          const about = [kindLabel(v.kind), [v.brand, v.model].filter(Boolean).join(' '), v.note].filter(Boolean).join(' · ');
          return (
            <button type="button" className="vehicle-card" key={v.id} onClick={() => setEditing(v)}>
              <span className="vehicle-photo">
                <VehicleImage vehicle={v} tone={i} />
                {v.brand && <b className="brand-mark">{v.brand}</b>}
              </span>
              <span className="vehicle-info">
                <strong>{v.name}</strong>
                <small>{about || 'без описания'}</small>
                <span className="pill active">Активна</span>
              </span>
              <span className="vehicle-count">
                <strong>{used.trips}</strong> {plural(used.trips, ['ходка', 'ходки', 'ходок'])}
              </span>
              <ChevronRight className="chevron" aria-hidden />
            </button>
          );
        })}
      </div>

      {editing && (
        <Sheet title={editing.name} onClose={close}>
          <VehicleForm initial={vehicleDraft(editing)} vehicle={editing} tone={tone(editing)} submitLabel="Сохранить" onSubmit={save} />
          {usage(editing).trips || usage(editing).expenses ? (
            <p className="hint">
              Удалить нельзя: у машины {tripsLabel(usage(editing).trips)} и {recordsLabel(usage(editing).expenses)} расходов.
            </p>
          ) : (
            <DeleteButton label="Удалить машину" onConfirm={remove} />
          )}
          <ErrorNote>{error}</ErrorNote>
        </Sheet>
      )}
    </>
  );
}
