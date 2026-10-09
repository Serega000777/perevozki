# Perevozki — дальнейшая работа

Последнее обновление:
Дата: 2026-10-09
Агент: Claude Code (Windows)

## Следующая задача

**M4: выложить Perevozki на `https://perevozki.crm-cement.ru`** по [infra/README.md](infra/README.md)
(решение — [ADR 0002](docs/decisions/0002-hosting-subdomain-shared-vps.md)) и там же проверить
бота и Mini App в настоящем Telegram. Нужны: подтверждение владельца на вход на VPS и правку
общего Caddy (он обслуживает прод Amola), `BOT_TOKEN` и `ADMIN_TELEGRAM_IDS` в `.env` на сервере.
Пока этого нет — можно браться за M2 (ниже), не трогая поведение.

## P0 — критично (закрыть M1)

- [ ] Проверить бота с настоящим `BOT_TOKEN` на машине/сервере с доступом к `api.telegram.org`: `/start`, кнопка меню, открытие Mini App, вход по initData из Telegram
- [ ] Проверить Mini App внутри Telegram (iOS/Android): `prompt()`/`confirm()` для правки и удаления работают ли в WebView (в Cement использовались — вероятно да, но в Perevozki не проверено)

## P1 — необходимо

- [ ] CI (GitHub Actions): `npm ci`, `npm run db:generate`, typecheck, `npm test`, e2e на сервисе Postgres, `npm run build`, `format:check`
- [ ] Перенос боевых данных из Cement CRM — на VPS по команде владельца: `scripts/import-from-cement.sh` (проверен только на симуляции)
- [ ] Бэкапы БД (`pg_dump` по расписанию) — вместе с M4

## P2 — улучшения

M2 — Cleanup (без изменения поведения):
- [ ] Денежная арифметика без float: суммы в аналитике считаются `Number()` по `Decimal` → Prisma `Decimal`/копейки
- [ ] Сообщение P2002 (дубликат категории) показывается пользователю на английском — заменить на понятный текст
- [ ] Поле `EquipmentVehicle.active` в схеме не используется — решить: архив машин или удалить
- [ ] Решить про переименование таблиц (`Vehicle`, `Trip`, …) — только после переноса боевых данных

M3 — Improvements:
- [ ] «Сегодня» в формах считается в UTC (`toISOString`) — с 00:00 до 03:00 МСК подставляется вчера
- [ ] Правка через `prompt()`: нельзя сменить машину/дату/категорию; часть ошибок не показывается (нет `try/catch` в `edit`/`toggle`) — сделать формы
- [ ] Пагинация/фильтры истории ходок и расходов (сейчас отдаётся всё)
- [ ] Размер бандла 467 КБ (gzip 136 КБ) — проверить tree-shaking `lucide-react`

## Заблокировано

### Проверка бота и Mini App в Telegram
Причина: нет `BOT_TOKEN`; с машины владельца `api.telegram.org` недоступен (ETIMEDOUT).
Что требуется от пользователя: создать бота и положить токен в `.env` на VPS (не в чат и не в git). HTTPS-URL решён: `https://perevozki.crm-cement.ru`.

## Требует ручного действия владельца

- [ ] Создать Telegram-бота для Perevozki в @BotFather → `BOT_TOKEN` (положить в `.env`, не коммитить)
- [ ] Назвать свои Telegram ID для входа → `ADMIN_TELEGRAM_IDS`
- [ ] Подтвердить вход на VPS `212.113.109.151` и выбрать способ подключения сайт-блока к общему Caddy (ADR 0002: дописать в Caddyfile на сервере или `import` через `money_dock`)
- [ ] Уточнить, где сейчас работает Cement CRM: `crm-cement.ru` в DNS → `31.77.197.107`, а не на общий VPS; из сети владельца не открывается (HTTPS — TLS-ошибка, HTTP — 503)
- [ ] Дать команду на перенос боевых данных техники из Cement CRM (и решить, убирать ли потом раздел «Техника» из Cement — это изменение Cement, только с отдельного разрешения)

## Deployment (M4 — каждый шаг на сервере только с подтверждения владельца)

Поддомен `https://perevozki.crm-cement.ru` на общем VPS `212.113.109.151`, пошагово — [infra/README.md](infra/README.md).

- [x] Решение о хостинге (ADR 0002), DNS-запись `perevozki.crm-cement.ru → 212.113.109.151` уже существует
- [ ] Осмотреть сервер (только чтение): контейнеры, сеть `public_proxy`, Caddyfile Amola, свободные порты
- [ ] Клон репозитория и `.env` с `NODE_ENV=production`, `APP_URL`/`WEBAPP_URL=https://perevozki.crm-cement.ru`
- [ ] `docker compose -f docker-compose.yml -f infra/docker-compose.proxy.yml up -d --build`
- [ ] Сайт-блок `infra/caddy/perevozki.crm-cement.ru.caddy` в общий Caddy + `caddy reload`, проверить, что Amola не задет
- [ ] Бот: `/start`, кнопка меню, вход в Mini App из Telegram
- [ ] Если Telegram покажет старую сборку — в Cement помогал версионный путь в URL кнопки (`/app-<дата>`); nginx уже отдаёт SPA на любом пути

## Позже

- Водители, ТО, напоминания, документы и фото машин — в источнике нет, только по запросу владельца.
