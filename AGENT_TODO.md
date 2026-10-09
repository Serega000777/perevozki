# Perevozki — дальнейшая работа

Последнее обновление:
Дата: 2026-10-09
Агент: Claude Code (Windows)

## Следующая задача

**Владелец проверяет Mini App в Telegram**: `@perevozki_bot_bot` → «Открыть». Если Telegram
показывает старую ошибку — закрыть Mini App и открыть заново. Если «Доступ запрещён» — Telegram ID
не совпадает с `ADMIN_TELEGRAM_IDS` в `/opt/perevozki/.env`; поправить и в `/opt/perevozki`
выполнить `docker compose -f docker-compose.yml -f infra/docker-compose.proxy.yml up -d backend`.
После подтверждения — решение о переносе боевых данных из Cement (P1).

## P0 — критично (закрыть M1)

- [ ] Вход в Mini App из Telegram с настоящим initData (бот на сервере работает: `getMe` ok, кнопка меню и `/start` выставлены) — подтверждает владелец
- [ ] Проверить Mini App внутри Telegram (iOS/Android): `prompt()`/`confirm()` для правки и удаления работают ли в WebView (в Cement использовались — вероятно да, но в Perevozki не проверено)

## P1 — необходимо

- [ ] Перенос боевых данных техники из Cement CRM — только по команде владельца: `scripts/import-from-cement.sh` в `/opt/perevozki`, `SOURCE_DB_CONTAINER=cement-crm-db-1` (тот же VPS; проверен только на симуляции; прод-БД Perevozki сейчас пустая — скрипт это требует)
- [ ] Бэкапы тома `perevozki_postgres_data` (`pg_dump` по cron)
- [ ] CI (GitHub Actions): `npm ci`, `npm run db:generate`, typecheck, `npm test`, e2e на сервисе Postgres, `npm run build`, `format:check`

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

Нет.

## Требует ручного действия владельца

- [ ] Открыть Mini App из `@perevozki_bot_bot` и сообщить результат
- [ ] Дать команду на перенос боевых данных техники из Cement CRM (и решить, убирать ли потом раздел «Техника» из Cement — это изменение Cement, только с отдельного разрешения)
- [ ] Cement CRM: работает на этом VPS (`/opt/cement-crm`), маршрут `crm-cement.ru` в общем Caddy есть, но DNS `crm-cement.ru` указывает на `31.77.197.107`, а не на `212.113.109.151`; 2026-10-09 из сети владельца `crm-cement.ru` не открывался (HTTPS — TLS-ошибка, HTTP — 503). Если Cement должен открываться по домену — A-записи `crm-cement.ru` и `www` в reg.ru → `212.113.109.151` (решение и действие владельца)
- [ ] Маршрут Perevozki — локальная правка Caddyfile Amola на сервере; если `amola-web-1` пересоздадут из старого образа без `--build`, поддомен пропадёт. Закреплять ли — решает владелец (Amola трогать запрещено)

## Deployment (M4)

Развёрнуто: `https://perevozki.crm-cement.ru`, `/opt/perevozki` — см. [infra/README.md](infra/README.md).
**Amola Finance на том же VPS не трогать** (AGENTS.md).

- [ ] Если Telegram покажет старую сборку — версионный путь в URL кнопки (`/app-<дата>`), как в Cement; nginx отдаёт SPA на любом пути

## Позже

- Водители, ТО, напоминания, документы и фото машин — в источнике нет, только по запросу владельца.
