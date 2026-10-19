import { cashflowBuckets } from '../lib/chart';
import { groupBy, num, rub, shortDate } from '../lib/format';
import type { Analytics } from './types';

const compact = new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 });

export function CashflowChart({ data }: { data: Analytics }) {
  const buckets = cashflowBuckets(data.tripRows, data.expenseRows);
  if (!buckets.length) return null;
  const maximum = Math.max(1, ...buckets.flatMap((b) => [b.revenue, b.expenses]));
  const scale = 130 / maximum;
  const width = 290 / buckets.length;
  const bar = Math.min(18, width * 0.29);
  const paidTrips = data.tripRows.filter((t) => t.paid).length;
  const periodLabel = `${buckets[0].from} — ${buckets.at(-1)!.to}`;
  return (
    <section className="cashflow" aria-label="Движение денег">
      <div className="block-head">
        <h2>Движение денег</h2>
        <span className="block-total">₽</span>
      </div>
      <div className="chart-legend">
        <span>Выручка</span>
        <span>Расходы</span>
      </div>
      <svg viewBox="0 0 350 190" role="img" aria-label={`Выручка и расходы, ${periodLabel}. Точные суммы — в таблице под диаграммой.`}>
        {[0, 0.5, 1].map((part) => (
          <g key={part}>
            <line x1="48" x2="345" y1={150 - part * 130} y2={150 - part * 130} className="chart-grid" />
            <text x="40" y={154 - part * 130} textAnchor="end" className="chart-label">
              {compact.format(maximum * part)}
            </text>
          </g>
        ))}
        {buckets.map((b, i) => {
          const x = 50 + width * (i + 0.5);
          return (
            <g key={b.from}>
              <title>
                {b.from} — {b.to}: выручка {rub(b.revenue)}, расходы {rub(b.expenses)}
              </title>
              <rect x={x - bar - 1.5} y={150 - b.revenue * scale} width={bar} height={b.revenue * scale} className="chart-income" />
              <rect x={x + 1.5} y={150 - b.expenses * scale} width={bar} height={b.expenses * scale} className="chart-expense" />
              <text x={x} y="173" textAnchor="middle" className="chart-label">
                {shortDate(b.from)}
              </text>
            </g>
          );
        })}
      </svg>
      <details className="chart-data">
        <summary>Суммы по интервалам</summary>
        <div className="table-scroll">
          <table>
            <caption>{periodLabel} · по датам ходок и расходов</caption>
            <thead>
              <tr>
                <th>Период</th>
                <th>Выручка</th>
                <th>Расходы</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <tr key={b.from}>
                  <th>{b.from === b.to ? b.from : `${b.from} — ${b.to}`}</th>
                  <td>{rub(b.revenue)}</td>
                  <td>{rub(b.expenses)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <div className="chart-metrics">
        <div>
          <span>Средняя оплаченная ходка</span>
          <strong>{paidTrips ? rub(data.revenue / paidTrips) : '—'}</strong>
        </div>
        <div>
          <span>Расход на ходку</span>
          <strong>{data.trips ? rub(data.expenses / data.trips) : '—'}</strong>
        </div>
        <div>
          <span>Маржа</span>
          <strong>{data.revenue ? `${num((data.profit / data.revenue) * 100)}%` : '—'}</strong>
        </div>
      </div>
    </section>
  );
}

export function CategoryChart({ data, onSelect }: { data: Analytics; onSelect: (name: string) => void }) {
  const groups = groupBy(
    data.expenseRows,
    (e) => e.category.name,
    (e) => Number(e.amount),
  );
  if (!groups.length) return null;
  return (
    <section className="block">
      <div className="block-head">
        <h2>Структура расходов</h2>
        <span className="block-total">₽ / %</span>
      </div>
      <div className="category-chart">
        {groups.map((g) => {
          const share = data.expenses ? (g.total / data.expenses) * 100 : 0;
          return (
            <button type="button" className="category-result" key={g.name} onClick={() => onSelect(g.name)}>
              <span>
                <span>
                  {g.name} <small>· {num(share)}%</small>
                </span>
                <strong>{rub(g.total)}</strong>
              </span>
              <span className="category-track" aria-hidden="true">
                <i style={{ width: `${share}%` }} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
