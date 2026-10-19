import { useEffect, useState } from 'react';
import { api } from '../api';
import { groupBy, rub, sum, todayKey } from '../lib/format';
import { ExpenseDays, recordsLabel } from './Expenses';
import { TripDays, tripsLabel } from './Trips';
import type { Analytics as Data, Trip, Vehicle } from './types';
import { Empty, ErrorNote, errorText, Field, haptic, Row, Sheet } from './ui';

type Detail = { kind: 'revenue' | 'expenses'; group?: string } | { kind: 'vehicle'; id: number };

const periods = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'all', label: 'Всё время' },
  { value: 'custom', label: 'Свои даты' },
];

export function Analytics({ vehicles, readOnly = false }: { vehicles: Vehicle[]; readOnly?: boolean }) {
  const [period, setPeriod] = useState('month');
  const [vehicleId, setVehicleId] = useState('all');
  const [from, setFrom] = useState(todayKey());
  const [to, setTo] = useState(todayKey());
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);

  const load = async () => {
    const range = period === 'custom' ? `period=custom&from=${from}&to=${to}` : `period=${period}`;
    try {
      setData(await api<Data>(`/equipment/analytics?${range}&vehicleId=${vehicleId}`));
      setError('');
    } catch (x) {
      setError(errorText(x));
    }
  };
  useEffect(() => {
    load();
  }, [period, vehicleId, from, to]);

  const toggle = readOnly
    ? undefined
    : async (t: Trip) => {
        try {
          await api(`/equipment/trips/${t.id}/paid`, { method: 'PATCH', body: JSON.stringify({ paid: !t.paid }) });
          haptic();
          await load();
        } catch (x) {
          setError(errorText(x));
        }
      };
  const max = Math.max(1, ...(data?.byVehicle.map((x) => Math.max(x.revenue, x.expenses)) || [1]));

  return (
    <>
      <label className="field">
        <span>Техника</span>
        <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
          <option value="all">Вся техника</option>
          {vehicles.map((x) => (
            <option value={x.id} key={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      <div className="equipment-periods" role="tablist">
        {periods.map(({ value, label }) => (
          <button role="tab" aria-selected={period === value} className={period === value ? 'selected' : ''} onClick={() => setPeriod(value)} key={value}>
            {label}
          </button>
        ))}
      </div>
      {period === 'custom' && (
        <div className="pair custom-period">
          <Field label="С даты" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Field label="По дату" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      )}
      <ErrorNote>{error}</ErrorNote>
      {!data && !error && <p className="loading">Считаем…</p>}
      {data && (
        <>
          <section className="equipment-summary">
            <button onClick={() => setDetail({ kind: 'revenue' })}>
              <span>Выручка</span>
              <strong>{rub(data.revenue)}</strong>
            </button>
            <button onClick={() => setDetail({ kind: 'expenses' })}>
              <span>Расходы</span>
              <strong>{rub(data.expenses)}</strong>
            </button>
            <div>
              <span>Чистая прибыль</span>
              <strong className={data.profit < 0 ? 'negative' : ''}>{rub(data.profit)}</strong>
            </div>
            <div className="unpaid">
              <span>Не отдали</span>
              <strong>{rub(data.unpaid)}</strong>
            </div>
          </section>
          <h2>По технике</h2>
          <div className="equipment-analytics-list">
            {data.byVehicle.map((x) => (
              <article key={x.vehicleId} onClick={() => setDetail({ kind: 'vehicle', id: x.vehicleId })}>
                <header>
                  <div>
                    <strong>{x.name}</strong>
                    <small>
                      {x.trips} ходок · долг {rub(x.unpaid)}
                    </small>
                  </div>
                  <b>{rub(x.profit)}</b>
                </header>
                <div className="equipment-bars">
                  <i style={{ width: `${(x.revenue / max) * 100}%` }} />
                  <i style={{ width: `${(x.expenses / max) * 100}%` }} />
                </div>
                <footer>
                  <span>Доход {rub(x.revenue)}</span>
                  <span>Расход {rub(x.expenses)}</span>
                </footer>
              </article>
            ))}
          </div>
          {!data.byVehicle.length && <Empty>За этот период записей нет.</Empty>}
        </>
      )}
      {detail && data && <DetailSheet data={data} detail={detail} setDetail={setDetail} onToggle={toggle} />}
    </>
  );
}

function DetailSheet({
  data,
  detail,
  setDetail,
  onToggle,
}: {
  data: Data;
  detail: Detail;
  setDetail: (d: Detail | null) => void;
  onToggle?: (t: Trip) => void;
}) {
  const close = () => setDetail(null);

  if (detail.kind === 'vehicle') {
    const vehicle = data.byVehicle.find((x) => x.vehicleId === detail.id);
    const trips = data.tripRows.filter((t) => t.vehicleId === detail.id);
    const expenses = data.expenseRows.filter((x) => x.vehicleId === detail.id);
    return (
      <Sheet title={vehicle?.name ?? 'Машина'} onClose={close}>
        <h4 className="sheet-section">
          Ходки <span>{rub(sum(trips, (t) => t.amount))}</span>
        </h4>
        {trips.length ? <TripDays trips={trips} onToggle={onToggle} /> : <Empty>Ходок нет.</Empty>}
        <h4 className="sheet-section">
          Расходы <span>{rub(sum(expenses, (x) => x.amount))}</span>
        </h4>
        {expenses.length ? <ExpenseDays expenses={expenses} title={(x) => x.category.name} /> : <Empty>Расходов нет.</Empty>}
      </Sheet>
    );
  }

  if (detail.kind === 'revenue') {
    // У ходок нет категорий, поэтому выручка разбита по направлениям («куда ездил»).
    const groups = groupBy(
      data.tripRows,
      (t) => t.destination.trim(),
      (t) => (t.paid ? Number(t.amount) : 0),
    );
    const group = groups.find((g) => g.name === detail.group);
    if (group)
      return (
        <Sheet title={group.name} onClose={close} onBack={() => setDetail({ kind: 'revenue' })}>
          <p className="sheet-summary">
            Получено {rub(group.total)}
            {group.total !== sum(group.rows, (t) => t.amount) && ` · не отдали ${rub(sum(group.rows, (t) => t.amount) - group.total)}`}
          </p>
          <TripDays trips={group.rows} title={(t) => t.vehicle.name} onToggle={onToggle} />
        </Sheet>
      );
    return (
      <Sheet title="Выручка по направлениям" onClose={close}>
        <p className="sheet-summary">
          Получено {rub(data.revenue)} · не отдали {rub(data.unpaid)}
        </p>
        {groups.length ? (
          <div className="ledger">
            {groups.map((g) => {
              const unpaid = sum(g.rows, (t) => t.amount) - g.total;
              return (
                <Row
                  key={g.name}
                  title={g.name}
                  meta={`${tripsLabel(g.rows.length)}${unpaid ? ` · не отдали ${rub(unpaid)}` : ''}`}
                  amount={g.total}
                  onOpen={() => setDetail({ kind: 'revenue', group: g.name })}
                />
              );
            })}
          </div>
        ) : (
          <Empty>Ходок за период нет.</Empty>
        )}
      </Sheet>
    );
  }

  const groups = groupBy(
    data.expenseRows,
    (x) => x.category.name,
    (x) => Number(x.amount),
  );
  const group = groups.find((g) => g.name === detail.group);
  if (group)
    return (
      <Sheet title={group.name} onClose={close} onBack={() => setDetail({ kind: 'expenses' })}>
        <p className="sheet-summary">
          {recordsLabel(group.rows.length)} на {rub(group.total)}
        </p>
        <ExpenseDays expenses={group.rows} title={(x) => x.vehicle.name} />
      </Sheet>
    );
  return (
    <Sheet title="Расходы по категориям" onClose={close}>
      <p className="sheet-summary">Всего {rub(data.expenses)}</p>
      {groups.length ? (
        <div className="ledger">
          {groups.map((g) => (
            <Row
              key={g.name}
              title={g.name}
              meta={`${recordsLabel(g.rows.length)} · ${data.expenses ? Math.round((g.total / data.expenses) * 100) : 0}%`}
              amount={g.total}
              onOpen={() => setDetail({ kind: 'expenses', group: g.name })}
            />
          ))}
        </div>
      ) : (
        <Empty>Расходов за период нет.</Empty>
      )}
    </Sheet>
  );
}
