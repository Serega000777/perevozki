# infra — заготовки для VPS (M4, ещё не выполнялось)

Planned — VPS deployment will be configured in a later milestone.
На VPS ничего не разворачивалось; файлы здесь — заготовки, на сервере не проверены.

`docker compose up -d --build` поднимает `db`, `backend`, `frontend`, `bot`. Наружу (на
`127.0.0.1:${HTTP_PORT}`) смотрит только `frontend`: nginx отдаёт Mini App и проксирует
`/api` и `/health` на backend. HTTPS обязателен для Telegram Mini App — его даёт reverse proxy.

## Вариант А — общий reverse proxy на VPS (как у Cement CRM)

Cement CRM на VPS подключает свой фронтенд к внешней Docker-сети `public_proxy`
(`docker-compose.vps.yml` в репозитории Cement, коммит `1f1779a`), а общий прокси
маршрутизирует домен на алиас контейнера. Для Perevozki то же самое:

```bash
docker compose -f docker-compose.yml -f infra/docker-compose.proxy.yml up -d --build
```

и в конфиг общего прокси — маршрут `perevozki.<домен> → perevozki-web:80`.
Конфиг общего прокси живёт вне этого репозитория; менять его — только отдельным этапом.

## Вариант Б — отдельный Caddy на сервере

Если на сервере нет общего прокси: `infra/Caddyfile.example` → `reverse_proxy 127.0.0.1:8080`.

## Чек-лист M4 (выполнять только по команде владельца)

1. DNS A-запись домена/поддомена → IP VPS.
2. `git clone https://github.com/Serega000777/perevozki.git` на VPS, `.env` из `.env.example`
   (`NODE_ENV=production`, сильный `POSTGRES_PASSWORD` без спецсимволов URL, `BOT_TOKEN`,
   `ADMIN_TELEGRAM_IDS`, `APP_URL=https://<домен>`, `WEBAPP_URL=https://<домен>`).
3. `docker compose ... up -d --build`, проверить `curl https://<домен>/health`.
4. Перенос данных из Cement CRM: `scripts/import-from-cement.sh` (см. README).
5. Бэкапы тома `postgres_data` (`pg_dump` по cron) — настроить отдельно.
