# Perevozki — дальнейшая работа

Последнее обновление:
Дата: 2026-10-09
Агент: Claude Code (Windows)

## Следующая задача

M1 — Standalone parity: перенести раздел «Техника» из Cement CRM (`1f1779a`) в Perevozki
по плану из [`docs/cement-source-analysis.md`](docs/cement-source-analysis.md).

## P0 — критично (M1 — Standalone parity)

- [ ] npm workspaces: `backend/`, `frontend/`, `bot/`
- [ ] Prisma-схема и init-миграция: `User` + 4 таблицы техники (имена как в источнике), сидинг категорий
- [ ] Backend: проверка initData, `/api/auth/me`, `/api/equipment/*` 1:1, error handler, `/health`
- [ ] Frontend: Mini App с экраном «Техника» 1:1
- [ ] Bot: отдельный сервис, `/start` + кнопка меню с Mini App
- [ ] Docker: `docker-compose.yml` (db, backend, frontend, bot), healthchecks, volumes
- [ ] Проверки: typecheck, unit-тесты, API-тесты на реальной БД, сборка, Docker, UI в браузере

## P1 — необходимо

- [ ] Скрипт переноса данных техники из БД Cement CRM в БД Perevozki
- [ ] README: запуск, окружение, БД, тесты, Docker

## P2 — улучшения (M2/M3, только после M1)

- [ ] Денежная арифметика без float
- [ ] «Сегодня» по Москве на фронтенде
- [ ] Правка записей формой вместо `prompt()`, показ ошибок

## Заблокировано

Нет.

## Требует ручного действия владельца

- [ ] Создать Telegram-бота для Perevozki в @BotFather, получить `BOT_TOKEN`
- [ ] Выбрать домен/поддомен для Mini App, настроить DNS
- [ ] Назвать Telegram ID пользователей, которым разрешён вход (`ADMIN_TELEGRAM_IDS`)

## Deployment (M4, отдельный этап — сейчас не выполнять)

- [ ] Подготовить VPS
- [ ] Docker Compose на VPS
- [ ] Reverse proxy + HTTPS
- [ ] Telegram Mini App production URL

## Позже

- Водители, ТО, напоминания, документы и фото машин — в источнике нет, только по запросу владельца.
