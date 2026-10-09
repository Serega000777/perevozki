# ADR 0002 — Хостинг: поддомен на общем VPS

Дата: 2026-10-09 · Статус: принято и развёрнуто 2026-10-09 · Автор: Claude Code (Windows)

## Решение владельца

Perevozki пока живёт на том же VPS и домене, что Cement CRM, — на **поддомене**:
`https://perevozki.crm-cement.ru`.

## Факты (проверено 2026-10-09 без входа на сервер)

- DNS: `perevozki.crm-cement.ru` → `212.113.109.151` (A-запись уже существует; wildcard нет —
  случайные поддомены не резолвятся). Тот же IP у `amola-finance.ru`.
- На `212.113.109.151` порты 80/443 держит Caddy проекта Amola (`money_dock`,
  `infrastructure/docker/docker-compose.prod.yml`, сервис `web`), он же подключён к внешней
  Docker-сети `public_proxy`.
- Cement CRM (`agent/mvp-foundation@1f1779a`, `docker-compose.vps.yml`) рассчитан на этот же
  общий прокси: фронтенд в `public_proxy` с алиасом `cement-crm-web`. В клоне Cement
  `C:\AI\projects\test-app\.deploy-staging\Caddyfile` (2026-09-14) лежит версия Caddyfile Amola
  с дополнительным блоком `crm-cement.ru → cement-crm-web:80`; в git `money_dock` этого блока нет.
- Но `crm-cement.ru` в DNS указывает на `31.77.197.107`; из сети машины владельца HTTPS там не
  поднимается (TLS-ошибка), HTTP отвечает 503. Где фактически работает Cement — надо проверить
  на сервере.

## Схема

```text
Telegram → https://perevozki.crm-cement.ru
   → Caddy (Amola, web, 80/443, Let's Encrypt)   — сайт-блок infra/caddy/perevozki.crm-cement.ru.caddy
   → public_proxy → perevozki-web:80 (nginx фронтенда Perevozki)
        ├─ /        Mini App
        └─ /api, /health → backend:3000 → db (своя БД, том perevozki_postgres_data)
bot (long polling, исходящие запросы к api.telegram.org)
```

## Альтернативы

- **Свой Caddy у Perevozki** — невозможно без второго IP: 80/443 уже заняты Caddy Amola.
- **Путь на домене Cement** (`crm-cement.ru/perevozki`) — отклонено владельцем; к тому же
  потребовал бы `base` во Vite и отдельную маршрутизацию `/api`.
- **Подключение сайт-блока к общему Caddy:**
  1. дописать блок в Caddyfile на сервере руками — быстро, но это расхождение с git `money_dock`
     (так, судя по `.deploy-staging`, сделано для Cement);
  2. один раз добавить в Caddyfile Amola `import /etc/caddy/sites/*.caddy` и смонтировать
     папку — каждый проект кладёт свой файл. Чище, но это изменение проекта `money_dock`.
  Выбор — за владельцем: оба варианта меняют общий прокси, от которого зависит прод Amola.

## Как развёрнуто (2026-10-09)

- Владелец сам склонировал репозиторий в `/opt/perevozki`, заполнил `.env` и поднял стек с
  оверлеем `infra/docker-compose.proxy.yml`; дописал сайт-блок в Caddyfile Amola на сервере
  (вариант 1 — локальная правка, как у Cement).
- Блок не применился: Caddyfile вшит в образ `amola-web`. Агент скопировал файл в контейнер,
  `caddy validate` → `caddy reload` (плавно, без рестарта; Amola проверен — 200, ошибок нет).
- После этого владелец ввёл правило: **Amola Finance на этом VPS не трогать вообще** (см. AGENTS.md).
  Дальнейшие изменения маршрутизации — только через владельца.

## Последствия

- В `.env` на сервере: `APP_URL=WEBAPP_URL=https://perevozki.crm-cement.ru`,
  `NODE_ENV=production`, реальные `BOT_TOKEN` и `ADMIN_TELEGRAM_IDS` (без них backend не стартует).
- Запуск: `docker compose -f docker-compose.yml -f infra/docker-compose.proxy.yml up -d --build`.
- Перезагрузка Caddy Amola затрагивает прод Amola — делать `caddy reload` (без рестарта контейнера)
  и только с подтверждения владельца.
