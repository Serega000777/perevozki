#!/usr/bin/env bash
# Restore a backup in a NEW, network-isolated PostgreSQL container.
# This never connects to or changes the source/production database.
set -Eeuo pipefail

fail() { printf 'RESTORE TEST ERROR: %s\n' "$*" >&2; exit 1; }
[[ $# -eq 1 ]] || fail 'usage: bash scripts/test-postgres-restore.sh /absolute/path/to/backup-directory'
backup_set=$1
[[ -f $backup_set/database.dump ]] || fail 'backup archive not found'

container_id=''
cleanup() {
  if [[ -n $container_id ]]; then
    docker rm -f -v "$container_id" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

# No ports, no shared networks, no bind mounts, no Perevozki volumes.
# PostgreSQL's anonymous data volume is deleted when this container is removed.
container_id=$(docker create --network none \
  -e POSTGRES_USER=restore_test -e POSTGRES_DB=restore_test \
  -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine)
docker start "$container_id" > /dev/null

ready=0
for _ in {1..60}; do
  if docker exec "$container_id" pg_isready -q -U restore_test -d restore_test; then
    ready=1
    break
  fi
  sleep 1
done
[[ $ready == 1 ]] || fail 'temporary PostgreSQL failed to start'

BACKUP_VERIFY_CONTAINER="$container_id" bash "$(dirname "$0")/verify-postgres-backup.sh" "$backup_set"
docker exec -i "$container_id" pg_restore \
  --exit-on-error --single-transaction --no-owner --no-privileges \
  -U restore_test -d restore_test < "$backup_set/database.dump" || fail 'pg_restore failed in temporary database'

# Optional project-specific assertion must return PostgreSQL boolean true.
assert_sql=${RESTORE_ASSERT_SQL:-"SELECT count(*) > 0 FROM pg_catalog.pg_tables WHERE schemaname = 'public'"}
result=$(docker exec "$container_id" psql -X -A -t -v ON_ERROR_STOP=1 \
  -U restore_test -d restore_test -c "$assert_sql") || fail 'restore assertion SQL failed'
[[ $result == t ]] || fail "restore assertion did not return true (result: $result)"

echo 'Restore test passed in a disposable, isolated PostgreSQL 16 database'
