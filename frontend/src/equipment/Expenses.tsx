import { useState, type FormEvent } from 'react';
import { Coins, FilePlus2, FileText, Tags, Truck } from 'lucide-react';
import { api } from '../api';
import { groupBy, groupByDay, groupByVehicle, lastAddedDay, plural, rub, sum } from '../lib/format';
import { expenseDraft, ExpenseForm, expensePayload, newExpense, rememberVehicle, type ExpenseDraft } from './forms';
import type { Category, Expense, Vehicle } from './types';
import {
  Card,
  CategoryIcon,
  Choice,
  DayGroup,
  DeleteButton,
  Empty,
  ErrorNote,
  errorText,
  haptic,
  IconTile,
  MoreButton,
  PAGE,
  Row,
  SectionHead,
  Sheet,
  Stats,
} from './ui';

type Filter = number | 'all';

export const recordsLabel = (n: number) => `${n} ${plural(n, ['запись', 'записи', 'записей'])}`;

// Расходы по дням: иконка и название категории, комментарий серым; заголовок строки зависит от контекста.
export function ExpenseDays({
  expenses,
  title = (x) => x.category.name,
  onOpen,
}: {
  expenses: Expense[];
  title?: (x: Expense) => string;
  onOpen?: (x: Expense) => void;
}) {
  return (
    <>
      {groupByDay(expenses).map(({ day, rows }) => (
        <DayGroup day={day} total={sum(rows, (x) => x.amount)} key={day}>
          {rows.map((x) => (
            <Row
              key={x.id}
              icon={<CategoryIcon name={x.category.name} />}
              title={title(x)}
              meta={x.comment}
              amount={x.amount}
              onOpen={onOpen && (() => onOpen(x))}
            />
          ))}
        </DayGroup>
      ))}
    </>
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
  const [filter, setFilter] = useState<Filter>('all');
  const [limit, setLimit] = useState(PAGE);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [error, setError] = useState('');

  const filtered = filter === 'all' ? expenses : expenses.filter((x) => x.vehicleId === filter);
  const lastDate = lastAddedDay(expenses);
  const shown = [...filtered].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, limit);
  const groups =
    filter === 'all'
      ? groupByVehicle(shown, vehicles)
      : groupByVehicle(
          shown,
          vehicles.filter((v) => v.id === filter),
        );
  const top = groupBy(
    expenses,
    (x) => x.vehicle.name,
    (x) => Number(x.amount),
  )[0];

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
      <Stats
        items={[
          { icon: <FileText />, value: expenses.length, unit: plural(expenses.length, ['запись', 'записи', 'записей']), sub: 'всего' },
          { icon: <Coins />, value: rub(sum(expenses, (x) => x.amount)), sub: 'все расходы' },
          { icon: <Truck />, value: top ? rub(top.total) : '—', sub: top?.name ?? 'больше всех' },
        ]}
      />

      <Card
        icon={
          <IconTile>
            <FilePlus2 />
          </IconTile>
        }
        title="Новый расход"
      >
        {vehicles.length && categories.length ? (
          <ExpenseForm
            vehicles={vehicles}
            categories={categories}
            initial={newExpense(vehicles, categories)}
            submitLabel="Добавить расход"
            onSubmit={create}
            keepVehicleAndDate
            lastDate={lastDate}
          />
        ) : (
          <Empty>Нужны хотя бы одна машина (вкладка «Авто») и одна категория (ниже).</Empty>
        )}
      </Card>

      <SectionHead title="История расходов" aside={`${recordsLabel(filtered.length)} • ${rub(sum(filtered, (x) => x.amount))}`} />
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
        const all = filtered.filter((x) => x.vehicleId === vehicle.id);
        return (
          <section className="card ledger-card" key={vehicle.id}>
            <div className="ledger-card-head">
              <h3>{vehicle.name}</h3>
              <span>
                {recordsLabel(all.length)} • {rub(sum(all, (x) => x.amount))}
              </span>
            </div>
            <div className="ledger plain">
              <ExpenseDays expenses={rows} onOpen={setEditing} />
            </div>
          </section>
        );
      })}
      <MoreButton shown={shown.length} total={filtered.length} onMore={() => setLimit((n) => n + PAGE)} />

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
    <Card
      icon={
        <IconTile>
          <Tags />
        </IconTile>
      }
      title="Категории расходов"
    >
      <div className="ledger plain">
        {categories.map((c) => {
          const used = expenses.filter((x) => x.categoryId === c.id).length;
          return (
            <Row
              key={c.id}
              icon={<CategoryIcon name={c.name} />}
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
    </Card>
  );
}
