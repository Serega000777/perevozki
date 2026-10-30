#!/usr/bin/env bash
set -Eeuo pipefail

# Logical backups of the Perevozki database only. No container or DB mutations.
umask 077

fail() { printf 'BACKUP ERROR: %s\n' "$*" >&2; exit 1; }
require() { command -v "$1" >/dev/null 2>&1 || fail "missing command: $1"; }

require docker
require flock
require sha256sum
require realpath
require find

backup_dir=${BACKUP_DIR:-/var/backups/perevozki/postgresql}
retention_days=${BACKUP_RETENTION_DAYS:-14}
[[ $backup_dir == /* ]] || fail 'BACKUP_DIR must be an absolute path'
[[ $retention_days =~ ^[0-9]+$ ]] && (( retention_days >= 1 && retention_days <= 3650 )) || fail 'BACKUP_RETENTION_DAYS must be an integer from 1 to 3650'

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)
backup_dir=$(realpath -m -- "$backup_dir")
[[ $backup_dir != / && $backup_dir != "$repo_root" && $backup_dir != "$repo_root/"* ]] || fail 'BACKUP_DIR cannot be the repository or filesystem root'
[[ $backup_dir != /var/lib/docker && $backup_dir != /var/lib/docker/* ]] || fail 'BACKUP_DIR cannot be inside Docker storage'

if [[ -n ${BACKUP_REQUIRE_MOUNTPOINT:-} ]]; then
  require mountpoint
  mount_path=$(realpath -e -- "$BACKUP_REQUIRE_MOUNTPOINT") || fail 'mountpoint path does not exist'
  [[ $backup_dir == "$mount_path/"* ]] || fail 'BACKUP_DIR must be below BACKUP_REQUIRE_MOUNTPOINT'
  mountpoint -q -- "$mount_path" || fail "backup filesystem is not mounted: $mount_path"
fi

if [[ ! -e $backup_dir ]]; then
  mkdir -p -m 700 -- "$backup_dir"
fi
[[ -d $backup_dir && ! -L $backup_dir ]] || fail 'BACKUP_DIR must be a real directory'
backup_dir=$(realpath -e -- "$backup_dir")
[[ $(stat -c '%a' -- "$backup_dir") == 700 ]] || fail 'BACKUP_DIR must have permissions 0700'

exec 9>"$backup_dir/.backup.lock"
flock -n 9 || fail 'another backup is in progress'

# A SIGKILL/power loss can leave staging directories. After obtaining the
# exclusive lock, remove only abandoned staging directories older than one day.
find "$backup_dir" -mindepth 1 -maxdepth 1 -type d \
  -name '.incomplete-*' -mmin +1440 -exec rm -r -- '{}' + || fail 'stale staging cleanup failed'

partial_dir=''
cleanup() {
  if [[ -n $partial_dir && -d $partial_dir ]]; then
    rm -r -- "$partial_dir"
  fi
}
trap cleanup EXIT

partial_dir=$(mktemp -d "$backup_dir/.incomplete-XXXXXXXX")
archive="$partial_dir/database.dump"

echo 'Starting Perevozki PostgreSQL backup (read-only pg_dump)'
docker compose exec -T db sh -ec 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --compress=6 --no-owner --no-privileges' > "$archive" || fail 'pg_dump failed; incomplete data will not be published'
[[ -s $archive ]] || fail 'pg_dump returned an empty archive'

(cd "$partial_dir" && sha256sum database.dump > database.dump.sha256)
bash "$repo_root/scripts/verify-postgres-backup.sh" "$partial_dir" || fail 'archive verification failed'

stamp=$(date -u +%Y%m%dT%H%M%SZ)
suffix=${partial_dir##*.incomplete-}
published_dir="$backup_dir/perevozki-$stamp-$suffix"
[[ ! -e $published_dir ]] || fail 'backup destination already exists'
mv -T -- "$partial_dir" "$published_dir"
partial_dir=''
echo "Backup published: $published_dir"

# Rotate only completed, named Perevozki backup directories and only after success.
find "$backup_dir" -mindepth 1 -maxdepth 1 -type d \
  -name 'perevozki-????????T??????Z-*' \
  -mmin "+$((retention_days * 1440))" -exec rm -r -- '{}' + || fail 'retention cleanup failed'
echo "Backup complete (retention: $retention_days days)"
