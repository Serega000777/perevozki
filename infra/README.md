# infra — production на общем VPS

Решение и история — [ADR 0002](../docs/decisions/0002-hosting-subdomain-shared-vps.md).

## Что где (состояние на 2026-10-09)

| | |
|---|---|
| URL | `https://perevozki.crm-cement.ru` (DNS A → `212.113.109.151`) |
| Код на сервере | `/opt/perevozki` (клон этого репозитория, ветка `main`) |
| Окружение | `/opt/perevozki/.env` (`chmod 600`, в git не попадает): `NODE_ENV=production`, `APP_URL`/`WEBAPP_URL=https://perevozki.crm-cement.ru`, `HTTP_PORT=8081`, `DB_PORT=5433` |
| Compose-проект | `perevozki`: `db`, `backend`, `frontend`, `bot`; том `perevozki_postgres_data` |
| Бот | `@perevozki_bot_bot`, long polling; кнопка меню «Открыть» → `https://perevozki.crm-cement.ru/` |
| HTTPS | общий Caddy в контейнере **`amola-web-1` (проект Amola)**; сайт-блок `perevozki.crm-cement.ru → perevozki-web:80`, сертификат Let's Encrypt |

| Файл | Зачем |
|---|---|
| `docker-compose.proxy.yml` | оверлей: фронтенд в сеть `public_proxy` с алиасом `perevozki-web` |
| `caddy/perevozki.crm-cement.ru.caddy` | эталон сайт-блока (в общий Caddy уже добавлен) |

## ⚠️ Amola Finance не трогать

На этом же VPS работает прод Amola Finance (`amola-finance.ru`, `amola-*`, `/root/money_dock`).
Владелец запретил его трогать: никаких restart/rebuild/`caddy reload` контейнера `amola-web-1`,
правок `/root/money_dock`. Передеплой Perevozki Caddy не требует: алиас `perevozki-web`
сохраняется при пересоздании нашего фронтенда, а Caddy резолвит имя при новых соединениях
(на практике ещё не проверялось — после передеплоя смотри `/health` по HTTPS).

## Передеплой Perevozki

```bash
cd /opt/perevozki
git pull --ff-only
docker compose -f docker-compose.yml -f infra/docker-compose.proxy.yml up -d --build
docker compose ps
curl -s https://perevozki.crm-cement.ru/health        # {"status":"ok"}
docker compose logs --tail 20 backend bot
```

Миграции БД backend применяет сам при старте. Если сеть медленная — первая сборка идёт долго.

## Как маршрут попал в общий Caddy (2026-10-09)

1. Владелец дописал блок в `/root/money_dock/infrastructure/docker/Caddyfile` на сервере
   (локальное изменение, в git `money_dock` его нет — как и блока `crm-cement.ru`).
2. Caddyfile вшит в образ `amola-web` (`COPY` в Dockerfile), поэтому изменение не применилось и
   поддомен не открывался (TLS-ошибка).
3. Агент скопировал файл в контейнер, проверил `caddy validate` и сделал `caddy reload` (плавно,
   без рестарта). Прежний конфиг: `/root/backups/amola-caddyfile-running-20261009-170940`.

Риски (решает владелец, сами не чиним — это Amola):
- если `amola-web-1` пересоздадут **из старого образа без `--build`**, блок пропадёт до следующей сборки;
- локальная правка Caddyfile в `/root/money_dock` может помешать `git pull` Amola, если Caddyfile
  поменяется в репозитории.

## Откат Perevozki

`docker compose -f docker-compose.yml -f infra/docker-compose.proxy.yml down` (без `-v` — данные
остаются). Маршрут в Caddy без фронтенда просто отдаёт 502 — Amola это не затрагивает.

## Ещё не сделано

- Перенос данных техники из Cement (`scripts/import-from-cement.sh`, контейнер `cement-crm-db-1`
  на этом же VPS) — только по команде владельца.
- Бэкапы тома `perevozki_postgres_data`.
