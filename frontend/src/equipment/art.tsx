// Рисунки техники сбоку (свой SVG, без чужих изображений и логотипов). Грузовики собираются из общих
// деталей — кабина, рама, колёса, — поэтому все виды в одном стиле. Холст 240×120, земля на y=106.
import { useEffect, useId, useState, type ReactNode, type SVGProps } from 'react';
import { apiBlob } from '../api';
import { artKind, kindGroup, type Kind } from './catalog';
import type { Vehicle } from './types';

type Pal = {
  main: string;
  dark: string;
  trailer: string;
  trailerDark: string;
  tire: string;
  rim: string;
  frame: string;
  glass: string;
  glassHi: string;
  light: string;
  steel: string;
  steelDark: string;
  shadow: string;
};

const COMMON = {
  trailer: '#eef0ea',
  trailerDark: '#a3a69c',
  tire: '#25271f',
  rim: '#c8cbc2',
  frame: '#3b3e36',
  glass: '#b9d0dd',
  glassHi: '#e8f2f7',
  light: '#ffd66b',
  steel: '#cdd1ca',
  steelDark: '#868a83',
  shadow: 'rgba(30, 32, 24, 0.1)',
};
const TRUCK_TONES = [
  { main: '#e8772a', dark: '#a4500f' },
  { main: '#f4f4ef', dark: '#9fa198' },
  { main: '#2f6db0', dark: '#1c4677' },
  { main: '#c9402f', dark: '#86291d' },
  { main: '#3f8a52', dark: '#25593a' },
];
const MACHINE_TONES = [
  { main: '#f2b51f', dark: '#9c7209' },
  { main: '#e8772a', dark: '#a4500f' },
];
// Бледный вариант для шапки: те же формы, цвета фона иллюстрации.
const GHOST: Pal = {
  main: '#f8f6ec',
  dark: '#c6c1a3',
  trailer: '#f8f7f0',
  trailerDark: '#cbc6a9',
  tire: '#cdc8ab',
  rim: '#eeebda',
  frame: '#d4cfb3',
  glass: '#e6e4d5',
  glassHi: '#f5f4eb',
  light: '#ece7cd',
  steel: '#efecdd',
  steelDark: '#cbc6a9',
  shadow: 'transparent',
};

const G = 106;
const sh = (fill: string, stroke: string, width = 1.3) => ({ fill, stroke, strokeWidth: width, strokeLinejoin: 'round' as const });

function Wheel({ x, p, r = 12.5, rim }: { x: number; p: Pal; r?: number; rim?: string }) {
  const cy = G - r;
  return (
    <g>
      <circle cx={x} cy={cy} r={r} fill={p.tire} />
      <circle cx={x} cy={cy} r={r * 0.52} fill={rim ?? p.rim} />
      <circle cx={x} cy={cy} r={r * 0.17} fill={p.frame} />
    </g>
  );
}

// Тёмная арка над колесом — колесо «утоплено» в кузов.
const Arch = ({ x, p, r = 12.5 }: { x: number; p: Pal; r?: number }) => (
  <path d={`M${x - r - 3} ${G - r + 2} A${r + 3} ${r + 3} 0 0 1 ${x + r + 3} ${G - r + 2} Z`} fill={p.frame} />
);

const Wheels = ({ xs, p, r }: { xs: number[]; p: Pal; r?: number }) => (
  <>
    {xs.map((x) => (
      <g key={x}>
        <Arch x={x} p={p} r={r} />
        <Wheel x={x} p={p} r={r} />
      </g>
    ))}
  </>
);

const Chassis = ({ from, to, p }: { from: number; to: number; p: Pal }) => <rect x={from} y={85} width={to - from} height={7} rx={1} fill={p.frame} />;

// Кабина над двигателем, смотрит вправо; x — задняя стенка, перед — x + 46.
function Cab({ x, p, sleeper = false }: { x: number; p: Pal; sleeper?: boolean }) {
  return (
    <g>
      {sleeper && <path d={`M${x + 3} 41 Q${x + 8} 27 ${x + 23} 26 H${x + 36} Q${x + 41} 27 ${x + 41} 41 Z`} {...sh(p.main, p.dark)} />}
      <path d={`M${x} 96 V46 Q${x} 40 ${x + 6} 40 H${x + 36} Q${x + 41} 40 ${x + 42.5} 45 L${x + 46} 68 V96 Z`} {...sh(p.main, p.dark)} />
      <path d={`M${x + 42.5} 45 L${x + 46} 68 V95 H${x + 42} V68 Z`} fill={p.dark} opacity={0.2} />
      <path d={`M${x + 22} 46 H${x + 38.5} L${x + 41} 63 H${x + 22} Z`} fill={p.glass} stroke={p.dark} strokeWidth={1} strokeLinejoin="round" />
      <path d={`M${x + 26} 48.5 H${x + 31} L${x + 27.5} 60.5 H${x + 24.5} Z`} fill={p.glassHi} opacity={0.85} />
      <path d={`M${x + 19} 45 V89`} stroke={p.dark} strokeWidth={1} opacity={0.55} />
      <rect x={x + 23} y={70} width={5} height={1.8} rx={0.9} fill={p.dark} opacity={0.7} />
      <rect x={x + 41} y={78} width={6} height={4.5} rx={1.5} fill={p.light} />
      <rect x={x + 30} y={89} width={18} height={7} rx={1.5} fill={p.frame} />
      <path d={`M${x + 44} 47 L${x + 49} 48 V57`} fill="none" stroke={p.frame} strokeWidth={1.4} strokeLinecap="round" />
      <rect x={x + 47.5} y={50} width={3.5} height={8} rx={1} fill={p.frame} />
      <rect x={x + 7} y={92} width={10} height={3} rx={1} fill={p.frame} />
    </g>
  );
}

// Одиночный грузовик: рама, кузов (под кабиной), кабина, колёса.
function Rigid({ p, body, rear = [64, 92], over }: { p: Pal; body: ReactNode; rear?: number[]; over?: ReactNode }) {
  return (
    <>
      <Chassis from={14} to={212} p={p} />
      <rect x={118} y={81} width={26} height={12} rx={3} {...sh(p.steel, p.steelDark, 1)} />
      {body}
      <Cab x={170} p={p} />
      <Wheels xs={[...rear, 196]} p={p} />
      {over}
    </>
  );
}

// Седельный тягач; с прицепом — колёса тягача уходят под его передний край.
function Tractor({ p, x = 172, plate = false }: { p: Pal; x?: number; plate?: boolean }) {
  return (
    <>
      <Chassis from={x - 62} to={x + 44} p={p} />
      {plate && <rect x={x - 52} y={80} width={30} height={5} rx={1.5} fill={p.frame} />}
      <rect x={x + 1} y={81} width={18} height={12} rx={3} {...sh(p.steel, p.steelDark, 1)} />
      <Cab x={x} p={p} sleeper />
      <Wheels xs={[x - 46, x - 22, x + 28]} p={p} />
    </>
  );
}

// Кузов полуприцепа: x1 — задний край, x2 — передний.
function TrailerBase({ p, x1, x2, wheels, legs = true }: { p: Pal; x1: number; x2: number; wheels: number[]; legs?: boolean }) {
  return (
    <>
      <rect x={x1 + 2} y={84} width={x2 - x1 - 6} height={5} fill={p.frame} />
      <rect x={x1 - 2} y={88} width={8} height={7} rx={1} fill={p.frame} />
      {legs && (
        <>
          <rect x={x2 - 34} y={88} width={3} height={13} fill={p.frame} />
          <rect x={x2 - 37} y={100} width={9} height={3} rx={1} fill={p.frame} />
        </>
      )}
      {wheels.map((x) => (
        <Wheel key={x} x={x} p={p} />
      ))}
    </>
  );
}

function Box({
  p,
  x1,
  x2,
  top = 26,
  fill,
  stroke,
  step = 18,
}: {
  p: Pal;
  x1: number;
  x2: number;
  top?: number;
  fill?: string;
  stroke?: string;
  step?: number;
}) {
  const f = fill ?? p.trailer;
  const s = stroke ?? p.trailerDark;
  const ribs = [];
  for (let x = x1 + 14; x < x2 - 6; x += step) ribs.push(x);
  return (
    <g>
      <rect x={x1} y={top} width={x2 - x1} height={84 - top} rx={3} {...sh(f, s)} />
      <rect x={x1} y={top} width={x2 - x1} height={5} rx={2} fill={s} opacity={0.35} />
      <rect x={x1} y={78} width={x2 - x1} height={6} fill={s} opacity={0.28} />
      {ribs.map((x) => (
        <path key={x} d={`M${x} ${top + 6} V77`} stroke={s} strokeWidth={1.1} opacity={0.5} />
      ))}
    </g>
  );
}

function Car({ x, y, color, p }: { x: number; y: number; color: string; p: Pal }) {
  return (
    <g>
      <path
        d={`M${x} ${y + 10} Q${x} ${y + 4} ${x + 6} ${y + 4} L${x + 11} ${y - 1} H${x + 23} L${x + 29} ${y + 4} Q${x + 34} ${y + 4} ${x + 34} ${y + 10} Z`}
        {...sh(color, p.frame, 0.8)}
      />
      <path d={`M${x + 12} ${y + 1} H${x + 22} L${x + 26} ${y + 4} H${x + 9} Z`} fill={p.glass} />
      <circle cx={x + 8} cy={y + 10.5} r={3.4} fill={p.tire} />
      <circle cx={x + 26} cy={y + 10.5} r={3.4} fill={p.tire} />
    </g>
  );
}

// Сложенная Z-образно стрела (бетононасос, пумик): секции с шарнирами.
function FoldedBoom({ p, x1, x2, top }: { p: Pal; x1: number; x2: number; top: number }) {
  return (
    <g>
      <path d={`M${x2} ${top} L${x1} ${top - 5} V${top + 3} L${x2} ${top + 8} Z`} {...sh(p.main, p.dark)} />
      <path d={`M${x1 + 4} ${top + 7} L${x2 - 6} ${top + 11} V${top + 17} L${x1 + 4} ${top + 13} Z`} {...sh(p.main, p.dark)} />
      <path d={`M${x2 - 10} ${top + 19} L${x1 + 20} ${top + 17} V${top + 22} L${x2 - 10} ${top + 24} Z`} {...sh(p.main, p.dark)} />
      <circle cx={x2} cy={top + 4} r={5} fill={p.frame} />
      <circle cx={x1 + 2} cy={top + 5} r={4} fill={p.frame} />
      <circle cx={x2 - 8} cy={top + 17} r={3.5} fill={p.frame} />
      <path d={`M${x1 + 20} ${top + 20} Q${x1 + 12} ${top + 28} ${x1 + 16} ${top + 40}`} fill="none" stroke={p.frame} strokeWidth={3} strokeLinecap="round" />
    </g>
  );
}

// Барабан миксера: широкий у кабины, сужается к загрузочной горловине сзади (сзади он приподнят).
function Drum({ p, cx, cy, rx, ry, clip }: { p: Pal; cx: number; cy: number; rx: number; ry: number; clip: string }) {
  const l = cx - rx;
  const r = cx + rx;
  const d = `M${l} ${cy - ry * 0.3} Q${l - 3} ${cy} ${l} ${cy + ry * 0.3} L${cx - rx * 0.2} ${cy + ry * 0.92} Q${cx + rx * 0.3} ${cy + ry * 1.12} ${cx + rx * 0.72} ${cy + ry * 0.8} Q${r} ${cy + ry * 0.5} ${r} ${cy} Q${r} ${cy - ry * 0.5} ${cx + rx * 0.72} ${cy - ry * 0.8} Q${cx + rx * 0.3} ${cy - ry * 1.12} ${cx - rx * 0.2} ${cy - ry * 0.92} Z`;
  return (
    <g transform={`rotate(12 ${cx} ${cy})`}>
      <clipPath id={clip}>
        <path d={d} />
      </clipPath>
      <path d={d} {...sh(p.main, p.dark)} />
      <g clipPath={`url(#${clip})`}>
        {[-0.55, -0.15, 0.25, 0.65].map((k) => (
          <path key={k} d={`M${cx + k * rx + 12} ${cy - ry * 1.2} L${cx + k * rx - 12} ${cy + ry * 1.2}`} stroke={p.dark} strokeWidth={6} opacity={0.2} />
        ))}
        <path
          d={`M${cx - rx * 0.6} ${cy - ry * 0.55} Q${cx + rx * 0.2} ${cy - ry * 0.9} ${cx + rx * 0.8} ${cy - ry * 0.5}`}
          fill="none"
          stroke="#fff"
          strokeWidth={4}
          opacity={0.22}
          strokeLinecap="round"
        />
      </g>
      <rect x={l - 7} y={cy - ry * 0.28} width={8} height={ry * 0.56} rx={2} fill={p.dark} />
    </g>
  );
}

// Колёсная спецтехника: большая и малая шина с цветными дисками.
const MWheel = ({ x, r, p }: { x: number; r: number; p: Pal }) => <Wheel x={x} r={r} p={p} rim={p.main} />;

function Tracks({ p, x1, x2 }: { p: Pal; x1: number; x2: number }) {
  const rollers = [];
  for (let x = x1 + 24; x < x2 - 18; x += 24) rollers.push(x);
  return (
    <g>
      <rect x={x1} y={83} width={x2 - x1} height={23} rx={11.5} fill={p.tire} />
      <rect x={x1 + 6} y={88} width={x2 - x1 - 12} height={13} rx={6.5} fill={p.frame} />
      <circle cx={x1 + 11.5} cy={94.5} r={8} fill={p.rim} />
      <circle cx={x2 - 11.5} cy={94.5} r={8} fill={p.rim} />
      {rollers.map((x) => (
        <circle key={x} cx={x} cy={96} r={4.5} fill={p.rim} />
      ))}
    </g>
  );
}

function Glass({ x, y, w, h, p }: { x: number; y: number; w: number; h: number; p: Pal }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={2} fill={p.glass} stroke={p.dark} strokeWidth={1} />
      <path d={`M${x + 4} ${y + 3} H${x + 9} L${x + 5} ${y + h - 3} H${x + 2.5} Z`} fill={p.glassHi} opacity={0.85} />
    </g>
  );
}

function ExcavatorTop({ p }: { p: Pal }) {
  return (
    <g>
      <rect x={80} y={76} width={40} height={10} fill={p.frame} />
      <path d="M32 54 Q32 46 40 46 H138 V80 H38 Q32 80 32 74 Z" {...sh(p.main, p.dark)} />
      <rect x={38} y={50} width={60} height={4} rx={2} fill={p.dark} opacity={0.25} />
      <path d="M104 24 H132 Q138 24 138 30 V80 H104 Z" {...sh(p.main, p.dark)} />
      <Glass x={108} y={29} w={25} h={28} p={p} />
      <path d="M134 68 L180 16 Q186 10 192 16 L196 24 L150 76 Z" {...sh(p.main, p.dark)} />
      <path d="M142 74 L172 38" stroke={p.steel} strokeWidth={4} strokeLinecap="round" />
      <path d="M184 12 L198 10 L216 70 L205 74 Z" {...sh(p.main, p.dark)} />
      <path d="M203 70 L222 64 Q230 84 212 94 L200 90 Z" {...sh(p.frame, p.frame)} />
      <circle cx={188} cy={16} r={3.5} fill={p.frame} />
    </g>
  );
}

const ART: Record<Kind, (p: Pal, id: string) => ReactNode> = {
  dump: (p) => (
    <Rigid
      p={p}
      body={
        <g>
          <path d="M16 40 H160 L164 44 V84 H38 L16 64 Z" {...sh(p.main, p.dark)} />
          <path d="M16 40 H160 L164 44 V49 H16 Z" fill={p.dark} opacity={0.25} />
          {[50, 84, 118, 150].map((x) => (
            <path key={x} d={`M${x} 51 V82`} stroke={p.dark} strokeWidth={1.4} opacity={0.4} />
          ))}
          <path d="M156 41 L166 33 H197 L195 37 H168 L161 44 Z" {...sh(p.main, p.dark)} />
        </g>
      }
    />
  ),
  flatbed: (p) => (
    <Rigid
      p={p}
      body={
        <g>
          <rect x={16} y={58} width={148} height={28} rx={2} {...sh(p.trailer, p.trailerDark)} />
          {[52, 88, 124].map((x) => (
            <path key={x} d={`M${x} 60 V84`} stroke={p.trailerDark} strokeWidth={1.3} />
          ))}
          <rect x={16} y={58} width={148} height={4} fill={p.main} />
          <rect x={160} y={38} width={7} height={48} rx={1.5} fill={p.frame} />
        </g>
      }
    />
  ),
  reefer: (p) => (
    <Rigid
      p={p}
      body={
        <g>
          <rect x={160} y={31} width={11} height={22} rx={2} {...sh(p.steel, p.steelDark)} />
          <rect x={14} y={28} width={150} height={58} rx={3} {...sh('#fafbf8', p.trailerDark)} />
          <rect x={14} y={70} width={150} height={6} fill={p.main} />
          <path d="M18 32 V82" stroke={p.trailerDark} strokeWidth={1.2} />
        </g>
      }
    />
  ),
  timber: (p) => (
    <Rigid
      p={p}
      body={
        <g>
          {[44, 54, 64, 74].map((y, i) => (
            <g key={y}>
              <rect x={12 + (i % 2) * 5} y={y} width={146} height={10} rx={5} {...sh('#b47b45', '#7a4f25', 1)} />
              <circle cx={17 + (i % 2) * 5} cy={y + 5} r={4.3} {...sh('#e5bb85', '#7a4f25', 1)} />
            </g>
          ))}
          {[34, 82, 130].map((x) => (
            <rect key={x} x={x} y={36} width={4} height={50} rx={1} fill={p.frame} />
          ))}
          <rect x={158} y={36} width={8} height={50} rx={1.5} fill={p.frame} />
        </g>
      }
    />
  ),
  manipulator: (p) => (
    <Rigid
      p={p}
      body={
        <g>
          <rect x={14} y={62} width={134} height={24} rx={2} {...sh(p.trailer, p.trailerDark)} />
          {[48, 82, 116].map((x) => (
            <path key={x} d={`M${x} 64 V84`} stroke={p.trailerDark} strokeWidth={1.2} />
          ))}
          <rect x={148} y={34} width={13} height={54} rx={2} {...sh('#f2b51f', '#9c7209')} />
          <path d="M155 34 L54 28 L54 38 L155 44 Z" {...sh('#f2b51f', '#9c7209')} />
          <path d="M58 41 L138 46 V52 L58 47 Z" {...sh('#f6cd5e', '#9c7209')} />
          <circle cx={154} cy={39} r={4.5} fill={p.frame} />
          <path d="M57 38 V58 M57 58 q-5 5 1 8" fill="none" stroke={p.frame} strokeWidth={1.8} strokeLinecap="round" />
        </g>
      }
      over={
        <g>
          <rect x={140} y={88} width={26} height={4} fill={p.frame} />
          <rect x={162} y={88} width={4} height={14} fill={p.frame} />
        </g>
      }
    />
  ),
  crane: (p) => (
    <Rigid
      p={p}
      rear={[40, 64, 88]}
      body={
        <g>
          <rect x={18} y={80} width={22} height={10} fill={p.frame} />
          <rect x={120} y={80} width={20} height={10} fill={p.frame} />
          <rect x={12} y={54} width={18} height={30} rx={2} fill={p.frame} />
          <rect x={22} y={62} width={58} height={24} rx={3} {...sh(p.main, p.dark)} />
          <rect x={58} y={46} width={22} height={32} rx={3} {...sh(p.main, p.dark)} />
          <Glass x={63} y={50} w={14} h={14} p={p} />
        </g>
      }
      over={
        <g>
          <path d="M44 48 L230 20 V32 L44 60 Z" {...sh('#f2b51f', '#9c7209')} />
          <path d="M112 38.5 V49 M168 30 V40.5" stroke="#9c7209" strokeWidth={1.3} />
          <circle cx={50} cy={54} r={4} fill={p.frame} />
          <rect x={222} y={32} width={9} height={12} rx={1.5} fill={p.frame} />
          <path d="M226 44 V50 q-4 4 1 7" fill="none" stroke={p.frame} strokeWidth={1.8} strokeLinecap="round" />
        </g>
      }
    />
  ),
  pump: (p) => (
    <Rigid
      p={p}
      rear={[60, 88]}
      body={
        <g>
          <path d="M42 84 L26 104 M150 84 L136 104" stroke={p.frame} strokeWidth={5} strokeLinecap="round" />
          <path d="M6 64 H30 L26 82 H12 Z" {...sh(p.steel, p.steelDark)} />
          <rect x={144} y={38} width={16} height={50} rx={2} {...sh(p.steel, p.steelDark)} />
        </g>
      }
      over={<FoldedBoom p={{ ...p, main: '#f2b51f', dark: '#9c7209' }} x1={30} x2={154} top={36} />}
    />
  ),
  mixer: (p, id) => (
    <Rigid
      p={p}
      body={
        <g>
          <rect x={142} y={44} width={22} height={42} rx={4} {...sh(p.steel, p.steelDark)} />
          <rect x={30} y={62} width={7} height={24} fill={p.frame} />
          <Drum p={p} cx={86} cy={60} rx={66} ry={27} clip={`${id}-drum`} />
          <path d="M12 28 H36 L31 42 H17 Z" {...sh(p.steel, p.steelDark)} />
          <path d="M22 44 L8 70" stroke={p.steelDark} strokeWidth={4} strokeLinecap="round" />
        </g>
      }
    />
  ),
  pumix: (p, id) => (
    <Rigid
      p={p}
      body={
        <g>
          <rect x={146} y={40} width={16} height={48} rx={2} {...sh(p.steel, p.steelDark)} />
          <Drum p={p} cx={80} cy={70} rx={56} ry={20} clip={`${id}-drum`} />
          <path d="M12 46 H32 L28 58 H16 Z" {...sh(p.steel, p.steelDark)} />
        </g>
      }
      over={<FoldedBoom p={{ ...p, main: '#f2b51f', dark: '#9c7209' }} x1={26} x2={154} top={22} />}
    />
  ),
  drill: (p) => (
    <Rigid
      p={p}
      body={
        <g>
          <rect x={92} y={54} width={56} height={32} rx={3} {...sh(p.steel, p.steelDark)} />
          {[100, 108, 116].map((x) => (
            <path key={x} d={`M${x} 60 V80`} stroke={p.steelDark} strokeWidth={1.2} />
          ))}
          <path d="M40 30 L104 76" stroke="#f2b51f" strokeWidth={6} strokeLinecap="round" />
          <rect x={24} y={4} width={16} height={88} rx={2} {...sh('#f2b51f', '#9c7209')} />
          <path d="M24 12 L40 24 L24 36 L40 48 L24 60 L40 72 L24 84" fill="none" stroke="#9c7209" strokeWidth={1.2} />
          <path d="M27 92 L37 96 L27 100 L37 104" fill="none" stroke={p.frame} strokeWidth={2.5} strokeLinejoin="round" />
        </g>
      }
    />
  ),
  tractor: (p) => (
    <g transform="translate(-50 0)">
      <Tractor p={p} plate />
    </g>
  ),
  semi: (p) => (
    <>
      <Box p={p} x1={8} x2={168} />
      <TrailerBase p={p} x1={8} x2={168} wheels={[34, 58, 82]} />
      <Tractor p={p} />
    </>
  ),
  trailer: (p) => (
    <g transform="translate(30 0)">
      <Box p={p} x1={0} x2={190} />
      <TrailerBase p={p} x1={0} x2={190} wheels={[26, 50, 74]} />
      <rect x={176} y={84} width={8} height={4} fill={p.frame} />
    </g>
  ),
  grain: (p) => (
    <>
      {[22, 52, 82, 112, 142].map((x) => (
        <path key={x} d={`M${x} 34 Q${x + 15} 20 ${x + 30} 34`} fill="none" stroke={p.frame} strokeWidth={1.6} />
      ))}
      <Box p={p} x1={8} x2={168} top={34} fill="#d4c9a0" stroke="#8f8257" step={9} />
      <TrailerBase p={p} x1={8} x2={168} wheels={[34, 58, 82]} />
      <Tractor p={p} />
    </>
  ),
  metal: (p) => (
    <>
      {[18, 56, 94, 132].map((x) => (
        <rect key={x} x={x} y={50} width={3} height={28} fill={p.frame} />
      ))}
      {[54, 61, 68].map((y) => (
        <rect key={y} x={12} y={y} width={150} height={7} rx={1.5} {...sh(p.steel, p.steelDark, 1)} />
      ))}
      <rect x={6} y={76} width={164} height={8} rx={1} fill={p.frame} />
      <TrailerBase p={p} x1={8} x2={168} wheels={[34, 58, 82]} />
      <Tractor p={p} />
    </>
  ),
  carrier: (p) => (
    <>
      <path d="M6 50 H126 L168 38 V43 L126 55 H6 Z" fill={p.frame} />
      <rect x={6} y={80} width={164} height={5} fill={p.frame} />
      {[14, 64, 114].map((x) => (
        <rect key={x} x={x} y={52} width={3} height={30} fill={p.frame} />
      ))}
      <Car x={12} y={37} color="#d24a39" p={p} />
      <Car x={58} y={37} color="#3b7bc4" p={p} />
      <Car x={12} y={67} color="#ecece6" p={p} />
      <Car x={58} y={67} color="#2f3330" p={p} />
      <Car x={104} y={67} color="#ddae37" p={p} />
      <TrailerBase p={p} x1={8} x2={168} wheels={[34, 58, 82]} />
      <Tractor p={p} />
    </>
  ),
  lowbed: (p) => (
    <>
      <path d="M168 74 H122 L108 88 H58 L54 82 H12 V92 H56 L60 97 H110 L124 84 H168 Z" {...sh(p.frame, p.frame)} />
      <path d="M14 86 L4 104 M22 86 L12 104" stroke={p.frame} strokeWidth={3} strokeLinecap="round" />
      <Wheel x={22} r={9} p={p} />
      <Wheel x={42} r={9} p={p} />
      <rect x={118} y={84} width={3} height={16} fill={p.frame} />
      <Tractor p={p} />
    </>
  ),
  tanker: (p) => (
    <>
      <rect x={12} y={38} width={156} height={46} rx={23} {...sh(p.steel, p.steelDark)} />
      <ellipse cx={86} cy={47} rx={66} ry={4} fill="#fff" opacity={0.45} />
      {[50, 90, 130].map((x) => (
        <g key={x}>
          <path d={`M${x} 39 V83`} stroke={p.steelDark} strokeWidth={1.2} opacity={0.7} />
          <rect x={x - 14} y={33} width={10} height={5} rx={1.5} fill={p.steelDark} />
        </g>
      ))}
      <rect x={12} y={62} width={156} height={5} fill={p.main} opacity={0.9} />
      <TrailerBase p={p} x1={10} x2={168} wheels={[34, 58, 82]} />
      <Tractor p={p} />
    </>
  ),
  farm: (p) => (
    <>
      <rect x={96} y={80} width={96} height={9} fill={p.frame} />
      <path d="M100 54 H190 Q200 54 200 64 V84 H100 Z" {...sh(p.main, p.dark)} />
      <path d="M194 58 V82" stroke={p.dark} strokeWidth={4} opacity={0.35} />
      <rect x={158} y={30} width={4} height={24} fill={p.frame} />
      <path d="M58 18 H118 L122 64 H56 Z" fill={p.glass} stroke={p.dark} strokeWidth={1.2} strokeLinejoin="round" />
      <path d="M64 24 H72 L66 58 H61 Z" fill={p.glassHi} opacity={0.8} />
      <path d="M58 18 L56 64 M118 18 L122 64" stroke={p.main} strokeWidth={4} />
      <rect x={52} y={12} width={74} height={8} rx={3} {...sh(p.main, p.dark)} />
      <path d="M40 82 A38 38 0 0 1 116 82 H106 A28 28 0 0 0 50 82 Z" {...sh(p.main, p.dark)} />
      <MWheel x={78} r={27} p={p} />
      <MWheel x={178} r={16} p={p} />
    </>
  ),
  excavator: (p) => (
    <>
      <ExcavatorTop p={p} />
      <Tracks p={p} x1={24} x2={180} />
    </>
  ),
  wheelexc: (p) => (
    <>
      <ExcavatorTop p={p} />
      <rect x={34} y={80} width={140} height={11} rx={2} fill={p.frame} />
      <rect x={18} y={84} width={14} height={16} rx={2} fill={p.frame} />
      {[52, 78, 132, 158].map((x) => (
        <Wheel key={x} x={x} r={12} p={p} />
      ))}
    </>
  ),
  backhoe: (p) => (
    <>
      <path d="M56 58 H188 Q196 58 196 66 V88 H56 Z" {...sh(p.main, p.dark)} />
      <path d="M64 20 H114 Q120 20 120 26 V88 H64 Z" {...sh(p.main, p.dark)} />
      <Glass x={70} y={26} w={44} h={30} p={p} />
      <path d="M118 60 L204 70 V77 L118 68 Z" {...sh(p.main, p.dark)} />
      <path d="M198 64 H224 Q232 82 222 98 H200 Z" {...sh(p.main, p.dark)} />
      <path d="M66 66 L40 12 Q38 6 45 7 L52 10 L78 62 Z" {...sh(p.main, p.dark)} />
      <path d="M40 10 L50 9 L30 70 L20 68 Z" {...sh(p.main, p.dark)} />
      <path d="M14 66 L32 70 L30 88 Q18 92 12 80 Z" fill={p.frame} />
      <rect x={50} y={80} width={6} height={24} fill={p.frame} />
      <rect x={45} y={102} width={16} height={4} rx={1} fill={p.frame} />
      <MWheel x={92} r={20} p={p} />
      <MWheel x={176} r={14} p={p} />
    </>
  ),
  loader: (p) => (
    <>
      <path d="M16 50 H70 V90 H20 Q16 90 16 86 Z" {...sh(p.main, p.dark)} />
      {[26, 34, 42].map((x) => (
        <path key={x} d={`M${x} 56 V82`} stroke={p.dark} strokeWidth={1.2} opacity={0.5} />
      ))}
      <path d="M58 18 H102 Q108 18 108 24 V90 H58 Z" {...sh(p.main, p.dark)} />
      <Glass x={64} y={24} w={38} h={32} p={p} />
      <rect x={104} y={70} width={66} height={20} rx={2} {...sh(p.main, p.dark)} />
      <path d="M106 62 L190 50 L194 58 L110 72 Z" {...sh(p.main, p.dark)} />
      <path d="M180 44 H222 Q230 44 226 56 L216 82 H184 Q176 64 180 44 Z" {...sh(p.main, p.dark)} />
      <MWheel x={64} r={19} p={p} />
      <MWheel x={160} r={19} p={p} />
    </>
  ),
  skid: (p) => (
    <>
      <path d="M64 40 H140 Q148 40 148 48 V94 H64 Z" {...sh(p.main, p.dark)} />
      <Glass x={82} y={46} w={50} h={34} p={p} />
      <path d="M82 50 H132 M82 58 H132 M82 66 H132" stroke={p.frame} strokeWidth={1} opacity={0.5} />
      <path d="M66 42 L160 68 L158 74 L64 47 Z" fill={p.frame} opacity={0.9} />
      <path d="M156 64 H192 Q198 64 196 72 L190 98 H158 Z" {...sh(p.main, p.dark)} />
      <Wheel x={86} r={13} p={p} />
      <Wheel x={130} r={13} p={p} />
    </>
  ),
  forklift: (p) => (
    <>
      <path d="M36 64 Q36 52 48 52 H136 V96 H36 Z" {...sh(p.main, p.dark)} />
      <path d="M68 22 H140 V26 H72 L70 56 H66 Z" fill={p.frame} />
      <path d="M136 24 V56" stroke={p.frame} strokeWidth={3} />
      <rect x={90} y={44} width={16} height={10} rx={2} fill={p.frame} />
      <rect x={146} y={12} width={10} height={88} rx={1.5} {...sh(p.steel, p.steelDark)} />
      <rect x={150} y={12} width={2} height={88} fill={p.steelDark} />
      <rect x={156} y={70} width={6} height={28} fill={p.frame} />
      <rect x={156} y={93} width={52} height={5} rx={1} fill={p.frame} />
      <Wheel x={62} r={12} p={p} />
      <Wheel x={126} r={12} p={p} />
    </>
  ),
  telehandler: (p) => (
    <>
      <path d="M28 72 H194 Q202 72 202 80 V92 H28 Z" {...sh(p.main, p.dark)} />
      <path d="M40 64 L196 28 L200 38 L44 74 Z" {...sh(p.main, p.dark)} />
      <path d="M150 39 L214 24 L216 32 L152 47 Z" {...sh(p.steel, p.steelDark)} />
      <path d="M212 22 V46 H234 V50 H208 V22 Z" fill={p.frame} />
      <rect x={104} y={40} width={30} height={48} rx={4} {...sh(p.main, p.dark)} />
      <Glass x={108} y={45} w={22} h={24} p={p} />
      <MWheel x={62} r={15} p={p} />
      <MWheel x={170} r={15} p={p} />
    </>
  ),
  dozer: (p) => (
    <>
      <path d="M30 70 H18 L14 100 H20 L24 76 H30 Z" fill={p.frame} />
      <path d="M54 52 H150 Q156 52 156 58 V84 H54 Z" {...sh(p.main, p.dark)} />
      {[136, 142, 148].map((x) => (
        <path key={x} d={`M${x} 58 V80`} stroke={p.dark} strokeWidth={1.2} opacity={0.5} />
      ))}
      <rect x={120} y={36} width={4} height={16} fill={p.frame} />
      <path d="M48 20 H90 Q96 20 96 26 V84 H48 Z" {...sh(p.main, p.dark)} />
      <Glass x={54} y={26} w={36} h={30} p={p} />
      <path d="M150 76 H186 V84 H150 Z" fill={p.frame} />
      <path d="M152 62 L184 62" stroke={p.steel} strokeWidth={3} strokeLinecap="round" />
      <path d="M186 48 Q176 77 186 106 H198 Q190 77 198 48 Z" {...sh(p.main, p.dark)} />
      <Tracks p={p} x1={28} x2={172} />
    </>
  ),
  grader: (p) => (
    <>
      <path d="M12 58 H72 V92 H16 Q12 92 12 88 Z" {...sh(p.main, p.dark)} />
      <path d="M66 20 H102 Q108 20 108 26 V92 H66 Z" {...sh(p.main, p.dark)} />
      <Glass x={72} y={26} w={30} h={30} p={p} />
      <path d="M104 70 Q150 48 210 58 V66 Q150 58 106 80 Z" {...sh(p.main, p.dark)} />
      <path d="M204 66 L150 92" stroke={p.frame} strokeWidth={3} />
      <path d="M124 96 Q150 89 178 96 V101 H124 Z" {...sh(p.steel, p.steelDark)} />
      <rect x={200} y={58} width={12} height={30} rx={2} fill={p.frame} />
      <Wheel x={28} r={13} p={p} />
      <Wheel x={56} r={13} p={p} />
      <Wheel x={206} r={13} p={p} />
    </>
  ),
  roller: (p) => (
    <>
      <path d="M28 54 H150 V88 H32 Q28 88 28 84 Z" {...sh(p.main, p.dark)} />
      <path d="M60 18 L56 54 M118 18 L122 54" stroke={p.frame} strokeWidth={3} />
      <rect x={54} y={12} width={72} height={8} rx={3} {...sh(p.main, p.dark)} />
      <rect x={70} y={36} width={36} height={18} rx={2} fill={p.glass} stroke={p.dark} strokeWidth={1} />
      <path d="M148 54 H212 Q220 54 220 62 V76 H210 A27 27 0 0 0 158 76 H148 Z" {...sh(p.main, p.dark)} />
      <circle cx={184} cy={80} r={26} {...sh(p.steel, p.steelDark)} />
      <circle cx={184} cy={80} r={18} fill="#b8bcb5" />
      <circle cx={184} cy={80} r={5} fill={p.frame} />
      <Wheel x={66} r={17} p={p} />
    </>
  ),
};

export function vehiclePalette(kind: Kind, tone: number): Pal {
  const tones = kindGroup(kind) === 'machine' ? MACHINE_TONES : TRUCK_TONES;
  return { ...COMMON, ...tones[Math.abs(tone) % tones.length] };
}

// Картинка машины по виду техники; tone — цвет кабины (по порядку машины), ghost — бледный вариант для шапки.
export function VehicleArt({ kind, tone = 0, ghost = false, ...rest }: { kind?: string | null; tone?: number; ghost?: boolean } & SVGProps<SVGSVGElement>) {
  const id = useId();
  const key = artKind(kind);
  const p = ghost ? GHOST : vehiclePalette(key, tone);
  return (
    <svg className="vehicle-art" viewBox="0 0 240 120" aria-hidden {...rest}>
      <ellipse cx="120" cy="107" rx="108" ry="4" fill={p.shadow} />
      {ART[key](p, id)}
    </svg>
  );
}

// Blob-ссылки на фото живут, пока открыто приложение: машин немного, а повторно скачивать незачем.
const photos = new Map<string, Promise<string>>();
const photoUrl = (id: number, at: string) => {
  const key = `${id}:${at}`;
  if (!photos.has(key))
    photos.set(
      key,
      apiBlob(`/equipment/vehicles/${id}/photo?v=${encodeURIComponent(at)}`).then((b) => URL.createObjectURL(b)),
    );
  return photos.get(key)!;
};

// Своё фото машины, а пока его нет (или оно грузится) — рисунок по виду техники.
export function VehicleImage({ vehicle, tone }: { vehicle: Pick<Vehicle, 'id' | 'kind' | 'photoAt'>; tone: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    setSrc(null);
    if (!vehicle.photoAt) return;
    let alive = true;
    photoUrl(vehicle.id, vehicle.photoAt).then(
      (url) => alive && setSrc(url),
      () => photos.delete(`${vehicle.id}:${vehicle.photoAt}`),
    );
    return () => {
      alive = false;
    };
  }, [vehicle.id, vehicle.photoAt]);
  return src ? <img className="vehicle-img" src={src} alt="" /> : <VehicleArt kind={vehicle.kind} tone={tone} />;
}
