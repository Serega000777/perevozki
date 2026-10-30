#!/usr/bin/env bash
set -Eeuo pipefail

fail() { printf 'VERIFY ERROR: %s\n' "$*" >&2; exit 1; }
[[ $# -eq 1 ]] || fail 'usage: bash scripts/verify-postgres-backup.sh /absolute/path/to/backup-directory'
backup_set=$1
[[ -d $backup_set && -f $backup_set/database.dump && -f $backup_set/database.dump.sha256 ]] || fail 'missing archive or checksum'
[[ -s $backup_set/database.dump ]] || fail 'empty archive'

read -r expected name < "$backup_set/database.dump.sha256" || fail 'invalid checksum file'
[[ $expected =~ ^[[:xdigit:]]{64}$ && $name == database.dump ]] || fail 'unexpected checksum format'
actual=$(sha256sum -- "$backup_set/database.dump")
actual=${actual%% *}
[[ $actual == "$expected" ]] || fail 'SHA-256 checksum mismatch'

# pg_restore checks the TOC and then reads/decompresses all archive content.
# Neither command connects to a database or applies SQL.
if [[ -n ${BACKUP_VERIFY_CONTAINER:-} ]]; then
  docker exec -i "$BACKUP_VERIFY_CONTAINER" pg_restore --list < "$backup_set/database.dump" > /dev/null || fail 'invalid archive TOC'
  docker exec -i "$BACKUP_VERIFY_CONTAINER" pg_restore --file=/dev/null < "$backup_set/database.dump" || fail 'archive data cannot be decoded'
else
  docker compose exec -T db pg_restore --list < "$backup_set/database.dump" > /dev/null || fail 'invalid archive TOC'
  docker compose exec -T db pg_restore --file=/dev/null < "$backup_set/database.dump" || fail 'archive data cannot be decoded'
fi

echo "Verified backup: $backup_set (SHA-256, TOC and complete archive stream)"
