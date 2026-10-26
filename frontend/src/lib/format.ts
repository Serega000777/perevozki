// Форматирование и группировка для списков. Без React — покрыто тестами (format.test.ts).

const rubFormat = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2, minimumFractionDigits: 0 });
export const rub = (value: number | string = 0) => rubFormat.format(Number(value));

const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
export const num = (value: number | string) => numberFormat.format(Number(value));

// Дата в часовом поясе устройства: toISOString() давал бы «вчера» с 00:00 до 03:00 по Москве.
export function todayKey(now = new Date()) {
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

// Сдвиг календарного дня: через полдень UTC, чтобы переход на летнее время не съедал сутки.
export const shiftDay = (key: string, days: number) => new Date(Date.parse(`${key}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
export const shortDate = (key: string) => `${key.slice(8, 10)}.${key.slice(5, 7)}`;

// Сервер хранит календарный день как полдень UTC, поэтому ключ дня — первые 10 символов ISO.
export const dayKey = (iso: string) => iso.slice(0, 10);

export function dayTitle(key: string, today = todayKey()) {
  const date = new Date(`${key}T12:00:00Z`);
  const sameYear = key.slice(0, 4) === today.slice(0, 4);
  const title = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }), timeZone: 'UTC' });
  const weekday = date.toLocaleDateString('ru-RU', { weekday: 'short', timeZone: 'UTC' });
  return key === today ? `Сегодня, ${title}` : `${title}, ${weekday}`;
}

// «19–25 октября», «28 сентября – 4 октября», год — только если он не текущий.
export function rangeTitle(from: string, to: string, today = todayKey()) {
  const date = (key: string, year: boolean) =>
    new Date(`${key}T12:00:00Z`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC' });
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  const year = !sameYear || to.slice(0, 4) !== today.slice(0, 4);
  if (from === to) return date(to, year);
  if (from.slice(0, 7) === to.slice(0, 7)) return `${Number(from.slice(8))}–${date(to, year)}`;
  return `${date(from, !sameYear)} – ${date(to, year)}`;
}

// Клетки календаря месяца «ГГГГ-ММ»: пустые до понедельника, затем ключи дней.
export function monthCells(month: string) {
  const first = `${month}-01`;
  const lead = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  return [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => shiftDay(first, i))];
}
export const shiftMonth = (month: string, by: number) =>
  new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + by, 1)).toISOString().slice(0, 7);

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

// День последней добавленной записи (по id, а не по дате): её удобно выбрать для следующей.
export const lastAddedDay = (rows: Dated[]) => (rows.length ? dayKey(rows.reduce((a, b) => (b.id > a.id ? b : a)).date) : null);

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
