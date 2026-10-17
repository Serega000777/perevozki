import { useState } from 'react';
import { api } from '../api';
import { VehicleForm, type VehicleDraft } from './forms';
import { recordsLabel } from './Expenses';
import { tripsLabel } from './Trips';
import type { Expense, Trip, Vehicle } from './types';
import { DeleteButton, Empty, ErrorNote, errorText, haptic, Row, Sheet } from './ui';

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
      <section className="block">
        <h2>Новая машина</h2>
        <VehicleForm initial={{ name: '', note: '' }} submitLabel="Добавить машину" onSubmit={create} resetAfter />
      </section>
      <section className="block">
        <h2>Мои машины</h2>
        {!vehicles.length && <Empty>Машин пока нет.</Empty>}
        {!!vehicles.length && (
          <div className="ledger">
            {vehicles.map((v) => {
              const used = usage(v);
              return (
                <Row
                  key={v.id}
                  title={v.name}
                  meta={v.note || 'без описания'}
                  side={<span className="row-note">{tripsLabel(used.trips)}</span>}
                  onOpen={() => setEditing(v)}
                />
              );
            })}
          </div>
        )}
      </section>
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
