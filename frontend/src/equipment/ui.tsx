import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronLeft, Plus, X } from 'lucide-react';
import { dayTitle, rub, shiftDay, shortDate, todayKey } from '../lib/format';

export const haptic = () => window.Telegram?.WebApp.HapticFeedback?.notificationOccurred('success');
export const errorText = (error: unknown) => (error instanceof Error ? error.message : 'Не удалось выполнить операцию');

export function PageTitle({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="page-title">
      <span className="eyebrow">{number}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
export function AddButton({ children, onClick, disabled = false }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button className="primary add-button" onClick={onClick} disabled={disabled}>
      {children}
      <Plus aria-hidden="true" />
    </button>
  );
}

export function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}

// Варианты кнопками: машин и категорий немного, выбрать касанием быстрее, чем списком.
export function Choice<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  const chips = (
    <div className="chips" role="group" aria-label={label || 'Фильтр по машине'}>
      {options.map((option) => (
        <button
          type="button"
          aria-pressed={option.value === value}
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

export function Sheet({ title, onClose, onBack, children }: { title: string; onClose: () => void; onBack?: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const trigger = document.activeElement as HTMLElement | null;
    const main = document.querySelector('main');
    const previousInert = main?.inert;
    if (main) main.inert = true;
    // Focus the dialog heading rather than an input: opening a sheet must not summon the mobile keyboard.
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current();
      if (e.key !== 'Tab') return;
      const elements = [
        ...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]') ?? []),
      ];
      const first = elements[0],
        last = elements.at(-1);
      if (!first) {
        e.preventDefault();
        return;
      }
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      if (main) main.inert = previousInert ?? false;
      trigger?.focus();
      window.removeEventListener('keydown', onKey);
    };
  }, []);
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <section ref={dialog} tabIndex={-1} className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
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
    </div>,
    document.body,
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

// День — разделительная строка внутри общей подложки, как в банковской выписке.
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
  check,
  onOpen,
}: {
  title: ReactNode;
  meta?: ReactNode;
  amount?: number | string;
  side?: ReactNode;
  check?: ReactNode;
  onOpen?: () => void;
}) {
  const main = (
    <>
      <span className="row-title">{title}</span>
      {meta && <span className="row-meta">{meta}</span>}
    </>
  );
  return (
    <div className={check ? 'row has-check' : 'row'}>
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
      {check}
    </div>
  );
}

export const PaidStatus = ({ paid }: { paid: boolean }) => <span className={paid ? 'status paid' : 'status unpaid'}>{paid ? 'Оплачено' : 'Не отдали'}</span>;

// Крупная галочка справа: на телефоне по ней попасть проще, чем по тексту статуса.
export function PaidCheck({ paid, onToggle }: { paid: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={paid}
      aria-label={paid ? 'Оплачено. Снять отметку' : 'Отметить оплату'}
      className={paid ? 'check on' : 'check'}
      onClick={onToggle}
    >
      <Check aria-hidden />
    </button>
  );
}

// Быстрый выбор даты; дата последней добавленной записи подсвечена — к ней часто возвращаются.
export function DateChips({ value, onChange, last }: { value: string; onChange: (value: string) => void; last?: string | null }) {
  const today = todayKey();
  const options = [
    { value: today, label: 'Сегодня' },
    { value: shiftDay(today, -1), label: 'Вчера' },
    { value: shiftDay(today, -2), label: 'Позавчера' },
  ];
  if (last && !options.some((o) => o.value === last)) options.push({ value: last, label: shortDate(last) });
  return (
    <div className="date-quick">
      <div className="chips date-chips" role="group" aria-label="Быстрый выбор даты">
        {options.map((o) => (
          <button
            type="button"
            key={o.value}
            className={['chip', o.value === value && 'on', o.value === last && 'last'].filter(Boolean).join(' ')}
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {last && <span className="date-hint">Подсвечен день последней добавленной записи</span>}
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

// Сколько строк истории показывать сразу: при сотнях ходок длинный список тормозит в WebView.
export const PAGE = 60;
export function MoreButton({ shown, total, onMore }: { shown: number; total: number; onMore: () => void }) {
  if (shown >= total) return null;
  return (
    <button type="button" className="secondary more" onClick={onMore}>
      Показать ещё {Math.min(PAGE, total - shown)} из {total - shown}
    </button>
  );
}
