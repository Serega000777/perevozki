import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { groupByDay, groupByVehicle, lastAddedDay, plural, rub, sum } from '../lib/format';
import { expenseDraft, ExpenseForm, expensePayload, newExpense, rememberVehicle, type ExpenseDraft } from './forms';
import type { Category, Expense, Vehicle } from './types';
import { AddButton, PageTitle, Choice, DayGroup, DeleteButton, Empty, ErrorNote, errorText, haptic, MoreButton, PAGE, Row, Sheet } from './ui';

type Filter = number | 'all';

export const recordsLabel = (n: number) => `${n} ${plural(n, ['запись', 'записи', 'записей'])}`;

// Расходы по дням; заголовок строки — категория или машина, в зависимости от того, что уже известно из контекста.
export function ExpenseDays({ expenses, title, onOpen }: { expenses: Expense[]; title: (x: Expense) => string; onOpen?: (x: Expense) => void }) {
  return (
    <div className="ledger">
      {groupByDay(expenses).map(({ day, rows }) => (
        <DayGroup day={day} total={rows.length > 1 ? sum(rows, (x) => x.amount) : undefined} key={day}>
          {rows.map((x) => (
            <Row key={x.id} title={title(x)} meta={x.comment} amount={x.amount} onOpen={onOpen && (() => onOpen(x))} />
          ))}
        </DayGroup>
      ))}
    </div>
  );
}

export function Expenses({
  vehicles,
  expenses,
  categories,
  reload,
}: {
  vehicles: Vehicle[];
  expenses: Expense[];
  categories: Category[];
  reload: () => Promise<void>;
}) {
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [limit, setLimit] = useState(PAGE);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [error, setError] = useState('');

  const filtered = filter === 'all' ? expenses : expenses.filter((x) => x.vehicleId === filter);
  const lastDate = lastAddedDay(expenses);
  const shown = [...filtered].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, limit);
  const groups = filter === 'all' ? groupByVehicle(shown, vehicles) : [{ vehicle: null, rows: shown }];

  const create = async (d: ExpenseDraft) => {
    await api('/equipment/expenses', { method: 'POST', body: JSON.stringify(expensePayload(d)) });
    rememberVehicle(d.vehicleId!);
    haptic();
    await reload();
  };
  const save = async (d: ExpenseDraft) => {
    await api(`/equipment/expenses/${editing!.id}`, { method: 'PATCH', body: JSON.stringify(expensePayload(d)) });
    haptic();
    setEditing(null);
    await reload();
  };
  const remove = async () => {
    try {
      await api(`/equipment/expenses/${editing!.id}`, { method: 'DELETE' });
      setEditing(null);
      await reload();
    } catch (x) {
      setError(errorText(x));
    }
  };

  return (
    <>
      <PageTitle number="03 / Расходы" title="Расходы" description="Каждая трата — у своей машины" />
      <AddButton onClick={() => setCreating(true)} disabled={!vehicles.length || !categories.length}>
        Добавить расход
      </AddButton>
      {(!vehicles.length || !categories.length) && <Empty>Нужны хотя бы одна машина (вкладка «Авто») и одна категория (ниже).</Empty>}
      {creating && (
        <Sheet title="Новый расход" onClose={() => setCreating(false)}>
          <ExpenseForm
            vehicles={vehicles}
            categories={categories}
            initial={newExpense(vehicles, categories)}
            submitLabel="Добавить расход"
            onSubmit={create}
            keepVehicleAndDate
            lastDate={lastDate}
          />
        </Sheet>
      )}

      <section className="block">
        <div className="block-head">
          <h2>История</h2>
          <span className="block-total">
            {recordsLabel(filtered.length)} · {rub(sum(filtered, (x) => x.amount))}
          </span>
        </div>
        {vehicles.length > 1 && (
          <Choice
            options={[{ value: 'all' as Filter, label: 'Все машины' }, ...vehicles.map((v) => ({ value: v.id as Filter, label: v.name }))]}
            value={filter}
            onChange={(v) => {
              setFilter(v);
              setLimit(PAGE);
            }}
          />
        )}
        {!editing && <ErrorNote>{error}</ErrorNote>}
        {!filtered.length && <Empty>Расходов пока нет.</Empty>}
        {groups.map(({ vehicle, rows }) => {
          const all = vehicle ? filtered.filter((x) => x.vehicleId === vehicle.id) : filtered;
          return (
            <div className="vehicle-group" key={vehicle?.id ?? 'one'}>
              {vehicle && (
                <h3 className="vehicle-head">
                  <span>{vehicle.name}</span>
                  <span>
                    {recordsLabel(all.length)} · {rub(sum(all, (x) => x.amount))}
                  </span>
                </h3>
              )}
              <ExpenseDays expenses={rows} title={(x) => x.category.name} onOpen={setEditing} />
            </div>
          );
        })}
        <MoreButton shown={shown.length} total={filtered.length} onMore={() => setLimit((n) => n + PAGE)} />
      </section>

      <Categories categories={categories} expenses={expenses} reload={reload} />

      {editing && (
        <Sheet
          title="Расход"
          onClose={() => {
            setEditing(null);
            setError('');
          }}
        >
          <ExpenseForm
            vehicles={vehicles}
            categories={categories}
            initial={expenseDraft(editing)}
            submitLabel="Сохранить"
            onSubmit={save}
            lastDate={lastDate}
          />
          <DeleteButton label="Удалить расход" onConfirm={remove} />
          <ErrorNote>{error}</ErrorNote>
        </Sheet>
      )}
    </>
  );
}

function Categories({ categories, expenses, reload }: { categories: Category[]; expenses: Expense[]; reload: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api('/equipment/categories', { method: 'POST', body: JSON.stringify({ name: name.trim() }) });
      setName('');
      setError('');
      await reload();
    } catch (x) {
      setError(errorText(x));
    }
  };
  const remove = async (c: Category) => {
    try {
      await api(`/equipment/categories/${c.id}`, { method: 'DELETE' });
      setError('');
      await reload();
    } catch (x) {
      setError(errorText(x));
    }
  };
  return (
    <section className="block">
      <h2>Категории расходов</h2>
      <div className="ledger">
        {categories.map((c) => {
          const used = expenses.filter((x) => x.categoryId === c.id).length;
          return (
            <Row
              key={c.id}
              title={c.name}
              meta={used ? `используется: ${recordsLabel(used)}` : 'не используется'}
              side={!used && <DeleteButton small label="Удалить" onConfirm={() => remove(c)} />}
            />
          );
        })}
      </div>
      <form className="inline-add" onSubmit={add}>
        <input aria-label="Новая категория" placeholder="Новая категория" value={name} maxLength={50} onChange={(e) => setName(e.target.value)} />
        <button className="secondary" disabled={!name.trim()}>
          Добавить
        </button>
      </form>
      <ErrorNote>{error}</ErrorNote>
    </section>
  );
}
