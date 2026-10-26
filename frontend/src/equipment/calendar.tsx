import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthCells, rangeTitle, shiftMonth, todayKey } from '../lib/format';
import { monthTitle } from '../lib/series';
import { PrimaryButton, Sheet } from './ui';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// Период выбирается прямо в календаре: касание — первый день, второе — последний.
export function RangeCalendar({
  from,
  to,
  onApply,
  onClose,
}: {
  from?: string;
  to?: string;
  onApply: (from: string, to: string) => void;
  onClose: () => void;
}) {
  const today = todayKey();
  const [start, setStart] = useState(from ?? null);
  const [end, setEnd] = useState(to ?? null);
  const [month, setMonth] = useState((to ?? today).slice(0, 7));
  const last = end ?? start;

  const pick = (day: string) => {
    if (!start || end || day < start) {
      setStart(day);
      setEnd(null);
    } else setEnd(day);
  };

  return (
    <Sheet title="Выберите период" onClose={onClose}>
      <div className="calendar-head">
        <button type="button" aria-label="Предыдущий месяц" onClick={() => setMonth(shiftMonth(month, -1))}>
          <ChevronLeft aria-hidden />
        </button>
        <strong>
          {monthTitle(month)} {month.slice(0, 4)}
        </strong>
        <button type="button" aria-label="Следующий месяц" disabled={month >= today.slice(0, 7)} onClick={() => setMonth(shiftMonth(month, 1))}>
          <ChevronRight aria-hidden />
        </button>
      </div>
      <div className="calendar-weekdays" aria-hidden>
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {monthCells(month).map((day, i) =>
          day ? (
            <button
              type="button"
              key={day}
              disabled={day > today}
              aria-pressed={day === start || day === end}
              className={[
                'calendar-day',
                day === start && 'start',
                day === last && 'end',
                start && last && day > start && day < last && 'in',
                day === today && 'today',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => pick(day)}
            >
              <span>{Number(day.slice(8))}</span>
            </button>
          ) : (
            <span key={i} />
          ),
        )}
      </div>
      <p className="calendar-picked">
        {!start ? 'Нажмите первый и последний день' : end ? rangeTitle(start, end) : `${rangeTitle(start, start)} — теперь последний день`}
      </p>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (start) onApply(start, end ?? start);
        }}
      >
        <PrimaryButton plus={false} disabled={!start}>
          Показать
        </PrimaryButton>
      </form>
    </Sheet>
  );
}
