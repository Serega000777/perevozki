import { useState } from 'react';
import { api } from '../api';
import { groupByDay, groupByVehicle, num, plural, rub, sum } from '../lib/format';
import { newTrip, rememberVehicle, TripForm, tripDraft, tripPayload, type TripDraft } from './forms';
import type { Trip, Vehicle } from './types';
import { Choice, DayGroup, DeleteButton, Empty, ErrorNote, errorText, haptic, MoreButton, PAGE, PaidStatus, Row, Sheet } from './ui';

type Filter = number | 'all';

export const tripsLabel = (n: number) => `${n} ${plural(n, ['ходка', 'ходки', 'ходок'])}`;
const tripMeta = (t: Trip) => [t.mileage != null ? `${num(t.mileage)} км` : '', t.comment].filter(Boolean).join(' · ');

// Ходки по дням; используется и во вкладке, и в аналитике.
export function TripDays({
  trips,
  title = (t) => t.destination,
  onOpen,
  onToggle,
}: {
  trips: Trip[];
  title?: (t: Trip) => string;
  onOpen?: (t: Trip) => void;
  onToggle?: (t: Trip) => void;
}) {
  return (
    <div className="ledger">
      {groupByDay(trips).map(({ day, rows }) => (
        <DayGroup day={day} total={rows.length > 1 ? sum(rows, (t) => t.amount) : undefined} key={day}>
          {rows.map((t) => (
            <Row
              key={t.id}
              title={title(t)}
              meta={tripMeta(t)}
              amount={t.amount}
              onOpen={onOpen && (() => onOpen(t))}
              side={<PaidStatus paid={t.paid} onToggle={onToggle && (() => onToggle(t))} />}
            />
          ))}
        </DayGroup>
      ))}
    </div>
  );
}

export function Trips({ vehicles, trips, reload }: { vehicles: Vehicle[]; trips: Trip[]; reload: () => Promise<void> }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [limit, setLimit] = useState(PAGE);
  const [editing, setEditing] = useState<Trip | null>(null);
  const [error, setError] = useState('');

  const filtered = filter === 'all' ? trips : trips.filter((t) => t.vehicleId === filter);
  const shown = [...filtered].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, limit);
  const groups = filter === 'all' ? groupByVehicle(shown, vehicles) : [{ vehicle: null, rows: shown }];

  const create = async (d: TripDraft) => {
    await api('/equipment/trips', { method: 'POST', body: JSON.stringify(tripPayload(d)) });
    rememberVehicle(d.vehicleId!);
    haptic();
    await reload();
  };
  const save = async (d: TripDraft) => {
    await api(`/equipment/trips/${editing!.id}`, { method: 'PATCH', body: JSON.stringify(tripPayload(d)) });
    haptic();
    setEditing(null);
    await reload();
  };
  const remove = async () => {
    try {
      await api(`/equipment/trips/${editing!.id}`, { method: 'DELETE' });
      setEditing(null);
      await reload();
    } catch (x) {
      setError(errorText(x));
    }
  };
  const toggle = async (t: Trip) => {
    try {
      await api(`/equipment/trips/${t.id}/paid`, { method: 'PATCH', body: JSON.stringify({ paid: !t.paid }) });
      haptic();
      await reload();
    } catch (x) {
      setError(errorText(x));
    }
  };

  return (
    <>
      <section className="block">
        <h2>Новая ходка</h2>
        {vehicles.length ? (
          <TripForm vehicles={vehicles} initial={newTrip(vehicles)} submitLabel="Добавить ходку" onSubmit={create} keepVehicleAndDate />
        ) : (
          <Empty>Сначала добавьте машину во вкладке «Авто».</Empty>
        )}
      </section>

      <section className="block">
        <div className="block-head">
          <h2>История ходок</h2>
          <span className="block-total">
            {tripsLabel(filtered.length)} · {rub(sum(filtered, (t) => t.amount))}
          </span>
        </div>
        {vehicles.length > 1 && (
          <Choice
            options={[{ value: 'all' as Filter, label: 'Все машины' }, ...vehicles.map((v) => ({ value: v.id as Filter, label: v.name }))]}
            value={filter}
            onChange={(v) => {
              setFilter(v);
              setLimit(PAGE);
            }}
          />
        )}
        {!editing && <ErrorNote>{error}</ErrorNote>}
        {!filtered.length && <Empty>Ходок пока нет.</Empty>}
        {groups.map(({ vehicle, rows }) => {
          const all = vehicle ? filtered.filter((t) => t.vehicleId === vehicle.id) : filtered;
          return (
            <div className="vehicle-group" key={vehicle?.id ?? 'one'}>
              {vehicle && (
                <h3 className="vehicle-head">
                  <span>{vehicle.name}</span>
                  <span>
                    {tripsLabel(all.length)} · {rub(sum(all, (t) => t.amount))}
                  </span>
                </h3>
              )}
              <TripDays trips={rows} onOpen={setEditing} onToggle={toggle} />
            </div>
          );
        })}
        <MoreButton shown={shown.length} total={filtered.length} onMore={() => setLimit((n) => n + PAGE)} />
      </section>

      {editing && (
        <Sheet
          title="Ходка"
          onClose={() => {
            setEditing(null);
            setError('');
          }}
        >
          <TripForm vehicles={vehicles} initial={tripDraft(editing)} submitLabel="Сохранить" onSubmit={save} />
          <DeleteButton label="Удалить ходку" onConfirm={remove} />
          <ErrorNote>{error}</ErrorNote>
        </Sheet>
      )}
    </>
  );
}
