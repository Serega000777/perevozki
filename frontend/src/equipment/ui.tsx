import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { dayTitle, rub } from '../lib/format';

export const haptic = () => window.Telegram?.WebApp.HapticFeedback?.notificationOccurred('success');
export const errorText = (error: unknown) => (error instanceof Error ? error.message : 'Не удалось выполнить операцию');

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
    <div className="chips" role="radiogroup" aria-label={label}>
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
  onOpen,
}: {
  title: ReactNode;
  meta?: ReactNode;
  amount?: number | string;
  side?: ReactNode;
  onOpen?: () => void;
}) {
  const main = (
    <>
      <span className="row-title">{title}</span>
      {meta && <span className="row-meta">{meta}</span>}
    </>
  );
  return (
    <div className="row">
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
    </div>
  );
}

export function PaidStatus({ paid, onToggle }: { paid: boolean; onToggle?: () => void }) {
  const className = paid ? 'status paid' : 'status unpaid';
  const label = paid ? 'Оплачено' : 'Не отдали';
  if (!onToggle) return <span className={className}>{label}</span>;
  return (
    <button type="button" className={className} aria-pressed={paid} onClick={onToggle} title="Нажмите, чтобы изменить">
      {label}
    </button>
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
