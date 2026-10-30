// Графика бренда «Перевозчик»: логотип и иллюстрация шапки. Всё — свой SVG, без внешних изображений.
import { useId } from 'react';
import { Menu } from 'lucide-react';
import heroTruck from './assets/hero-truck.webp';

// Логотип владельца (perevozchik-logo.svg, 2026-10-30); углы скруглены, как у плиток интерфейса.
const LOGO_MARK = 'M254 258H1000V996H880L800 809V443H692L627 389L563 443H454V809L375 996H254Z';
const LOGO_ROAD = 'M614 478H641L827 996H682L667 840H587L572 996H426ZM616 555L608 628H646L638 555ZM603 680L593 775H660L651 680Z';

export function Logo() {
  return (
    <svg className="logo" viewBox="0 0 1254 1254" aria-hidden>
      <rect width="1254" height="1254" rx="280" fill="#d6ff45" />
      <path d={LOGO_MARK} fill="#1b1d17" />
      <path d={LOGO_ROAD} fill="#1b1d17" fillRule="evenodd" />
    </svg>
  );
}

// Иллюстрация справа в шапке: бледные дорога, горы и ели, на их фоне фура владельца (картинка 2026-10-30).
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
        <image href={heroTruck} x={82} y={62} width={218} height={82} />
      </g>
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
