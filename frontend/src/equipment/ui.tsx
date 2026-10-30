import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, CircleCheck, Clock, Droplets, Ellipsis, Fuel, Hammer, Disc, Plus, Receipt, User, Wrench, X } from 'lucide-react';
import { dayTitle, rub, shiftDay, shortDate, todayKey } from '../lib/format';

export const haptic = () => window.Telegram?.WebApp.HapticFeedback?.notificationOccurred('success');
export const errorText = (error: unknown) => (error instanceof Error ? error.message : 'Не удалось выполнить операцию');

export function Field({ label, icon, ...props }: { label: string; icon?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={icon ? 'field with-icon' : 'field'}>
      <span>{label}</span>
      <span className="field-box">
        {icon && <span className="field-icon">{icon}</span>}
        <input {...props} />
      </span>
    </label>
  );
}

// Варианты кнопками: машин и категорий немного, выбрать касанием быстрее, чем списком.
export function Choice<T extends string | number>({
  label,
  options,
  value,
  onChange,
  shape = 'rect',
}: {
  label?: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  shape?: 'rect' | 'pill';
}) {
  const chips = (
    <div className={`chips ${shape === 'pill' ? 'round' : 'rect'}`} role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={option.value === value ? 'chip on' : 'chip'}
          onClick={() => onChange(option.value)}
          key={String(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
  if (!label) return chips;
  return (
    <div className="field">
      <span>{label}</span>
      {chips}
    </div>
  );
}

export function IconTile({ children, plus = false }: { children: ReactNode; plus?: boolean }) {
  return (
    <span className="icon-tile">
      {children}
      {plus && <Plus className="icon-plus" aria-hidden />}
    </span>
  );
}

export function Card({
  icon,
  title,
  aside,
  children,
  className = '',
}: {
  icon?: ReactNode;
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div className="card-head">
          {icon}
          <h2>{title}</h2>
          {aside && <div className="card-aside">{aside}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export type Stat = { icon: ReactNode; value: ReactNode; unit?: string; sub: string };

export function Stats({ items }: { items: Stat[] }) {
  return (
    <section className="stats">
      {items.map((s, i) => (
        <div className="stat" key={i}>
          <IconTile>{s.icon}</IconTile>
          <div className="stat-text">
            <strong>
              {s.value}
              {s.unit && <span> {s.unit}</span>}
            </strong>
            <small>{s.sub}</small>
          </div>
        </div>
      ))}
    </section>
  );
}

export function SectionHead({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {aside && <span>{aside}</span>}
    </div>
  );
}

// «+» — только у кнопок добавления; «Сохранить» в правке без значка.
// Без onClick — кнопка отправки формы; с onClick — обычная кнопка (например, открыть шторку).
export function PrimaryButton({ children, disabled, plus = true, onClick }: { children: ReactNode; disabled?: boolean; plus?: boolean; onClick?: () => void }) {
  return (
    <button className="primary" type={onClick ? 'button' : 'submit'} disabled={disabled} onClick={onClick}>
      {plus && (
        <span className="plus" aria-hidden>
          <Plus />
        </span>
      )}
      {children}
    </button>
  );
}

export function Sheet({ title, onClose, onBack, children }: { title: string; onClose: () => void; onBack?: () => void; children: ReactNode }) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, []);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          {onBack && (
            <button type="button" className="sheet-back" onClick={onBack}>
              <ChevronLeft aria-hidden />
              Назад
            </button>
          )}
          <h3>{title}</h3>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Закрыть">
            <X aria-hidden />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </section>
    </div>
  );
}

// Удаление в два касания вместо confirm(): системные диалоги в Telegram WebView ведут себя по-разному.
export function DeleteButton({ label, onConfirm, small = false }: { label: string; onConfirm: () => Promise<void> | void; small?: boolean }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);
  return (
    <button type="button" className={`${small ? 'link' : 'delete'}${armed ? ' armed' : ''}`} onClick={() => (armed ? onConfirm() : setArmed(true))}>
      {armed ? 'Точно удалить?' : label}
    </button>
  );
}

// День — серая полоса внутри общей подложки, как в банковской выписке.
export function DayGroup({ day, total, children }: { day: string; total?: number; children: ReactNode }) {
  return (
    <>
      <div className="ledger-day" role="heading" aria-level={4}>
        <span>{dayTitle(day)}</span>
        {total != null && <span className="money">{rub(total)}</span>}
      </div>
      {children}
    </>
  );
}

export function Row({
  title,
  meta,
  amount,
  side,
  icon,
  onOpen,
}: {
  title: ReactNode;
  meta?: ReactNode;
  amount?: number | string;
  side?: ReactNode;
  icon?: ReactNode;
  onOpen?: () => void;
}) {
  const main = (
    <>
      {icon && <span className="row-icon">{icon}</span>}
      <span className="row-text">
        <span className="row-title">{title}</span>
        {meta && <span className="row-meta">{meta}</span>}
      </span>
    </>
  );
  return (
    <div className={onOpen ? 'row clickable' : 'row'}>
      {onOpen ? (
        <button type="button" className="row-main" onClick={onOpen}>
          {main}
        </button>
      ) : (
        <div className="row-main">{main}</div>
      )}
      <div className="row-side">
        {amount != null && <span className="money">{rub(amount)}</span>}
        {side}
      </div>
      {onOpen && <ChevronRight className="chevron" aria-hidden onClick={onOpen} />}
    </div>
  );
}

// Статус оплаты рейса: плашка с галочкой или часами; у владельца нажатие переключает.
export function PaidPill({ paid, onToggle }: { paid: boolean; onToggle?: () => void }) {
  const content = (
    <>
      {paid ? <CircleCheck aria-hidden /> : <Clock aria-hidden />}
      {paid ? 'Оплачено' : 'Ожидает'}
    </>
  );
  const className = paid ? 'pill paid' : 'pill waiting';
  if (!onToggle) return <span className={className}>{content}</span>;
  return (
    <button
      type="button"
      className={className}
      aria-pressed={paid}
      aria-label={paid ? 'Оплачено. Нажмите, чтобы снять отметку' : 'Ожидает оплаты. Нажмите, чтобы отметить оплату'}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      {content}
    </button>
  );
}

// Иконка категории расхода по названию; свои категории без узнаваемого имени — «чек».
export function CategoryIcon({ name }: { name: string }) {
  const n = name.toLowerCase();
  const Icon =
    n.includes('топлив') || n.includes('бенз') || n.includes('дт')
      ? Fuel
      : n.includes('запчаст')
        ? Wrench
        : n.includes('ремонт')
          ? Hammer
          : n.includes('зарплат') || n.includes('водител')
            ? User
            : n.includes('шин') || n.includes('колес')
              ? Disc
              : n.includes('мойк')
                ? Droplets
                : n.includes('проч')
                  ? Ellipsis
                  : Receipt;
  return <Icon aria-hidden />;
}

// Быстрый выбор даты; день последней добавленной записи подсвечен — к нему часто возвращаются.
export function DateChips({ value, onChange, last }: { value: string; onChange: (value: string) => void; last?: string | null }) {
  const today = todayKey();
  const options = [
    { value: today, label: 'Сегодня' },
    { value: shiftDay(today, -1), label: 'Вчера' },
    { value: shiftDay(today, -2), label: 'Позавчера' },
  ];
  if (last && !options.some((o) => o.value === last)) options.push({ value: last, label: shortDate(last) });
  return (
    <div className="chips date-chips" role="group" aria-label="Быстрый выбор даты">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          className={['chip', o.value === value && 'on', o.value === last && 'last'].filter(Boolean).join(' ')}
          aria-pressed={o.value === value}
          title={o.value === last ? 'День последней добавленной записи' : undefined}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const Empty = ({ children }: { children: ReactNode }) => <p className="empty">{children}</p>;
export const ErrorNote = ({ children }: { children: ReactNode }) =>
  children ? (
    <p className="error" role="alert">
      {children}
    </p>
  ) : null;

// Сколько строк истории показывать сразу: при сотнях рейсов длинный список тормозит в WebView.
export const PAGE = 60;
export function MoreButton({ shown, total, onMore }: { shown: number; total: number; onMore: () => void }) {
  if (shown >= total) return null;
  return (
    <button type="button" className="secondary more" onClick={onMore}>
      Показать ещё {Math.min(PAGE, total - shown)} из {total - shown}
    </button>
  );
}
