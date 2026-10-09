# Perevozki — выполнено

Последнее обновление:
Дата: 2026-10-09
Агент: Claude Code (Windows)

## Текущее состояние проекта

**M1 (Standalone parity) — локально работает.** Раздел «Техника» Cement CRM перенесён в
самостоятельное приложение: своя БД (Prisma-миграции с нуля), API 1:1, Mini App 1:1,
отдельный бот, Docker Compose. Код не ссылается на Cement CRM. Production-деплоя нет (M4),
Telegram-бот не создан (нужен токен владельца).

## Уже реализовано

- [x] Отдельный репозиторий `Serega000777/perevozki`, записки агентов, протокол handoff
- [x] npm workspaces `backend` / `frontend` / `bot`, Prettier
- [x] БД: `User` + `EquipmentVehicle`, `EquipmentTrip`, `EquipmentExpenseCategory`, `EquipmentExpense`; init-миграция + 5 стандартных категорий
- [x] API `/api/equipment/*` (15 эндпоинтов) и `/api/auth/me` — логика 1:1 из Cement CRM
- [x] Проверка подписи Telegram initData (HMAC, 24 ч) + белый список `ADMIN_TELEGRAM_IDS`
- [x] Безопасный dev-вход: `scripts/dev-init-data.mjs` подписывает тестовый initData (обхода проверки нет)
- [x] `/health` с проверкой БД (503, если БД недоступна)
- [x] Mini App: вкладки Авто / Ходки / Расходы / Аналитика, детализация, стили Cement CRM
- [x] Скрипт переноса данных техники из БД Cement CRM (`scripts/import-from-cement.sh`)
- [x] Docker: `docker-compose.yml` (db, backend, frontend+nginx, bot), healthchecks, том `postgres_data`
- [ ] Telegram-бот против настоящего Telegram — **не проверен** (нет токена, `api.telegram.org` с этой машины недоступен)

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
- `infra/README.md`, `infra/docker-compose.proxy.yml`, `infra/Caddyfile.example`
- `docs/cement-source-analysis.md`, `docs/decisions/0001-extract-from-cement-crm.md`
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
- [x] `npm test` — 12/12 (подпись initData: валидная/чужой токен/подмена/без hash/просрочка/плохой ID; валидация; периоды по Москве)
- [x] `npm run test:e2e` — 5/5 против Postgres 16 в Docker: health, 401/403, auth/me, сидинг категорий, полный сценарий всех 15 эндпоинтов (CRUD, валидация, запреты удаления, аналитика day/month/custom, 404); тест убирает за собой
- [x] `npm run build` — backend, bot, frontend (Vite) собираются
- [x] `npm run db:migrate` на пустой БД — миграция применяется; в БД только 5 таблиц приложения
- [x] UI в браузере (мобильный вьюпорт 375×812, dev-сервер, вход через подписанный initData): добавление машин, ходок (с пробегом, комментарием, оплатой), расхода; аналитика (15 000 / 4 200 / 10 800 / 7 000), разбивка по машинам, модалка детализации и переключение оплаты из неё (пересчёт 22 000 / 0 / 17 800); ошибок в консоли нет
- [x] Без initData API отвечает 401
- [x] `scripts/import-from-cement.sh` на симуляции БД Cement (схема — настоящая миграция техники из Cement, тестовые данные с «дыркой» в id и своей категорией): отказ при непустой БД; успешный импорт 2/2/6/2; суммы в аналитике совпали; новые id идут после импортированных; повторный запуск падает (exit 3); посторонние таблицы не переносятся
- [x] Бот: без `BOT_TOKEN`/`WEBAPP_URL` завершается с понятной ошибкой (exit 1); с поддельным токеном доходит до запроса к `api.telegram.org` (там ETIMEDOUT — Telegram недоступен с этой машины)
- [ ] Docker: см. раздел ниже

## Git

Ветка работы: `feature/extract-vehicles` → merge в `main`.
Последний рабочий commit: см. `git log --oneline -1` в `main`.

## Известные проблемы

- Бот не проверен против настоящего Telegram (нет токена; с машины владельца `api.telegram.org` недоступен).
- `npm audit`: 3 high в `deepmerge-ts` внутри Prisma CLI (dev-инструмент, пользовательский ввод не обрабатывает). Исправление только понижением Prisma — не делали.
- Перенесённые как есть особенности источника — см. AGENT_TODO.md (M2/M3): float в суммах, «сегодня» в UTC, правка через `prompt()`, нет пагинации.
- В корне диска `C:\` — посторонний пустой репозиторий `C:\.git` (не наш, не трогали).

## Важные архитектурные решения

См. [ADR 0001](docs/decisions/0001-extract-from-cement-crm.md): стек как в источнике; имена
таблиц сохранены ради переноса данных; init-миграция с нуля; бот — отдельный сервис; вход
только по подписи initData (без обхода); один публичный порт (nginx фронтенда проксирует API).

## Что НЕ трогать

- Cement CRM (`C:\AI\projects\crm-cement`, GitHub `Serega000777/cement`, его VPS, БД, бот) — read-only.
- `C:\.git` и другие проекты в `C:\AI\projects\`.
- Имена таблиц до решения о переносе данных (на них завязан `import-from-cement.sh`).
