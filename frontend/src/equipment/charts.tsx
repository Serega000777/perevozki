// Графики аналитики — свой SVG, без библиотек (ADR 0001: без лишних зависимостей).
import { useId } from 'react';
import { num } from '../lib/format';
import type { Point } from '../lib/series';

// Верх шкалы — «круглое» число, чтобы подписи оси читались: 2 000 000, 250 000, 40 000…
function niceMax(value: number) {
  const step = value / 4;
  const power = 10 ** Math.floor(Math.log10(step || 1));
  const nice = [1, 2, 2.5, 5, 10].find((m) => m * power >= step)! * power;
  return nice * 4;
}

// Плавная линия (Catmull-Rom), контрольные точки не выходят за оси — без «провалов» ниже нуля.
function smooth(points: number[][], floor: number, ceil: number) {
  return points
    .map(([x, y], i) => {
      if (i === 0) return `M${x} ${y}`;
      const [x0, y0] = points[i - 2] ?? points[i - 1];
      const [x1, y1] = points[i - 1];
      const [x3, y3] = points[i + 1] ?? [x, y];
      const clamp = (v: number) => Math.min(floor, Math.max(ceil, v));
      return `C${x1 + (x - x0) / 6} ${clamp(y1 + (y - y0) / 6)} ${x - (x3 - x1) / 6} ${clamp(y - (y3 - y1) / 6)} ${x} ${y}`;
    })
    .join(' ');
}

export function LineChart({ points }: { points: Point[] }) {
  const id = useId();
  const W = 340,
    H = 196,
    left = 50,
    right = 16,
    top = 28,
    bottom = 24;
  const max = niceMax(Math.max(1, ...points.map((p) => p.value)));
  const x = (i: number) => left + (points.length === 1 ? (W - left - right) / 2 : (i * (W - left - right)) / (points.length - 1));
  const y = (v: number) => top + (H - top - bottom) * (1 - v / max);
  const xy = points.map((p, i) => [x(i), y(p.value)]);
  const line = smooth(xy, y(0), top);
  const peak = points.reduce((best, p, i) => (p.value > points[best].value ? i : best), 0);
  // Подписи значений: у всех точек, если их немного, иначе — только у максимума и последней.
  const labelled = points.map((p, i) => p.value > 0 && (points.length <= 6 || i === peak || i === points.length - 1));
  const everyLabel = Math.ceil(points.length / 7);
  return (
    <svg className="line-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Выручка по периодам">
      <defs>
        <linearGradient id={`${id}-area`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#d6ff45" stopOpacity="0.55" />
          <stop offset="1" stopColor="#d6ff45" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((i) => {
        const v = (max / 4) * i;
        return (
          <g key={i}>
            <path d={`M${left} ${y(v)} H${W - right}`} stroke="#ecebe2" strokeWidth="1" />
            <text x={left - 6} y={y(v) + 3} textAnchor="end" className="axis">
              {num(v)}
            </text>
          </g>
        );
      })}
      {points.map((p, i) => (
        <g key={i}>
          <path d={`M${x(i)} ${top} V${y(0)}`} stroke="#f1f0e8" strokeWidth="1" />
          {i % everyLabel === 0 && (
            <text x={x(i)} y={H - 6} textAnchor="middle" className="axis">
              {p.label}
            </text>
          )}
        </g>
      ))}
      <path d={`${line} L${x(points.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`} fill={`url(#${id}-area)`} />
      <path d={line} fill="none" stroke="#1b1d17" strokeWidth="2" strokeLinecap="round" />
      {xy.map(([px, py], i) => (
        <g key={i}>
          <circle cx={px} cy={py} r="3.6" fill="#1b1d17" />
          {labelled[i] && (
            <g>
              <rect
                x={px - num(points[i].value).length * 2.9 - 6}
                y={py - 22}
                width={num(points[i].value).length * 5.8 + 12}
                height="15"
                rx="7.5"
                fill="#f3f1e4"
              />
              <text x={px} y={py - 11.5} textAnchor="middle" className="point">
                {num(points[i].value)}
              </text>
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}

export const DONUT_COLORS = ['#1b1d17', '#cdee3c', '#a9ab9f', '#dcdcd2', '#7c8072'];

export function Donut({ parts, center, caption }: { parts: { value: number; color: string }[]; center: string; caption: string }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const r = 38;
  const length = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg className="donut" viewBox="0 0 100 100" role="img" aria-label={`${center} ${caption}`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#efeee6" strokeWidth="16" />
      {parts.map((p, i) => {
        const dash = (p.value / total) * length;
        const el = (
          <circle
            key={i}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={p.color}
            strokeWidth="16"
            strokeDasharray={`${dash} ${length - dash}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 50 50)"
          />
        );
        offset += dash;
        return el;
      })}
      <text x="50" y="49" textAnchor="middle" className="donut-center">
        {center}
      </text>
      <text x="50" y="60" textAnchor="middle" className="donut-caption">
        {caption}
      </text>
    </svg>
  );
}
