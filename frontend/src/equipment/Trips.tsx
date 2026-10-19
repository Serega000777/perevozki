import { useState } from 'react';
import { ChevronRight, Clock, Coins, Route, Truck } from 'lucide-react';
import { api } from '../api';
import { dayKey, dayTitle, groupByDay, groupByVehicle, lastAddedDay, num, plural, rub, sum } from '../lib/format';
import { newTrip, rememberVehicle, TripForm, tripDraft, tripPayload, type TripDraft } from './forms';
import type { Trip, Vehicle } from './types';
import {
  Card,
  Choice,
  DayGroup,
  DeleteButton,
  Empty,
  ErrorNote,
  errorText,
  haptic,
  IconTile,
  MoreButton,
  PAGE,
  PaidPill,
  Row,
  SectionHead,
  Sheet,
  Stats,
} from './ui';

type Filter = number | 'all';

export const tripsLabel = (n: number) => `${n} ${plural(n, ['ходка', 'ходки', 'ходок'])}`;
const tripMeta = (t: Trip) => [t.mileage != null ? `${num(t.mileage)} км` : '', t.comment].filter(Boolean).join(' · ');

// Ходки по дням в одной подложке — для детализации в аналитике.
export function TripDays({ trips, title = (t) => t.destination, onToggle }: { trips: Trip[]; title?: (t: Trip) => string; onToggle?: (t: Trip) => void }) {
  return (
    <div className="ledger">
      {groupByDay(trips).map(({ day, rows }) => (
        <DayGroup day={day} total={sum(rows, (t) => t.amount)} key={day}>
          {rows.map((t) => (
            <Row
              key={t.id}
              title={title(t)}
              meta={tripMeta(t)}
              amount={t.amount}
              side={<PaidPill paid={t.paid} onToggle={onToggle && (() => onToggle(t))} />}
            />
          ))}
        </DayGroup>
      ))}
    </div>
  );
}

// Карточка ходки: дата над направлением, справа сумма, статус и переход к правке.
function TripCard({ trip, onOpen, onToggle }: { trip: Trip; onOpen: () => void; onToggle: () => void }) {
  const meta = tripMeta(trip);
  return (
    <div className="trip-card" role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()}>
      <div className="trip-main">
        <span className="trip-date">{dayTitle(dayKey(trip.date))}</span>
        <span className="trip-dest">{trip.destination}</span>
        {meta && <span className="trip-meta">{meta}</span>}
      </div>
      <div className="trip-side">
        <span className="money">{rub(trip.amount)}</span>
        <PaidPill paid={trip.paid} onToggle={onToggle} />
      </div>
      <ChevronRight className="chevron" aria-hidden />
    </div>
  );
}

export function Trips({ vehicles, trips, reload }: { vehicles: Vehicle[]; trips: Trip[]; reload: () => Promise<void> }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [limit, setLimit] = useState(PAGE);
  const [editing, setEditing] = useState<Trip | null>(null);
  const [error, setError] = useState('');

  const filtered = filter === 'all' ? trips : trips.filter((t) => t.vehicleId === filter);
  const lastDate = lastAddedDay(trips);
  const shown = [...filtered].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, limit);
  const groups = filter === 'all' ? groupByVehicle(shown, vehicles) : [{ vehicle: null, rows: shown }];
  const paid = trips.filter((t) => t.paid).length;

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
      <Stats
        items={[
          { icon: <Route />, value: trips.length, unit: plural(trips.length, ['ходка', 'ходки', 'ходок']), sub: 'всего' },
          { icon: <Coins />, value: paid, unit: 'оплачено', sub: 'закрытые' },
          { icon: <Clock />, value: trips.length - paid, unit: 'не оплачено', sub: 'в ожидании' },
        ]}
      />

      <Card
        icon={
          <IconTile plus>
            <Truck />
          </IconTile>
        }
        title="Новая ходка"
      >
        {vehicles.length ? (
          <TripForm vehicles={vehicles} initial={newTrip(vehicles)} submitLabel="Добавить ходку" onSubmit={create} keepVehicleAndDate lastDate={lastDate} />
        ) : (
          <Empty>Сначала добавьте машину во вкладке «Авто».</Empty>
        )}
      </Card>

      <SectionHead title="История ходок" aside={`${tripsLabel(filtered.length)} • ${rub(sum(filtered, (t) => t.amount))}`} />
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
          <div className="trip-group" key={vehicle?.id ?? 'one'}>
            {vehicle && (
              <h3 className="group-head">
                <span>{vehicle.name}</span>
                <span>
                  {tripsLabel(all.length)} • {rub(sum(all, (t) => t.amount))}
                </span>
              </h3>
            )}
            <div className="trip-list">
              {rows.map((t) => (
                <TripCard key={t.id} trip={t} onOpen={() => setEditing(t)} onToggle={() => toggle(t)} />
              ))}
            </div>
          </div>
        );
      })}
      <MoreButton shown={shown.length} total={filtered.length} onMore={() => setLimit((n) => n + PAGE)} />

      {editing && (
        <Sheet
          title="Ходка"
          onClose={() => {
            setEditing(null);
            setError('');
          }}
        >
          <TripForm vehicles={vehicles} initial={tripDraft(editing)} submitLabel="Сохранить" onSubmit={save} lastDate={lastDate} />
          <DeleteButton label="Удалить ходку" onConfirm={remove} />
          <ErrorNote>{error}</ErrorNote>
        </Sheet>
      )}
    </>
  );
}
