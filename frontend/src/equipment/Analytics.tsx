import { useEffect, useState } from 'react';
import { CalendarDays, ChartNoAxesColumn, ChartPie, ChevronDown, Coins, Percent, TrendingUp, Trophy, Truck, Wallet } from 'lucide-react';
import { api } from '../api';
import { groupBy, rangeTitle, rub, sum, todayKey } from '../lib/format';
import { bestMonth, monthTitle, periodDays, revenueSeries } from '../lib/series';
import { RangeCalendar } from './calendar';
import { Donut, DONUT_COLORS, LineChart } from './charts';
import { ExpenseDays, recordsLabel } from './Expenses';
import { TripDays, tripsLabel } from './Trips';
import type { Analytics as Data, Trip, Vehicle } from './types';
import { Card, Empty, ErrorNote, errorText, haptic, IconTile, Row, Sheet, Stats } from './ui';

type Detail = { kind: 'revenue' | 'expenses'; group?: string } | { kind: 'vehicle'; id: number };

const periods = [
  { value: 'day', label: 'День', title: 'Обзор за день' },
  { value: 'week', label: 'Неделя', title: 'Обзор за неделю' },
  { value: 'month', label: 'Месяц', title: 'Обзор за месяц' },
  { value: 'all', label: 'Всё время', title: 'Обзор за всё время' },
  { value: 'custom', label: 'Свои даты', title: 'Обзор за период' },
];

export function Analytics({ vehicles, readOnly = false, version = 0 }: { vehicles: Vehicle[]; readOnly?: boolean; version?: number }) {
  const [period, setPeriod] = useState('month');
  const [vehicleId, setVehicleId] = useState('all');
  const [from, setFrom] = useState(todayKey());
  const [to, setTo] = useState(todayKey());
  const [data, setData] = useState<Data | null>(null);
  const [allTime, setAllTime] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [picking, setPicking] = useState(false);

  const load = async () => {
    const range = period === 'custom' ? `period=custom&from=${from}&to=${to}` : `period=${period}`;
    try {
      const [current, total] = await Promise.all([
        api<Data>(`/equipment/analytics?${range}&vehicleId=${vehicleId}`),
        api<Data>(`/equipment/analytics?period=all&vehicleId=${vehicleId}`),
      ]);
      setData(current);
      setAllTime(total);
      setError('');
    } catch (x) {
      setError(errorText(x));
    }
  };
  useEffect(() => {
    load();
  }, [period, vehicleId, from, to, version]);

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

  const range = data?.from ? periodDays(data.from, data.to) : null;
  const title = period === 'week' && range && range[1] < todayKey() ? 'Обзор за прошлую неделю' : periods.find((p) => p.value === period)!.title;

  return (
    <>
      {/* За всё время: прибыль — с неоплаченными рейсами, баланс — только полученные деньги. */}
      {allTime && (
        <Stats
          items={[
            { icon: <ChartNoAxesColumn />, value: rub(allTime.revenue), sub: 'выручка' },
            { icon: <TrendingUp />, value: rub(allTime.profit), sub: 'прибыль' },
            { icon: <Wallet />, value: rub(allTime.balance), sub: 'баланс' },
          ]}
        />
      )}

      <Card
        icon={
          <IconTile>
            <ChartNoAxesColumn />
          </IconTile>
        }
        title={title}
      >
        <div className="overview-controls">
          <label className="select">
            <select aria-label="Техника" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              <option value="all">Вся техника</option>
              {vehicles.map((x) => (
                <option value={x.id} key={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden />
          </label>
          <div className="period-pills" role="tablist">
            {periods.map(({ value, label }) => (
              <button
                role="tab"
                aria-selected={period === value}
                aria-label={label}
                title={label}
                className={['chip', value === 'custom' && 'icon', period === value && 'on'].filter(Boolean).join(' ')}
                onClick={() => (value === 'custom' ? setPicking(true) : setPeriod(value))}
                key={value}
              >
                {/* «Свои даты» — значком календаря, чтобы периоды помещались в один ряд */}
                {value === 'custom' ? <CalendarDays aria-hidden /> : label}
              </button>
            ))}
          </div>
        </div>
        {range && <p className="period-range">{rangeTitle(...range)}</p>}
        <ErrorNote>{error}</ErrorNote>
        {!data ? !error && <p className="loading">Считаем…</p> : <Overview data={data} period={period} />}
      </Card>

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

          <ByVehicle data={data} onOpen={(id) => setDetail({ kind: 'vehicle', id })} />

          <div className="split">
            <ExpenseCategories data={data} onOpen={(group) => setDetail({ kind: 'expenses', group })} />
            <ExpenseVehicles data={data} onOpen={(id) => setDetail({ kind: 'vehicle', id })} />
          </div>

          <Results data={data} allTime={allTime} />
        </>
      )}
      {detail && data && <DetailSheet data={data} detail={detail} setDetail={setDetail} onToggle={toggle} />}
      {picking && (
        <RangeCalendar
          from={period === 'custom' ? from : undefined}
          to={period === 'custom' ? to : undefined}
          onClose={() => setPicking(false)}
          onApply={(start, end) => {
            setFrom(start);
            setTo(end);
            setPeriod('custom');
            setPicking(false);
          }}
        />
      )}
    </>
  );
}

function Overview({ data, period }: { data: Data; period: string }) {
  const points = revenueSeries(data.tripRows, period, data.from, data.to);
  const days = data.from ? periodDays(data.from, data.to) : null;
  const margin = data.revenue > 0 ? Math.round((data.profit / data.revenue) * 100) : null;
  return (
    <>
      {points.length > 1 && data.trips ? (
        <>
          <p className="chart-caption">Выручка, ₽</p>
          <LineChart points={points} />
        </>
      ) : (
        <p className="chart-empty">
          {days && days[0] === days[1]
            ? 'За один день график не строится — итоги дня ниже.'
            : data.trips
              ? 'Мало данных для графика.'
              : 'Рейсов за этот период нет.'}
        </p>
      )}
      <div className="metrics">
        <Metric icon={<ChartNoAxesColumn />} label="Средний рейс" value={data.trips ? rub(Math.round(data.revenue / data.trips)) : '—'} />
        <Metric icon={<Coins />} label="Расход на рейс" value={data.trips ? rub(Math.round(data.expenses / data.trips)) : '—'} />
        <Metric icon={<Percent />} label="Маржа" value={margin == null ? '—' : `${margin}%`} />
      </div>
    </>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="metric">
      <IconTile>{icon}</IconTile>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  );
}

function ByVehicle({ data, onOpen }: { data: Data; onOpen: (id: number) => void }) {
  const max = Math.max(1, ...data.byVehicle.map((x) => Math.max(x.revenue, x.expenses)));
  return (
    <Card
      icon={
        <IconTile>
          <Truck />
        </IconTile>
      }
      title="По технике"
    >
      {!data.byVehicle.length && <Empty>За этот период записей нет.</Empty>}
      <div className="tech-list">
        {data.byVehicle.map((x) => (
          <button type="button" className="tech-row" key={x.vehicleId} onClick={() => onOpen(x.vehicleId)}>
            <span className="tech-head">
              <span>
                <strong>{x.name}</strong>
                <small>
                  {tripsLabel(x.trips)} • долг {rub(x.unpaid)}
                </small>
              </span>
              <b className={x.profit < 0 ? 'neg' : 'pos'}>
                {x.profit > 0 ? '+' : ''}
                {rub(x.profit)}
              </b>
            </span>
            <span className="bars">
              <i>
                <em className="income" style={{ width: `${(x.revenue / max) * 100}%` }} />
              </i>
              <i>
                <em className="cost" style={{ width: `${(x.expenses / max) * 100}%` }} />
              </i>
            </span>
            <span className="tech-foot">
              <span>Доход {rub(x.revenue)}</span>
              <span>Расход {rub(x.expenses)}</span>
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function ExpenseCategories({ data, onOpen }: { data: Data; onOpen: (group: string) => void }) {
  const groups = groupBy(
    data.expenseRows,
    (x) => x.category.name,
    (x) => Number(x.amount),
  );
  // Не больше пяти сегментов: мелкие категории уходят в «Остальное», чтобы кольцо читалось.
  const shown = groups.length > 5 ? [...groups.slice(0, 4), { name: 'Остальное', rows: [], total: sum(groups.slice(4), (g) => g.total) }] : groups;
  const share = (v: number) => (data.expenses ? Math.round((v / data.expenses) * 100) : 0);
  return (
    <Card
      icon={
        <IconTile>
          <ChartPie />
        </IconTile>
      }
      title="Расходы по категориям"
    >
      {!groups.length ? (
        <Empty>Расходов за период нет.</Empty>
      ) : (
        <div className="donut-box">
          <Donut parts={shown.map((g, i) => ({ value: g.total, color: DONUT_COLORS[i] }))} center={rub(data.expenses)} caption="всего" />
          <ul className="legend">
            {shown.map((g, i) => (
              <li key={g.name}>
                <button type="button" disabled={!g.rows.length} onClick={() => onOpen(g.name)}>
                  <i style={{ background: DONUT_COLORS[i] }} />
                  <span>{g.name}</span>
                  <b>{rub(g.total)}</b>
                  <small>{share(g.total)}%</small>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function ExpenseVehicles({ data, onOpen }: { data: Data; onOpen: (id: number) => void }) {
  const groups = groupBy(
    data.expenseRows,
    (x) => String(x.vehicleId),
    (x) => Number(x.amount),
  );
  return (
    <Card
      icon={
        <IconTile>
          <Truck />
        </IconTile>
      }
      title="По машинам"
    >
      {!groups.length && <Empty>Расходов за период нет.</Empty>}
      <div className="share-list">
        {groups.map((g) => {
          const pct = data.expenses ? Math.round((g.total / data.expenses) * 100) : 0;
          return (
            <button type="button" className="share-row" key={g.name} onClick={() => onOpen(Number(g.name))}>
              <span className="share-head">
                <span>{g.rows[0].vehicle.name}</span>
                <b>{rub(g.total)}</b>
              </span>
              <span className="share-bar">
                <i>
                  <em style={{ width: `${pct}%` }} />
                </i>
                <small>{pct}%</small>
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function Results({ data, allTime }: { data: Data; allTime: Data | null }) {
  const leader = data.byVehicle.reduce<Data['byVehicle'][number] | null>((best, x) => (!best || x.profit > best.profit ? x : best), null);
  const best = allTime ? bestMonth(allTime.tripRows) : null;
  return (
    <Card
      icon={
        <IconTile>
          <Trophy />
        </IconTile>
      }
      title="Итоги"
    >
      <div className="results">
        <div className="result">
          <IconTile>
            <ChartNoAxesColumn />
          </IconTile>
          <span>
            <small>Самая прибыльная</small>
            <strong>{leader ? leader.name : '—'}</strong>
          </span>
        </div>
        <div className="result">
          <IconTile>
            <CalendarDays />
          </IconTile>
          <span>
            <small>Лучший месяц</small>
            <strong>{best ? `${monthTitle(best.key)}${best.key.slice(0, 4) === todayKey().slice(0, 4) ? '' : ` ${best.key.slice(0, 4)}`}` : '—'}</strong>
            {best && (
              <em>
                {tripsLabel(best.trips)} • {best.paid} оплачено • {best.unpaid} в ожидании
              </em>
            )}
          </span>
        </div>
      </div>
    </Card>
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
      <Sheet title={vehicle?.name ?? trips[0]?.vehicle.name ?? expenses[0]?.vehicle.name ?? 'Машина'} onClose={close}>
        <h4 className="sheet-section">
          Рейсы <span>{rub(sum(trips, (t) => t.amount))}</span>
        </h4>
        {trips.length ? <TripDays trips={trips} onToggle={onToggle} /> : <Empty>Рейсов нет.</Empty>}
        <h4 className="sheet-section">
          Расходы <span>{rub(sum(expenses, (x) => x.amount))}</span>
        </h4>
        {expenses.length ? (
          <div className="ledger">
            <ExpenseDays expenses={expenses} />
          </div>
        ) : (
          <Empty>Расходов нет.</Empty>
        )}
      </Sheet>
    );
  }

  if (detail.kind === 'revenue') {
    // У рейсов нет категорий, поэтому выручка разбита по направлениям («куда ездил»).
    const groups = groupBy(
      data.tripRows,
      (t) => t.destination.trim(),
      (t) => Number(t.amount),
    );
    const unpaidOf = (trips: Trip[]) => sum(trips, (t) => (t.paid ? 0 : t.amount));
    const group = groups.find((g) => g.name === detail.group);
    if (group)
      return (
        <Sheet title={group.name} onClose={close} onBack={() => setDetail({ kind: 'revenue' })}>
          <p className="sheet-summary">
            Всего {rub(group.total)}
            {unpaidOf(group.rows) > 0 && ` · не отдали ${rub(unpaidOf(group.rows))}`}
          </p>
          <TripDays trips={group.rows} title={(t) => t.vehicle.name} onToggle={onToggle} />
        </Sheet>
      );
    return (
      <Sheet title="Выручка по направлениям" onClose={close}>
        <p className="sheet-summary">
          Всего {rub(data.revenue)} · получено {rub(data.revenue - data.unpaid)} · не отдали {rub(data.unpaid)}
        </p>
        {groups.length ? (
          <div className="ledger">
            {groups.map((g) => {
              const unpaid = unpaidOf(g.rows);
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
          <Empty>Рейсов за период нет.</Empty>
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
        <div className="ledger">
          <ExpenseDays expenses={group.rows} title={(x) => x.vehicle.name} />
        </div>
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
