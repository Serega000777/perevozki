# infra — деплой на VPS (M4, ещё не выполнялся)

Решение: [ADR 0002](../docs/decisions/0002-hosting-subdomain-shared-vps.md) — поддомен
`https://perevozki.crm-cement.ru` на общем VPS `212.113.109.151` за общим Caddy (проект Amola).
На сервере ничего не разворачивалось. **Каждый шаг на сервере — только с подтверждения владельца:**
общий Caddy обслуживает прод Amola.

| Файл | Зачем |
|---|---|
| `docker-compose.proxy.yml` | оверлей: фронтенд в сеть `public_proxy` с алиасом `perevozki-web` |
| `caddy/perevozki.crm-cement.ru.caddy` | сайт-блок для общего Caddy (HTTPS + прокси на `perevozki-web:80`) |

## Порядок выкладки

0. Проверить на сервере (только чтение): `docker ps`, `docker network ls | grep public_proxy`,
   где лежит и как смонтирован Caddyfile контейнера `web` Amola, свободны ли на хосте
   `127.0.0.1:8080` и `127.0.0.1:5433` (иначе задать `HTTP_PORT`/`DB_PORT` в `.env`).
1. DNS: `perevozki.crm-cement.ru A 212.113.109.151` — **уже есть** (проверено 2026-10-09).
2. Код: `git clone https://github.com/Serega000777/perevozki.git` рядом с остальными проектами.
3. `.env` из `.env.example`:
   - `NODE_ENV=production`
   - `POSTGRES_PASSWORD` — `openssl rand -hex 24` (только hex: пароль идёт в URL)
   - `APP_URL=https://perevozki.crm-cement.ru`, `WEBAPP_URL=https://perevozki.crm-cement.ru`
   - `BOT_TOKEN` (@BotFather), `ADMIN_TELEGRAM_IDS` — вписывает владелец, в git/чат не попадают
4. Запуск:

   ```bash
   docker compose -f docker-compose.yml -f infra/docker-compose.proxy.yml up -d --build
   docker compose ps
   ```

5. Общий Caddy: добавить содержимое `caddy/perevozki.crm-cement.ru.caddy` в Caddyfile контейнера
   `web` Amola (как — см. варианты в ADR 0002), проверить и применить без рестарта контейнера:

   ```bash
   docker exec <web-контейнер Amola> caddy validate --config /etc/caddy/Caddyfile
   docker exec <web-контейнер Amola> caddy reload --config /etc/caddy/Caddyfile
   ```

6. Проверка: `curl https://perevozki.crm-cement.ru/health` → `{"status":"ok"}`;
   `https://amola-finance.ru` по-прежнему открывается; логи `docker compose logs bot` —
   «Telegram bot started»; `/start` в боте открывает Mini App.
7. Перенос данных техники из Cement — `scripts/import-from-cement.sh` (контейнер БД Cement
   узнать через `docker ps`), только по команде владельца.
8. Бэкапы тома `perevozki_postgres_data` — настроить отдельно.

## Откат

`docker compose -f docker-compose.yml -f infra/docker-compose.proxy.yml down` (без `-v` — данные
остаются), убрать сайт-блок из Caddyfile и снова `caddy reload`.
