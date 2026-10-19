import { useState } from 'react';
import { api } from '../api';
import { VehicleForm, type VehicleDraft } from './forms';
import { recordsLabel } from './Expenses';
import { tripsLabel } from './Trips';
import type { Expense, Trip, Vehicle } from './types';
import { AddButton, PageTitle, DeleteButton, Empty, ErrorNote, errorText, haptic, Row, Sheet } from './ui';

export function Vehicles({ vehicles, trips, expenses, reload }: { vehicles: Vehicle[]; trips: Trip[]; expenses: Expense[]; reload: () => Promise<void> }) {
  const [creating, setCreating] = useState(false);
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
      <PageTitle number="01 / Автопарк" title="Мои машины" description="Вся техника и её история — в одном месте" />
      <AddButton onClick={() => setCreating(true)}>Добавить машину</AddButton>
      {creating && (
        <Sheet title="Новая машина" onClose={() => setCreating(false)}>
          <VehicleForm
            initial={{ name: '', note: '' }}
            submitLabel="Добавить машину"
            onSubmit={async (d) => {
              await create(d);
              setCreating(false);
            }}
          />
        </Sheet>
      )}
      <section className="block">
        <div className="block-head">
          <h2>Автопарк</h2>
          <span className="block-total">Всего: {vehicles.length}</span>
        </div>
        {!vehicles.length && <Empty>Машин пока нет.</Empty>}
        {!!vehicles.length && (
          <div className="ledger fleet-ledger">
            {vehicles.map((v, index) => {
              const used = usage(v);
              return (
                <Row
                  key={v.id}
                  title={
                    <>
                      <span className="vehicle-number">{String(index + 1).padStart(2, '0')}</span>
                      {v.name}
                    </>
                  }
                  meta={
                    <>
                      {v.note || 'Без описания'}
                      <span className="vehicle-usage">
                        {tripsLabel(used.trips)} · {recordsLabel(used.expenses)} расходов
                      </span>
                    </>
                  }
                  side={
                    <span className="row-note" aria-hidden="true">
                      ↗
                    </span>
                  }
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
