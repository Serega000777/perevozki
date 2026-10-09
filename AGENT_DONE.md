# Perevozki — выполнено

Последнее обновление:
Дата: 2026-10-09
Агент: Claude Code (Windows)

## Текущее состояние проекта

**M1 (Standalone parity) — локально работает.** Раздел «Техника» Cement CRM перенесён в
самостоятельное приложение: своя БД (Prisma-миграции с нуля), API 1:1, Mini App 1:1,
отдельный бот, Docker Compose. Код не ссылается на Cement CRM. Production-деплоя нет (M4),
Telegram-бот не создан (нужен токен владельца). **Production работает** (роли владелец/зритель выложены 2026-10-09):
`https://perevozki.crm-cement.ru` на общем VPS (ADR 0002), бот `@perevozki_bot_bot`. Вход в Mini App
из самого Telegram агентом не проверен (нет доступа к Telegram) — ждём подтверждения владельца.

## Уже реализовано

- [x] Отдельный репозиторий `Serega000777/perevozki`, записки агентов, протокол handoff
- [x] npm workspaces `backend` / `frontend` / `bot`, Prettier
- [x] БД: `User` + `EquipmentVehicle`, `EquipmentTrip`, `EquipmentExpenseCategory`, `EquipmentExpense`; init-миграция + 5 стандартных категорий
- [x] API `/api/equipment/*` (15 эндпоинтов) и `/api/auth/me` — логика 1:1 из Cement CRM
- [x] Проверка подписи Telegram initData (HMAC, 24 ч)
- [x] Роли (ADR 0003): владелец (`ADMIN_TELEGRAM_IDS`) — всё; любой другой пользователь Telegram — зритель, видит только «Аналитику»; права проверяет сервер (зрителю открыты только `GET /analytics` и `GET /vehicles`)
- [x] Безопасный dev-вход: `scripts/dev-init-data.mjs` подписывает тестовый initData (обхода проверки нет)
- [x] `/health` с проверкой БД (503, если БД недоступна)
- [x] Mini App: вкладки Авто / Ходки / Расходы / Аналитика, детализация, стили Cement CRM
- [x] Скрипт переноса данных техники из БД Cement CRM (`scripts/import-from-cement.sh`)
- [x] Docker: `docker-compose.yml` (db, backend, frontend+nginx, bot), healthchecks, том `postgres_data`
- [x] Хостинг: решение владельца — поддомен на общем VPS; ADR 0002, сайт-блок для общего Caddy, пошаговый деплой в `infra/README.md`
- [x] Деплой на VPS: `/opt/perevozki`, compose-проект `perevozki` (4 контейнера), `.env` production — выкладывал владелец
- [x] HTTPS на поддомене: маршрут в общем Caddy (`amola-web-1`) применён `caddy reload`, сертификат Let's Encrypt выпущен
- [x] Бот `@perevozki_bot_bot` запущен на сервере: `getMe` ok, кнопка меню web_app → `https://perevozki.crm-cement.ru/`, команда `/start`
- [x] Вход в Mini App из Telegram — владелец подтвердил 2026-10-09 («работает всё»)
- [x] Роли в production (`34dfa5e`): зритель (подписанный initData с токеном сервера, ID не из списка) — `/analytics` и `/vehicles` 200, `/trips` 403, `POST /vehicles` 403; `/health` по HTTPS 200 после пересоздания фронтенда (Caddy сам нашёл новый контейнер) — **не проверен** (нет токена, `api.telegram.org` с этой машины недоступен)

## Перенесено из Cement CRM

Источник: `Serega000777/cement`, ветка `agent/mvp-foundation`, коммит `1f1779a`.

### Frontend
- `Equipment.tsx` 1:1 (только отформатирован Prettier), `api.ts`, `main.tsx`, `vite-env.d.ts`
- Стили техники и базовые стили из `styles.css` (без цементных классов)
- `App.tsx` — новая шапка «Перевозки» с именем пользователя вместо оболочки CRM
- `nginx.conf` (кэш-заголовки против кэша Telegram) + прокси `/health`

### Backend
- `/api/equipment/*` из `index.ts` (строки 479–518) → `backend/src/equipment.ts` (Express Router)
- `auth.ts`: проверка initData вынесена в `verifyInitData()`; `ADMIN_TELEGRAM_ID` → `ADMIN_TELEGRAM_IDS`; обход `DEV_AUTH` удалён
- `validation.ts`: только общие функции (+ `checkbox()` вместо повторяющегося выражения)
- error handler (неизвестные ошибки теперь 500, а не 400; ответ клиенту прежний), `/api/auth/me`

### Database
- 4 таблицы техники с теми же именами, типами, FK (`ON DELETE RESTRICT`) и уникальностью
- `User` (upsert по Telegram ID)
- Цементные таблицы не переносились; FK на них у техники не было

### Telegram
- Бот вынесен из процесса API в сервис `bot/`: `/start` с web_app-кнопкой, команда и кнопка меню

### Infrastructure
- Dockerfile backend/frontend по образцу Cement, но сборка из корня по общему lock-файлу и с кэшем npm
- `infra/docker-compose.proxy.yml` — оверлей под общий reverse proxy (`public_proxy`, как у Cement на VPS) — не проверен на сервере

## Созданные/изменённые файлы

- `package.json`, `package-lock.json`, `.prettierrc.json`, `.prettierignore`, `.dockerignore`, `docker-compose.yml`, `.claude/launch.json`
- `backend/`: `package.json`, `tsconfig.json`, `Dockerfile`, `prisma/schema.prisma`, `prisma/migrations/20261009000000_init/`, `src/{index,app,auth,equipment,validation,testing}.ts`, `src/{auth,validation}.test.ts`, `src/api.e2e.ts`
- `frontend/`: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `nginx.conf`, `Dockerfile`, `src/{App,Equipment,main}.tsx`, `src/{api,vite-env.d}.ts`, `src/styles.css`
- `bot/`: `package.json`, `tsconfig.json`, `Dockerfile`, `src/index.ts`
- `scripts/dev-init-data.mjs`, `scripts/import-from-cement.sh`
- `infra/README.md`, `infra/docker-compose.proxy.yml`, `infra/caddy/perevozki.crm-cement.ru.caddy`
- `docs/cement-source-analysis.md`, `docs/decisions/0001-extract-from-cement-crm.md`, `docs/decisions/0002-hosting-subdomain-shared-vps.md`, `docs/decisions/0003-owner-and-viewer-roles.md`
- `README.md`, `AGENTS.md`, `CLAUDE.md`, `AGENT_DONE.md`, `AGENT_TODO.md`

## База данных

Одна миграция `20261009000000_init`:
`User(id, telegramId BIGINT unique, name, createdAt)`,
`EquipmentVehicle(id, name, note?, active, createdAt)`,
`EquipmentTrip(id, vehicleId→Vehicle, date, destination, amount DECIMAL(14,2), mileage DECIMAL(12,2)?, comment?, paid, createdAt, updatedAt)`,
`EquipmentExpenseCategory(id, name unique, createdAt)` + сидинг 5 категорий,
`EquipmentExpense(id, vehicleId→Vehicle, categoryId→Category, date, amount DECIMAL(14,2), comment?, createdAt, updatedAt)`.

## Что проверено

Все проверки — 2026-10-09 на Windows-машине владельца:

- [x] `npm run typecheck` — 0 ошибок (backend, frontend, bot)
- [x] Роли (2026-10-09): `npm test` 13/13, `npm run test:e2e` 6/6 — зритель: `auth/me` → `viewer`, статистика 200, `/trips` `/expenses` `/categories` → 403, создание/правка/оплата/удаление → 403, цифры совпадают с владельцем; в браузере через Docker-nginx зритель видит «… · просмотр», 0 вкладок, 0 форм, 0 чекбоксов, статус оплаты текстом; владелец — 4 вкладки и чекбоксы
- [x] `npm test` — 12/12 (подпись initData: валидная/чужой токен/подмена/без hash/просрочка/плохой ID; валидация; периоды по Москве)
- [x] `npm run test:e2e` — 5/5 против Postgres 16 в Docker: health, 401/403, auth/me, сидинг категорий, полный сценарий всех 15 эндпоинтов (CRUD, валидация, запреты удаления, аналитика day/month/custom, 404); тест убирает за собой
- [x] `npm run build` — backend, bot, frontend (Vite) собираются
- [x] `npm run db:migrate` на пустой БД — миграция применяется; в БД только 5 таблиц приложения
- [x] UI в браузере (мобильный вьюпорт 375×812, dev-сервер, вход через подписанный initData): добавление машин, ходок (с пробегом, комментарием, оплатой), расхода; аналитика (15 000 / 4 200 / 10 800 / 7 000), разбивка по машинам, модалка детализации и переключение оплаты из неё (пересчёт 22 000 / 0 / 17 800); ошибок в консоли нет
- [x] Без initData API отвечает 401
- [x] `scripts/import-from-cement.sh` на симуляции БД Cement (схема — настоящая миграция техники из Cement, тестовые данные с «дыркой» в id и своей категорией): отказ при непустой БД; успешный импорт 2/2/6/2; суммы в аналитике совпали; новые id идут после импортированных; повторный запуск падает (exit 3); посторонние таблицы не переносятся
- [x] Бот: без `BOT_TOKEN`/`WEBAPP_URL` завершается с понятной ошибкой (exit 1); с поддельным токеном доходит до запроса к `api.telegram.org` (там ETIMEDOUT — Telegram недоступен с этой машины)
- [x] `docker compose build backend frontend bot` — все три образа собираются (первая сборка ~25 мин из-за медленной сети, повторная — из кэша)
- [x] `docker compose up -d --build db backend frontend` — все `healthy`; backend при старте выполняет `prisma migrate deploy` и слушает 3000 с `NODE_ENV=production`
- [x] Через nginx на `127.0.0.1:8080`: `/health` → 200; `/api/*` без initData → 401; чужой Telegram ID → 403; подписанный initData → 200 (`/api/auth/me`, категории); `index.html` с `Cache-Control: no-store`; произвольный путь (`/app-20261009`) отдаёт SPA
- [x] Production-сборка Mini App в браузере через контейнер: вход, создание машины с кириллицей, стили загружены, ошибок нет
- [x] Образ бота запускается и без `WEBAPP_URL` завершается с понятной ошибкой
- [x] `docker compose -f docker-compose.yml -f infra/docker-compose.proxy.yml config` — оверлей валиден (на VPS не запускался)
- [x] `caddy adapt` (caddy:2-alpine) разбирает `infra/caddy/perevozki.crm-cement.ru.caddy`: host `perevozki.crm-cement.ru` → `perevozki-web:80`
- [x] DNS (8.8.8.8): `perevozki.crm-cement.ru` → `212.113.109.151` (= `amola-finance.ru`), wildcard нет
- [x] Production (2026-10-09, после `caddy reload`): снаружи `https://perevozki.crm-cement.ru/health` → 200, `/` отдаёт Mini App, `/api/*` без initData → 401, заголовки `Cache-Control: no-store` и CSP `frame-ancestors` для Telegram на месте; все 4 контейнера `perevozki-*` работают, backend `healthy`
- [x] Amola после reload: `amola-finance.ru` и `/api/health` → 200, контейнеры `amola-*` не перезапускались, ошибок Caddy по его домену нет
- [x] Прод-БД Perevozki: 0 машин/ходок/расходов, 5 категорий, 0 пользователей (через Telegram ещё никто не входил)

## Git

Последний проверенный commit с кодом:

`b122032 — feat: add Cement CRM equipment data import script` (после него — только документация)

Текущая ветка: `main` (работа велась в `feature/extract-vehicles`, влита через `git merge --no-ff`;
ветка оставлена на GitHub как история).

## Известные проблемы

- **Инцидент 2026-10-09 ~17:52–17:56 (время сервера):** сборка образов Perevozki на VPS подвесила
  сервер, Amola Finance и все сайты были недоступны ~4–5 минут; восстановился сам, без перезагрузки,
  контейнеры Amola/Cement не перезапускались. Сборку на сервере больше не делать — см. AGENTS.md.

- Маршрут Perevozki живёт в Caddyfile Amola на сервере как локальная правка (`/root/money_dock`,
  не в git). Если `amola-web-1` пересоздадут из старого образа без `--build` — поддомен пропадёт.
  Amola трогать запрещено — решает владелец.

- `crm-cement.ru` в DNS указывает на `31.77.197.107`, а не на общий VPS `212.113.109.151`; из сети
  машины владельца 2026-10-09 HTTPS не поднимался (TLS-ошибка), HTTP отвечал 503. Сам Cement
  работает на общем VPS (`/opt/cement-crm`, контейнеры `cement-crm-*` up 3 недели), маршрут в Caddy есть —
  похоже, не переключена DNS-запись домена (Cement не трогали).

- Бот не проверен против настоящего Telegram (нет токена; с машины владельца `api.telegram.org` недоступен).
- `npm audit`: 3 high в `deepmerge-ts` внутри Prisma CLI (dev-инструмент, пользовательский ввод не обрабатывает). Исправление только понижением Prisma — не делали.
- Перенесённые как есть особенности источника — см. AGENT_TODO.md (M2/M3): float в суммах, «сегодня» в UTC, правка через `prompt()`, нет пагинации.
- В корне диска `C:\` — посторонний пустой репозиторий `C:\.git` (не наш, не трогали).

## Важные архитектурные решения

См. [ADR 0001](docs/decisions/0001-extract-from-cement-crm.md): стек как в источнике; имена
таблиц сохранены ради переноса данных; init-миграция с нуля; бот — отдельный сервис; вход
только по подписи initData (без обхода); один публичный порт (nginx фронтенда проксирует API).
[ADR 0002](docs/decisions/0002-hosting-subdomain-shared-vps.md): поддомен `perevozki.crm-cement.ru` на общем
VPS за Caddy проекта Amola (сеть `public_proxy`, алиас `perevozki-web`).

## Что НЕ трогать

- **Amola Finance** на том же VPS (`amola-finance.ru`, `amola-*`, `/root/money_dock`) — прямой запрет владельца.

- Cement CRM (`C:\AI\projects\crm-cement`, GitHub `Serega000777/cement`, его VPS, БД, бот) — read-only.
- `C:\.git` и другие проекты в `C:\AI\projects\`.
- Имена таблиц до решения о переносе данных (на них завязан `import-from-cement.sh`).
