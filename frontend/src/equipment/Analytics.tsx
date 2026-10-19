import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { groupBy, rub, sum, todayKey } from '../lib/format';
import { ExpenseDays, recordsLabel } from './Expenses';
import { TripDays, tripsLabel } from './Trips';
import type { Analytics as Data, Trip, Vehicle } from './types';
import { CashflowChart, CategoryChart } from './Charts';
import { PageTitle, Empty, ErrorNote, errorText, Field, haptic, Row, Sheet } from './ui';

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
  const request = useRef(0);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);

  const load = async (keepDetail = false) => {
    const ticket = ++request.current;
    setLoading(true);
    if (!keepDetail) setData(null);
    setError('');
    const range = period === 'custom' ? `period=custom&from=${from}&to=${to}` : `period=${period}`;
    try {
      const result = await api<Data>(`/equipment/analytics?${range}&vehicleId=${vehicleId}`);
      if (ticket !== request.current) return;
      setData(result);
      setError('');
    } catch (x) {
      if (ticket === request.current) setError(errorText(x));
    } finally {
      if (ticket === request.current) setLoading(false);
    }
  };
  useEffect(() => {
    load();
    return () => {
      request.current++;
    };
  }, [period, vehicleId, from, to]);

  const toggle = readOnly
    ? undefined
    : async (t: Trip) => {
        try {
          await api(`/equipment/trips/${t.id}/paid`, { method: 'PATCH', body: JSON.stringify({ paid: !t.paid }) });
          haptic();
          await load(true);
        } catch (x) {
          setError(errorText(x));
        }
      };
  const max = Math.max(1, ...(data?.byVehicle.map((x) => Math.max(x.revenue, x.expenses)) || [1]));

  return (
    <>
      <PageTitle number="04 / Финансы" title="Аналитика" description="Оплаченные ходки, расходы и результат" />
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
      <div className="equipment-periods" role="group" aria-label="Период">
        {periods.map(({ value, label }) => (
          <button aria-pressed={period === value} className={period === value ? 'selected' : ''} onClick={() => setPeriod(value)} key={value}>
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
      {loading && (
        <p className="loading" role="status">
          Считаем результат…
        </p>
      )}
      {error && (
        <button className="secondary" onClick={() => load()}>
          Повторить загрузку
        </button>
      )}
      {data && (
        <>
          <CashflowChart data={data} />
          <section className="equipment-summary" aria-label="Финансовые итоги">
            <button onClick={() => setDetail({ kind: 'revenue' })}>
              <span>Выручка ↗</span>
              <strong>{rub(data.revenue)}</strong>
            </button>
            <button onClick={() => setDetail({ kind: 'expenses' })}>
              <span>Расходы ↗</span>
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
          <div className="block-head analytics-heading">
            <h2>По технике</h2>
            <span className="block-total">Прибыль, ₽</span>
          </div>
          <div className="chart-legend">
            <span>Выручка</span>
            <span>Расходы</span>
          </div>
          <div className="equipment-analytics-list">
            {data.byVehicle.map((x) => (
              <button type="button" className="vehicle-result" key={x.vehicleId} onClick={() => setDetail({ kind: 'vehicle', id: x.vehicleId })}>
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
                  <i aria-hidden="true" style={{ width: `${(x.revenue / max) * 100}%` }} />
                  <i style={{ width: `${(x.expenses / max) * 100}%` }} />
                </div>
                <footer>
                  <span>Доход {rub(x.revenue)}</span>
                  <span>Расход {rub(x.expenses)}</span>
                </footer>
              </button>
            ))}
          </div>
          {!data.tripRows.length && !data.expenseRows.length && <Empty>За этот период записей нет. Попробуйте выбрать другой период.</Empty>}
          <CategoryChart data={data} onSelect={(group) => setDetail({ kind: 'expenses', group })} />
        </>
      )}
      {detail && data && <DetailSheet data={data} detail={detail} setDetail={setDetail} onToggle={toggle} error={error} />}
    </>
  );
}

function DetailSheet({
  data,
  detail,
  setDetail,
  onToggle,
  error,
}: {
  data: Data;
  detail: Detail;
  setDetail: (d: Detail | null) => void;
  onToggle?: (t: Trip) => void;
  error: string;
}) {
  const close = () => setDetail(null);

  if (detail.kind === 'vehicle') {
    const vehicle = data.byVehicle.find((x) => x.vehicleId === detail.id);
    const trips = data.tripRows.filter((t) => t.vehicleId === detail.id);
    const expenses = data.expenseRows.filter((x) => x.vehicleId === detail.id);
    return (
      <Sheet title={vehicle?.name ?? 'Машина'} onClose={close}>
        <ErrorNote>{error}</ErrorNote>
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
          <ErrorNote>{error}</ErrorNote>
          <p className="sheet-summary">
            Получено {rub(group.total)}
            {group.total !== sum(group.rows, (t) => t.amount) && ` · не отдали ${rub(sum(group.rows, (t) => t.amount) - group.total)}`}
          </p>
          <TripDays trips={group.rows} title={(t) => t.vehicle.name} onToggle={onToggle} />
        </Sheet>
      );
    return (
      <Sheet title="Выручка по направлениям" onClose={close}>
        <ErrorNote>{error}</ErrorNote>
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
