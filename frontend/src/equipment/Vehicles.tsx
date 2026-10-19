import { useState } from 'react';
import { ChevronRight, Coins, Route, Truck } from 'lucide-react';
import { api } from '../api';
import { TruckArt } from '../brand';
import { plural, rub, sum } from '../lib/format';
import { VehicleForm, type VehicleDraft } from './forms';
import { recordsLabel } from './Expenses';
import { tripsLabel } from './Trips';
import type { Expense, Trip, Vehicle } from './types';
import { Card, DeleteButton, Empty, ErrorNote, errorText, haptic, IconTile, SectionHead, Sheet, Stats } from './ui';

const vehiclesLabel = (n: number) => plural(n, ['машина', 'машины', 'машин']);

export function Vehicles({ vehicles, trips, expenses, reload }: { vehicles: Vehicle[]; trips: Trip[]; expenses: Expense[]; reload: () => Promise<void> }) {
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [error, setError] = useState('');
  const usage = (v: Vehicle) => ({ trips: trips.filter((t) => t.vehicleId === v.id).length, expenses: expenses.filter((x) => x.vehicleId === v.id).length });

  const create = async (d: VehicleDraft) => {
    await api('/equipment/vehicles', { method: 'POST', body: JSON.stringify(d) });
    haptic();
    await reload();
  };
  const save = async (d: VehicleDraft) => {
    await api(`/equipment/vehicles/${editing!.id}`, { method: 'PATCH', body: JSON.stringify(d) });
    haptic();
    setEditing(null);
    await reload();
  };
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
        <VehicleForm initial={{ name: '', note: '' }} submitLabel="Добавить машину" onSubmit={create} resetAfter />
      </Card>

      <SectionHead title="Мои машины" aside={`${vehicles.length} ${vehiclesLabel(vehicles.length)}`} />
      {!vehicles.length && <Empty>Машин пока нет.</Empty>}
      <div className="vehicle-list">
        {vehicles.map((v, i) => {
          const used = usage(v);
          return (
            <button type="button" className="vehicle-card" key={v.id} onClick={() => setEditing(v)}>
              <span className="vehicle-photo">
                <TruckArt index={i} />
              </span>
              <span className="vehicle-info">
                <strong>{v.name}</strong>
                <small>{v.note || 'без описания'}</small>
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
          <VehicleForm initial={{ name: editing.name, note: editing.note ?? '' }} submitLabel="Сохранить" onSubmit={save} />
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
