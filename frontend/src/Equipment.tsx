import { useEffect, useState } from 'react';
import { api } from './api';
import { Analytics } from './equipment/Analytics';
import { Expenses } from './equipment/Expenses';
import { Trips } from './equipment/Trips';
import type { Category, Expense, Trip, Vehicle } from './equipment/types';
import { ErrorNote, errorText } from './equipment/ui';
import { Vehicles } from './equipment/Vehicles';

type Tab = 'trips' | 'expenses' | 'analytics' | 'vehicles';
const tabs: [Tab, string][] = [
  ['trips', 'Ходки'],
  ['expenses', 'Расходы'],
  ['analytics', 'Аналитика'],
  ['vehicles', 'Авто'],
];

// readOnly — зритель: видит только статистику; права всё равно проверяет сервер.
export function Equipment({ readOnly }: { readOnly: boolean }) {
  const [tab, setTab] = useState<Tab>('trips');
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [v, t, e, c] = await Promise.all([
        api<Vehicle[]>('/equipment/vehicles'),
        readOnly ? [] : api<Trip[]>('/equipment/trips'),
        readOnly ? [] : api<Expense[]>('/equipment/expenses'),
        readOnly ? [] : api<Category[]>('/equipment/categories'),
      ]);
      setVehicles(v);
      setTrips(t);
      setExpenses(e);
      setCategories(c);
      setError('');
    } catch (x) {
      setError(errorText(x));
    }
  };
  useEffect(() => {
    load();
  }, []);

  if (!vehicles) return error ? <ErrorNote>{error}</ErrorNote> : <p className="loading">Загружаем…</p>;
  if (readOnly) return <Analytics vehicles={vehicles} readOnly />;
  return (
    <>
      <nav className="equipment-tabs" role="tablist">
        {tabs.map(([key, label]) => (
          <button
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? 'selected' : ''}
            onClick={() => {
              setTab(key);
              window.scrollTo(0, 0);
            }}
            key={key}
          >
            {label}
          </button>
        ))}
      </nav>
      <ErrorNote>{error}</ErrorNote>
      {tab === 'trips' && <Trips vehicles={vehicles} trips={trips} reload={load} />}
      {tab === 'expenses' && <Expenses vehicles={vehicles} expenses={expenses} categories={categories} reload={load} />}
      {tab === 'analytics' && <Analytics vehicles={vehicles} />}
      {tab === 'vehicles' && <Vehicles vehicles={vehicles} trips={trips} expenses={expenses} reload={load} />}
    </>
  );
}
