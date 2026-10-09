# Perevozki

Самостоятельный **Telegram Mini App + Telegram-бот для учёта автотехники и перевозок**:
машины, ходки (рейсы) с отметкой оплаты, расходы по категориям и аналитика доходов,
расходов, прибыли и долгов по каждой машине.

Функционал выделен из раздела «Техника» проекта Cement CRM и перенесён 1:1, но Perevozki —
отдельный проект: свой репозиторий, backend, база данных, бот и Docker-деплой. Код Cement CRM
не импортируется и не нужен для запуска.

- Состояние проекта — [AGENT_DONE.md](AGENT_DONE.md), план — [AGENT_TODO.md](AGENT_TODO.md).
- Правила для ИИ-агентов — [AGENTS.md](AGENTS.md).
- Разбор источника — [docs/cement-source-analysis.md](docs/cement-source-analysis.md),
  решения — [docs/decisions/](docs/decisions/).

## Возможности

| Вкладка | Что умеет |
|---|---|
| Авто | добавить машину (название, госномер/описание), переименовать, удалить (если нет ходок/расходов) |
| Ходки | машина, дата, куда ездил, цена, пробег, комментарий, «деньги отданы»; история с переключателем оплаты, правка, удаление |
| Расходы | машина, дата, категория, сумма, комментарий; свои категории (удаление кнопкой или свайпом) |
| Аналитика | фильтр по машине и периоду (день / неделя / месяц / свой); выручка (оплаченные ходки), расходы, прибыль, «не отдали»; разбивка по машинам и детализация |

## Архитектура

```text
Telegram ── bot/ (Telegraf, long polling): /start и кнопка меню ──┐
                                                                  ▼  открывает WEBAPP_URL
frontend/ (React 19 + Vite) — Mini App
     │  fetch /api/* + заголовок x-telegram-init-data
     ▼
nginx (контейнер frontend): SPA + прокси /api и /health → backend:3000
     ▼
backend/ (Node 22, Express 5, Prisma 6)
     │  проверка подписи initData (HMAC по BOT_TOKEN, срок 24 ч) + белый список ADMIN_TELEGRAM_IDS
     ▼
PostgreSQL 16 — своя БД, схема через миграции Prisma
```

## Структура

```text
backend/            API: src/app.ts (Express), src/equipment.ts (маршруты техники),
                    src/auth.ts (initData), src/validation.ts; prisma/ — схема и миграции
frontend/           Mini App: src/Equipment.tsx (экран техники), src/App.tsx, nginx.conf
bot/                Telegram-бот: src/index.ts
scripts/            dev-init-data.mjs — подпись тестового initData;
                    import-from-cement.sh — перенос данных техники из Cement CRM
infra/              заготовки для VPS (reverse proxy), деплой ещё не выполнялся
docs/               анализ источника и ADR
docker-compose.yml  весь стек: db, backend, frontend, bot
```

Миграции лежат в `backend/prisma/migrations` (стандартное место Prisma).

## Требования

- Node.js 22+ и npm 10+
- Docker с Docker Compose v2 (для БД и контейнерного запуска)

## Окружение

Все переменные — в одном файле `.env` в корне (образец — `.env.example`). `.env` в git не
коммитится: репозиторий публичный.

| Переменная | Назначение |
|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | учётка и имя БД (пароль — без спецсимволов URL, например `openssl rand -hex 24`) |
| `DB_PORT` | порт Postgres на `127.0.0.1` (по умолчанию 5433) |
| `DATABASE_URL` | для backend вне Docker; в Docker собирается автоматически |
| `NODE_ENV` | `development` локально; в контейнере backend всегда `production` |
| `PORT` | порт backend вне Docker (по умолчанию 3010) |
| `APP_URL` | публичный origin Mini App (CORS). **Обязателен в production** |
| `ADMIN_TELEGRAM_IDS` | Telegram ID, которым разрешён вход, через запятую. **Обязателен в production** |
| `BOT_TOKEN` | токен бота; им же backend проверяет подпись initData. **Обязателен в production** |
| `WEBAPP_URL` | HTTPS-адрес, который открывает кнопка бота. Обязателен для бота |
| `API_URL` | база API, вшивается в сборку фронтенда (по умолчанию `/api`) |
| `HTTP_PORT` | порт фронтенд-контейнера на `127.0.0.1` (по умолчанию 8080) |

## Локальный запуск (без Docker для кода)

```bash
cp .env.example .env              # заполнить POSTGRES_PASSWORD (и в DATABASE_URL), BOT_TOKEN, ADMIN_TELEGRAM_IDS
npm install
npm run db:generate               # после npm install обязательно: генерирует Prisma Client
docker compose up -d db           # Postgres на 127.0.0.1:5433
npm run db:migrate                # применить миграции
npm run dev                       # backend :3010 + frontend :5180 (Vite проксирует /api)
```

### Вход без Telegram

Проверку подписи initData backend не отключает никогда. Для браузера локально:

```bash
npm run dev:init-data -- --name "Сергей"
```

Скрипт подписывает тестовый initData тем же `BOT_TOKEN`, что в `.env` (локально это может быть
любая строка), и печатает ссылку вида `http://localhost:5180/#tgWebAppData=...`. Открытая в
браузере, она проходит ту же проверку, что и запуск из Telegram. Пользователь должен быть в
`ADMIN_TELEGRAM_IDS` (по умолчанию скрипт берёт первый ID оттуда). Ссылка действует 24 часа.

## База данных и миграции

- Схема: `backend/prisma/schema.prisma` — `User` и четыре таблицы техники
  (`EquipmentVehicle`, `EquipmentTrip`, `EquipmentExpenseCategory`, `EquipmentExpense`).
  Имена таблиц совпадают с Cement CRM — это упрощает перенос данных.
- Init-миграция создаёт таблицы и пять стандартных категорий расходов
  (Топливо, Ремонт, Запчасти, Зарплата, Прочее).
- Применение: `npm run db:migrate` локально; в Docker backend применяет миграции сам при старте.
- Новая миграция: изменить схему, затем в `backend/` —
  `npx dotenv -e ../.env -- prisma migrate dev --name <имя>`.

### Перенос данных из Cement CRM

`scripts/import-from-cement.sh` читает (только `pg_dump`) четыре таблицы техники из БД
Cement CRM и загружает их в Perevozki одной транзакцией. Если в Perevozki уже есть машины,
ходки или расходы — импорт отменяется. Запуск на машине, где работают оба Postgres-контейнера:

```bash
SOURCE_DB_CONTAINER=<контейнер Postgres Cement> SOURCE_DB_USER=cement SOURCE_DB_NAME=cement \
  sh scripts/import-from-cement.sh
```

Дамп сохраняется в `backups/` (в git не попадает).

## Frontend

React 19 + Vite 6, без роутера; весь экран — `frontend/src/Equipment.tsx`.
`npm run dev -w frontend` — dev-сервер на 5180, `npm run build -w frontend` — сборка в
`frontend/dist`. В production nginx отдаёт `index.html` без кэша (Telegram агрессивно кэширует
WebView), а хешированные ассеты — с вечным кэшем.

## Backend

Express 5 + Prisma 6. Все маршруты `/api/*` требуют заголовок `x-telegram-init-data`.

| Метод | Путь |
|---|---|
| GET | `/health` (без авторизации, проверяет БД) |
| GET | `/api/auth/me` |
| GET, POST | `/api/equipment/vehicles` · PATCH, DELETE `/api/equipment/vehicles/:id` |
| GET, POST | `/api/equipment/trips` · PATCH, DELETE `/api/equipment/trips/:id` · PATCH `/api/equipment/trips/:id/paid` |
| GET, POST | `/api/equipment/categories` · DELETE `/api/equipment/categories/:id` |
| GET, POST | `/api/equipment/expenses` · PATCH, DELETE `/api/equipment/expenses/:id` |
| GET | `/api/equipment/analytics?period=day\|week\|month\|custom&from=&to=&vehicleId=all\|<id>` |

Ошибки — `{ "error": "текст" }`; в production внутренние ошибки скрываются.

## Telegram

1. Создать бота в @BotFather, токен → `BOT_TOKEN`.
2. Mini App должен открываться по HTTPS: `WEBAPP_URL=https://<домен>` (обычно = `APP_URL`).
3. Свои Telegram ID → `ADMIN_TELEGRAM_IDS` (узнать можно у @userinfobot).
4. Бот (`bot/`) при старте ставит команду `/start` и кнопку меню «Открыть», на `/start`
   отвечает кнопкой Mini App. Работает через long polling — входящий вебхук не нужен, но
   серверу нужен доступ к `api.telegram.org`.

## Docker

```bash
docker compose up -d --build                         # весь стек
docker compose up -d --build db backend frontend     # без бота (нет BOT_TOKEN/WEBAPP_URL)
docker compose ps
curl http://127.0.0.1:8080/health
docker compose logs -f backend
```

- Порты слушают только `127.0.0.1`: снаружи доступ — через reverse proxy (см. `infra/`).
- Данные Postgres — в томе `postgres_data`.
- Образы собираются из корня репозитория по общему `package-lock.json`.

## Тестирование

```bash
npm run typecheck        # TypeScript во всех пакетах
npm test                 # unit: подпись initData, валидация
npm run test:e2e         # API против реальной БД (DATABASE_URL из .env, миграции применены)
npm run build            # сборка backend, frontend, bot
npm run format:check     # Prettier
```

e2e-тесты создают записи с уникальными именами и удаляют их после себя, поэтому их можно
гонять на локальной dev-БД.

## Deployment

Planned — VPS deployment will be configured in a later milestone.
Заготовки и чек-лист — [infra/README.md](infra/README.md).
