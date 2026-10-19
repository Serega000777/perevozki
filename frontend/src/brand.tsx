// Графика бренда «Перевозчик»: логотип, иллюстрация шапки, картинки машин. Всё — свой SVG,
// без внешних изображений (лёгкий бандл, нет вопросов с лицензиями).
import { useId } from 'react';
import { Menu } from 'lucide-react';

export function Logo() {
  return (
    <svg className="logo" viewBox="0 0 36 36" aria-hidden>
      <rect width="36" height="36" rx="8" fill="#d6ff45" />
      <path d="M8 26 L15 10 H20 L13 26 Z" fill="#1b1d17" />
      <path d="M17 26 L24 10 H29 L22 26 Z" fill="#1b1d17" />
    </svg>
  );
}

// Бледная иллюстрация справа в шапке: дорога, горы, ели и тягач с полуприцепом.
export function HeroArt() {
  const fade = useId();
  return (
    <svg className="hero-art" viewBox="0 0 300 190" aria-hidden>
      <defs>
        <linearGradient id={`${fade}-g`} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id={`${fade}-m`}>
          <rect width="300" height="190" fill={`url(#${fade}-g)`} />
        </mask>
      </defs>
      <g mask={`url(#${fade}-m)`} strokeLinejoin="round" strokeLinecap="round">
        <path d="M60 120 L130 46 L170 80 L210 30 L300 98 V140 H60 Z" fill="#ebe7cf" />
        <path d="M120 128 L190 70 L235 104 L262 84 L300 112 V150 H120 Z" fill="#e3dec2" />
        <path d="M122 22 V118 M112 32 H132 M114 40 H130" stroke="#d8d3b6" strokeWidth="1.6" fill="none" />
        {[
          [262, 70, 1],
          [278, 80, 1.2],
          [292, 64, 1.4],
          [248, 92, 0.8],
          [98, 108, 0.9],
          [84, 116, 0.7],
        ].map(([x, y, s]) => (
          <path
            key={`${x}-${y}`}
            d={`M${x} ${y} l${8 * s} ${18 * s} h${-5 * s} l${7 * s} ${14 * s} h${-20 * s} l${7 * s} ${-14 * s} h${-5 * s} Z`}
            fill="#d7d2b4"
          />
        ))}
        <path d="M0 190 C70 160 150 146 300 150 V190 Z" fill="#efecd9" />
        <path d="M0 176 C80 148 160 136 300 140" stroke="#ddd8bc" strokeWidth="1.5" fill="none" />
        <path d="M40 186 C110 162 190 154 300 158" stroke="#e2ddc3" strokeWidth="2" strokeDasharray="10 9" fill="none" />
        {/* полуприцеп */}
        <path d="M118 52 L206 62 V122 L118 108 Z" fill="#f5f3e8" stroke="#cdc8ab" strokeWidth="1.4" />
        <path d="M118 52 L128 46 L214 56 L206 62 Z" fill="#faf9f2" stroke="#cdc8ab" strokeWidth="1.4" />
        {[140, 162, 184].map((x) => (
          <path key={x} d={`M${x} ${54 + (x - 118) * 0.11} V${110 + (x - 118) * 0.16}`} stroke="#dcd7bd" strokeWidth="1.2" />
        ))}
        <ellipse cx="146" cy="113" rx="7" ry="8" fill="#c9c4a6" />
        <ellipse cx="164" cy="116" rx="7" ry="8" fill="#c9c4a6" />
        {/* кабина */}
        <path d="M206 64 Q206 56 214 56 H246 Q254 56 254 64 V130 H206 Z" fill="#f8f7f0" stroke="#c8c3a5" strokeWidth="1.5" />
        <path d="M254 62 L266 70 V128 L254 130 Z" fill="#ecead9" stroke="#c8c3a5" strokeWidth="1.4" />
        <path d="M211 68 H249 V94 H211 Z" fill="#dfe0d2" stroke="#c8c3a5" strokeWidth="1.2" />
        <path d="M216 101 H244 V119 H216 Z" fill="none" stroke="#c8c3a5" strokeWidth="1.2" />
        <path d="M216 106 H244 M216 111 H244 M216 116 H244" stroke="#d6d1b5" strokeWidth="1" />
        <rect x="208" y="111" width="6" height="5" rx="1.5" fill="#e4dfc4" stroke="#c8c3a5" />
        <rect x="246" y="111" width="6" height="5" rx="1.5" fill="#e4dfc4" stroke="#c8c3a5" />
        <path d="M204 124 H256 V132 H204 Z" fill="#ebe8d8" stroke="#c8c3a5" strokeWidth="1.2" />
        <ellipse cx="214" cy="135" rx="7" ry="6" fill="#c3be9f" />
        <ellipse cx="246" cy="135" rx="7" ry="6" fill="#c3be9f" />
      </g>
    </svg>
  );
}

const PALETTE = [
  { body: '#e97d2b', dark: '#b85a14' },
  { body: '#f2f2ee', dark: '#b9bab2' },
  { body: '#8f948b', dark: '#5f635b' },
  { body: '#2f6fb3', dark: '#1f4d80' },
  { body: '#c8402f', dark: '#8f2b1f' },
];

// Самосвал сбоку; цвет зависит от машины, чтобы карточки различались с первого взгляда.
export function TruckArt({ index }: { index: number }) {
  const { body, dark } = PALETTE[index % PALETTE.length];
  return (
    <svg className="truck-art" viewBox="0 0 120 70" aria-hidden>
      <ellipse cx="60" cy="61" rx="50" ry="4" fill="#00000014" />
      <path d="M12 44 H106 V50 H12 Z" fill="#2e312a" />
      <path d="M14 16 H76 L80 42 H16 Z" fill={body} stroke={dark} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 16 H76 V20 H14 Z" fill={dark} opacity="0.35" />
      {[30, 46, 62].map((x) => (
        <path key={x} d={`M${x} 20 V41`} stroke={dark} strokeWidth="1.2" opacity="0.6" />
      ))}
      <path d="M80 22 H96 L106 34 V48 H80 Z" fill={body} stroke={dark} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M84 25 H95 L102 34 H84 Z" fill="#a9bccb" stroke={dark} strokeWidth="1" strokeLinejoin="round" />
      <rect x="102" y="40" width="5" height="4" rx="1" fill="#f3d27a" />
      {[26, 42, 94].map((x) => (
        <g key={x}>
          <circle cx={x} cy="52" r="8" fill="#23251f" />
          <circle cx={x} cy="52" r="3.2" fill="#9c9f96" />
        </g>
      ))}
    </svg>
  );
}

export function PageHeader({ subtitle, onMenu }: { subtitle: string; onMenu?: () => void }) {
  return (
    <header className="page-head">
      <HeroArt />
      <div className="brand-row">
        <Logo />
        <span className="brand-name">ПЕРЕВОЗЧИК</span>
        {onMenu && (
          <button type="button" className="menu-button" onClick={onMenu} aria-label="Меню">
            <Menu aria-hidden />
          </button>
        )}
      </div>
      <h1>Перевозки</h1>
      <p className="lead">{subtitle}</p>
    </header>
  );
}
