# Анализ источника: раздел «Техника» в Cement CRM

Дата анализа: 2026-10-09 · Агент: Claude Code (Windows) · Только чтение, Cement CRM не изменялся.

## Где источник

| | |
|---|---|
| GitHub | `Serega000777/cement` (публичный) |
| Проанализированный коммит | `1f1779a` — ветка `agent/mvp-foundation`, 2026-09-14, «ops: add shared-proxy VPS deployment» |
| `main` на GitHub | `9fb4c8c` — только «initialize Cement CRM repository», рабочий код живёт в `agent/mvp-foundation` |
| Локальная папка | `C:\AI\projects\crm-cement` — ветка `agent/mvp-foundation` на `9e0ae40`, **отстаёт на 4 коммита** от GitHub (нет `040ee54 fix: improve equipment workflows and analytics details`, `60c5455`, `dc19513`, `1f1779a`) |
| Production | `https://crm-cement.ru` (по `Caddyfile`/`.env.example`), БД только на VPS — не подключались |

Анализ делался по свежему клону GitHub во временной папке, локальная папка Cement не трогалась.

## Стек Cement CRM

- npm workspaces: `frontend/` + `backend/`, один `package-lock.json` в корне.
- Backend: Node 22, Express 5, Prisma 6 (PostgreSQL 16), Telegraf 4 (бот **внутри процесса API**),
  весь API в одном файле `backend/src/index.ts` (645 строк), тесты `node:test` через `tsx`.
- Frontend: React 19 + Vite 6 + lucide-react (+ chart.js для цементной аналитики), чистый CSS
  `styles.css`, без роутера: состояние `page` в `App.tsx`.
- Docker Compose: `db` (postgres:16-alpine) + `backend` + `frontend` (nginx) + `caddy`;
  вариант `docker-compose.vps.yml` — без своего Caddy, фронтенд подключается к внешней сети
  `public_proxy` с алиасом `cement-crm-web` (общий reverse proxy на VPS).

## Что такое «машины» в Cement CRM

Раздел называется **«Техника»** (`page === 'equipment'`). Это всё, что относится к автопарку:

| Сущность | Таблица | Поля |
|---|---|---|
| Техника (машина) | `EquipmentVehicle` | `id`, `name` (≤100), `note` (госномер/описание, ≤250), `active` (не используется в UI/API), `createdAt` |
| Ходка (рейс) | `EquipmentTrip` | `vehicleId` → Vehicle (RESTRICT), `date`, `destination` (≤250), `amount` Decimal(14,2) ≥0, `mileage` Decimal(12,2)?, `comment`?, `paid` (деньги отданы), `createdAt`, `updatedAt` |
| Категория расхода | `EquipmentExpenseCategory` | `name` unique (≤50); миграция заполняет: Топливо, Ремонт, Запчасти, Зарплата, Прочее |
| Расход | `EquipmentExpense` | `vehicleId` → Vehicle (RESTRICT), `categoryId` → Category (RESTRICT), `date`, `amount` Decimal(14,2) >0, `comment`?, `createdAt`, `updatedAt` |

Миграция: `backend/prisma/migrations/20260801000000_equipment_accounting/migration.sql`.
**Внешних ключей на цементные таблицы нет** — 4 таблицы образуют замкнутую подсистему.

### API (`backend/src/index.ts`, строки 479–518)

| Метод | Путь | Поведение |
|---|---|---|
| GET | `/api/equipment/vehicles` | все машины по имени |
| POST | `/api/equipment/vehicles` | `name` обяз., `note` необяз. |
| PATCH | `/api/equipment/vehicles/:id` | то же |
| DELETE | `/api/equipment/vehicles/:id` | запрет, если есть ходки или расходы |
| GET | `/api/equipment/trips` | все ходки с машиной, по дате ↓ |
| POST/PATCH | `/api/equipment/trips[/:id]` | `vehicleId`, `date` (YYYY-MM-DD), `destination`, `amount` ≥0, `mileage`?, `comment`?, `paid` |
| PATCH | `/api/equipment/trips/:id/paid` | переключить «деньги отданы» |
| DELETE | `/api/equipment/trips/:id` | удалить |
| GET/POST | `/api/equipment/categories` | список / создать |
| DELETE | `/api/equipment/categories/:id` | запрет, если категория используется |
| GET | `/api/equipment/expenses` | все расходы с машиной и категорией |
| POST/PATCH/DELETE | `/api/equipment/expenses[/:id]` | `vehicleId`, `categoryId`, `date`, `amount` >0, `comment`? |
| GET | `/api/equipment/analytics` | `period=day|week|month|custom` (+`from`,`to`), `vehicleId=all|id` → выручка (оплаченные ходки), расходы, прибыль, «не отдали», число ходок, разбивка по машинам, строки ходок и расходов |

### Frontend (`frontend/src/Equipment.tsx`, 62 строки)

Один экран с 4 вкладками (sticky):

1. **Авто** — форма добавления (название, госномер/описание), список, правка через `prompt()`,
   удаление через `confirm()`.
2. **Ходки** — форма (машина, дата, куда ездил, цена, пробег, комментарий, «деньги отданы»),
   история с чекбоксом оплаты, правка через `prompt()`, удаление.
3. **Расходы** — форма (машина, дата, категория, сумма, комментарий), категории (добавить,
   удалить кнопкой или свайпом влево), история, правка суммы/комментария через `prompt()`.
4. **Аналитика** — фильтр по машине, период (день/неделя/месяц/свой), 4 плитки
   (выручка, расходы, прибыль, не отдали), карточки по машинам с полосками доход/расход,
   модальное окно детализации с переключением оплаты ходки.

Вспомогательное: `api.ts` (fetch + заголовок `x-telegram-init-data`), `Field`/`Select`,
haptic feedback Telegram, CSS-классы `equipment-*`, `history`, `detail-*`, `swipe-category` и
базовые стили в `styles.css`.

## Карта зависимостей

```text
Equipment.tsx (4 вкладки)
   │  api.ts → fetch('/api/...', x-telegram-init-data)
   ▼
Express: /api/equipment/*  ── middleware telegramAuth (auth.ts)
   │                         ├─ HMAC-проверка initData по BOT_TOKEN, срок 24 ч
   │                         ├─ ADMIN_TELEGRAM_ID — единственный допустимый пользователь
   │                         └─ DEV_AUTH=true вне production — обход проверки
   │  validation.ts: requiredText, optionalText, positiveInteger, positiveNumber,
   │                 nonNegativeNumber, calendarDate, startOfMoscowPeriod, InputError
   ▼
Prisma: EquipmentVehicle, EquipmentTrip, EquipmentExpenseCategory, EquipmentExpense
   │  (+ User: upsert в GET /api/auth/me — имя пользователя в шапке)
   ▼
PostgreSQL

Telegram: бот (Telegraf, внутри backend) — /start с web_app-кнопкой и кнопка меню,
          URL Mini App с версионным путём /app-<дата> против кэша Telegram.
```

Хранилища файлов, фото и документов у техники **нет**. Водителей, ТО, напоминаний, статусов,
поиска и сортировки (кроме фиксированной) **нет** — в источнике не реализованы.

## Что переносится

| Часть | Решение |
|---|---|
| 4 таблицы техники + сидинг категорий | переносятся 1:1, **имена таблиц сохраняются** (упрощает перенос данных) |
| `User` + `/api/auth/me` | переносится (имя в шапке) |
| `auth.ts` (проверка initData) | переносится; ADMIN_TELEGRAM_ID → список `ADMIN_TELEGRAM_IDS`; `DEV_AUTH`-обход заменён подписанным тестовым initData |
| `validation.ts` | переносятся только общие функции (без бочек, марок цемента, работников) |
| error handler, `/health` | переносятся |
| `Equipment.tsx`, `api.ts`, `Field/Select`, нужные стили | переносятся 1:1 |
| бот | переносится в отдельный сервис `bot/` |
| Dockerfile, nginx.conf, compose | переносятся и адаптируются |

## Что НЕ переносится (цементный бизнес)

Работники, смены и фасовка, бочки и приход цемента, продажи мешков/бетона/сыпучих,
нормы бетона, «Данилова» (`DanilovaReceipt` — приёмка бетона, поле `vehicle` там свободный
текст), расходы предприятия (`Expense`, `ExpenseCategoryOption`), касса и инкассация,
зарплата, финансы, дашборд, `HistoricalBagEntry`, `domain.ts` (расчёт смены).
Поле `ConcreteSale.vehicle` — свободный текст «Автомобиль» в доставке бетона, со
справочником техники не связан.

## Замеченные в источнике особенности (перенесены как есть, см. AGENT_TODO.md)

- Деньги хранятся как `Decimal(14,2)`, но суммы считаются через `Number()` (float).
- `today` на фронтенде считается в UTC — с 00:00 до 03:00 МСК по умолчанию подставляется вчера.
- Правка через `prompt()` не меняет машину/дату/категорию; ошибки части правок не показываются.
- Поле `EquipmentVehicle.active` есть в схеме, но нигде не используется.
- Списки ходок и расходов отдаются целиком, без пагинации.
