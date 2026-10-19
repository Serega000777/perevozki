#!/usr/bin/env sh
# Выкладка без сборки на сервере (сборка на VPS 2026-10-09 подвесила его вместе с Amola).
# Образы собираются здесь, переносятся по SSH (docker save | docker load), на сервере только
# пересоздаются контейнеры перечисленных сервисов. Прежний образ остаётся с тегом :previous.
#
#   DEPLOY_SSH=root@<ip> DEPLOY_SSH_KEY=~/.ssh/<ключ> sh scripts/ship-image.sh frontend [backend bot]
#
# Откат на сервере: docker tag perevozki-<сервис>:previous perevozki-<сервис>:latest
#   && docker compose -f docker-compose.yml -f infra/docker-compose.proxy.yml up -d --no-build <сервис>
set -eu

: "${DEPLOY_SSH:?укажите DEPLOY_SSH=root@<ip>}"
[ "$#" -gt 0 ] || { echo "укажите сервисы: frontend backend bot"; exit 1; }
DIR="${DEPLOY_DIR:-/opt/perevozki}"
COMPOSE="docker compose -f docker-compose.yml -f infra/docker-compose.proxy.yml"
remote() { ssh ${DEPLOY_SSH_KEY:+-i "$DEPLOY_SSH_KEY"} -o BatchMode=yes "$DEPLOY_SSH" "$@"; }

images=""
for service in "$@"; do images="$images perevozki-$service"; done

echo "1/4 Сборка здесь:$images"
docker compose build "$@"

echo "2/4 Сервер: git pull, текущие образы → :previous"
remote "cd $DIR && git pull --ff-only -q && git log --oneline -1 && for i in$images; do docker tag \$i:latest \$i:previous 2>/dev/null || true; done"

echo "3/4 Перенос образов"
docker save $images | gzip -1 | remote "gunzip | docker load"

echo "4/4 Пересоздание контейнеров (без сборки)"
remote "cd $DIR && $COMPOSE up -d --no-build $* && $COMPOSE ps"
