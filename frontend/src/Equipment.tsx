import { useEffect, useState, type ReactNode } from 'react';
import { ChartNoAxesColumn, Fuel, RefreshCw, Route, Truck } from 'lucide-react';
import { api } from './api';
import { PageHeader } from './brand';
import { Analytics } from './equipment/Analytics';
import { Expenses } from './equipment/Expenses';
import { Trips } from './equipment/Trips';
import type { Category, Expense, Trip, Vehicle } from './equipment/types';
import { ErrorNote, errorText, Sheet } from './equipment/ui';
import { Vehicles } from './equipment/Vehicles';

export type Me = { name: string; role: 'owner' | 'viewer' };
type Tab = 'vehicles' | 'trips' | 'expenses' | 'analytics';

const tabs: { key: Tab; label: string; icon: ReactNode; subtitle: string }[] = [
  { key: 'vehicles', label: 'Авто', icon: <Truck />, subtitle: 'Ваш автопарк, рейсы, расходы и аналитика в одном месте' },
  { key: 'trips', label: 'Рейсы', icon: <Route />, subtitle: 'Записывайте рейсы и контролируйте доходы' },
  { key: 'expenses', label: 'Расходы', icon: <Fuel />, subtitle: 'Учитывайте расходы и контролируйте затраты по каждой машине' },
  { key: 'analytics', label: 'Аналитика', icon: <ChartNoAxesColumn />, subtitle: 'Смотрите выручку, расходы и эффективность по автопарку и каждой машине' },
];

// Зритель видит только аналитику; права всё равно проверяет сервер.
export function Equipment({ me }: { me: Me }) {
  const readOnly = me.role !== 'owner';
  const [tab, setTab] = useState<Tab>(readOnly ? 'analytics' : 'trips');
  const [menu, setMenu] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

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
      setVersion((n) => n + 1);
    } catch (x) {
      setError(errorText(x));
    }
  };
  useEffect(() => {
    load();
  }, []);

  const open = (key: Tab) => {
    setTab(key);
    setMenu(false);
    window.scrollTo(0, 0);
  };
  const current = tabs.find((t) => t.key === tab)!;

  return (
    <>
      <PageHeader subtitle={current.subtitle} onMenu={() => setMenu(true)} />
      {!readOnly && (
        <nav className="tabs" role="tablist">
          {tabs.map((t) => (
            <button role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'tab on' : 'tab'} onClick={() => open(t.key)} key={t.key}>
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      )}
      <ErrorNote>{error}</ErrorNote>
      {!vehicles ? (
        !error && <p className="loading">Загружаем…</p>
      ) : (
        <>
          {tab === 'vehicles' && <Vehicles vehicles={vehicles} trips={trips} expenses={expenses} reload={load} />}
          {tab === 'trips' && <Trips vehicles={vehicles} trips={trips} reload={load} />}
          {tab === 'expenses' && <Expenses vehicles={vehicles} expenses={expenses} categories={categories} reload={load} />}
          {tab === 'analytics' && <Analytics vehicles={vehicles} readOnly={readOnly} version={version} />}
        </>
      )}
      {menu && (
        <Sheet title="Меню" onClose={() => setMenu(false)}>
          <div className="menu-user">
            <strong>{me.name}</strong>
            <span>{readOnly ? 'Просмотр: только аналитика' : 'Владелец: вносит рейсы и расходы'}</span>
          </div>
          {!readOnly && (
            <div className="menu-list">
              {tabs.map((t) => (
                <button type="button" className={tab === t.key ? 'menu-item on' : 'menu-item'} onClick={() => open(t.key)} key={t.key}>
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className="secondary menu-refresh"
            onClick={() => {
              setMenu(false);
              load();
            }}
          >
            <RefreshCw aria-hidden />
            Обновить данные
          </button>
        </Sheet>
      )}
    </>
  );
}
