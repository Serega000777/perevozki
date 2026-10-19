// Форматирование и группировка для списков. Без React — покрыто тестами (format.test.ts).

const rubFormat = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2, minimumFractionDigits: 0 });
export const rub = (value: number | string = 0) => rubFormat.format(Number(value));

const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
export const num = (value: number | string) => numberFormat.format(Number(value));

// Дата в часовом поясе устройства: toISOString() давал бы «вчера» с 00:00 до 03:00 по Москве.
export function todayKey(now = new Date()) {
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

// Сервер хранит календарный день как полдень UTC, поэтому ключ дня — первые 10 символов ISO.
export const dayKey = (iso: string) => iso.slice(0, 10);

export function dayTitle(key: string, today = todayKey()) {
  const date = new Date(`${key}T12:00:00Z`);
  const sameYear = key.slice(0, 4) === today.slice(0, 4);
  const title = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }), timeZone: 'UTC' });
  const weekday = date.toLocaleDateString('ru-RU', { weekday: 'short', timeZone: 'UTC' });
  return key === today ? `Сегодня, ${title}` : `${title}, ${weekday}`;
}

// «12,5» и «12 000» с телефона → «12.5» и «12000» для сервера.
export const toNumberInput = (value: FormDataEntryValue | null) =>
  String(value ?? '')
    .replace(/\s/g, '')
    .replace(',', '.');

export function plural(n: number, forms: [string, string, string]) {
  const mod10 = n % 10,
    mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

export const sum = <T>(rows: T[], value: (row: T) => number | string) => rows.reduce((total, row) => total + Number(value(row)), 0);

type Dated = { id: number; date: string };

// Дни по убыванию, внутри дня — сначала добавленные позже.
export function groupByDay<T extends Dated>(rows: T[]) {
  const days = new Map<string, T[]>();
  for (const row of [...rows].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)) {
    const key = dayKey(row.date);
    days.set(key, [...(days.get(key) ?? []), row]);
  }
  return [...days].map(([day, items]) => ({ day, rows: items }));
}

// Порядок машин — как в справочнике; машины без записей не показываются.
export function groupByVehicle<T extends { vehicleId: number }, V extends { id: number }>(rows: T[], vehicles: V[]) {
  return vehicles.map((vehicle) => ({ vehicle, rows: rows.filter((row) => row.vehicleId === vehicle.id) })).filter((group) => group.rows.length);
}

// Группы по ключу, самые крупные по сумме — первыми.
export function groupBy<T>(rows: T[], key: (row: T) => string, value: (row: T) => number) {
  const groups = new Map<string, T[]>();
  for (const row of rows) groups.set(key(row), [...(groups.get(key(row)) ?? []), row]);
  return [...groups]
    .map(([name, items]) => ({ name, rows: items, total: sum(items, value) }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'ru'));
}
