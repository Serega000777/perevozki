#!/usr/bin/env bash
# End-to-end test using only fictional data and an isolated Compose project.
set -Eeuo pipefail

repo_root=$(cd "$(dirname "$0")/.." && pwd -P)
fixture="$repo_root/infra/backup-test-compose.yml"
test_root=$(mktemp -d)
chmod 700 "$test_root"
project="perevozki-backup-test-$$"
compose=(docker compose -p "$project" -f "$fixture")

cleanup() {
  "${compose[@]}" down -v --remove-orphans >/dev/null 2>&1 || true
  rm -r -- "$test_root"
}
trap cleanup EXIT

"${compose[@]}" up -d --wait db
"${compose[@]}" exec -T db psql -X -v ON_ERROR_STOP=1 -U backup_test -d backup_test <<'SQL'
CREATE TABLE public."EquipmentVehicle" (id integer PRIMARY KEY, name text NOT NULL);
CREATE TABLE public."EquipmentTrip" (id integer PRIMARY KEY, "vehicleId" integer REFERENCES public."EquipmentVehicle"(id), amount numeric(14,2) NOT NULL);
INSERT INTO public."EquipmentVehicle" VALUES (1, 'Тестовый КамАЗ'), (2, 'Тестовый МАЗ');
INSERT INTO public."EquipmentTrip" VALUES (1, 1, 12345.67), (2, 2, 90.00);
SQL

backup_dir="$test_root/backups"
mkdir -m 700 "$backup_dir"
COMPOSE_PROJECT_NAME="$project" COMPOSE_FILE="$fixture" \
  BACKUP_DIR="$backup_dir" BACKUP_RETENTION_DAYS=14 \
  bash "$repo_root/scripts/backup-postgres.sh"

sets=("$backup_dir"/perevozki-*)
[[ ${#sets[@]} -eq 1 && -d ${sets[0]} ]] || { echo 'Expected exactly one published backup' >&2; exit 1; }

RESTORE_ASSERT_SQL='SELECT (SELECT count(*) FROM public."EquipmentVehicle") = 2 AND (SELECT sum(amount) FROM public."EquipmentTrip") = 12435.67' \
  bash "$repo_root/scripts/test-postgres-restore.sh" "${sets[0]}"

# A corrupted archive must fail validation, even if its TOC is readable.
mkdir -m 700 "$test_root/corrupted"
cp "${sets[0]}/database.dump" "${sets[0]}/database.dump.sha256" "$test_root/corrupted/"
printf 'tampered\n' >> "$test_root/corrupted/database.dump"
if COMPOSE_PROJECT_NAME="$project" COMPOSE_FILE="$fixture" \
  bash "$repo_root/scripts/verify-postgres-backup.sh" "$test_root/corrupted"; then
  echo 'Corrupted backup was accepted' >&2
  exit 1
fi

# A failed dump must not publish a snapshot, even when a partial file exists.
mkdir -m 700 "$test_root/failed"
if COMPOSE_PROJECT_NAME="$project-missing" COMPOSE_FILE="$fixture" \
  BACKUP_DIR="$test_root/failed" bash "$repo_root/scripts/backup-postgres.sh"; then
  echo 'Expected pg_dump failure' >&2
  exit 1
fi
[[ -z $(find "$test_root/failed" -mindepth 1 -maxdepth 1 -type d -name 'perevozki-*' -print -quit) ]] || {
  echo 'Failed pg_dump published a snapshot' >&2
  exit 1
}

# Rotation is limited to completed backup sets older than the configured age.
mkdir -m 700 "$backup_dir/perevozki-20200101T000000Z-old"
touch -d '20 days ago' "$backup_dir/perevozki-20200101T000000Z-old"
COMPOSE_PROJECT_NAME="$project" COMPOSE_FILE="$fixture" \
  BACKUP_DIR="$backup_dir" BACKUP_RETENTION_DAYS=14 \
  bash "$repo_root/scripts/backup-postgres.sh"
[[ ! -e "$backup_dir/perevozki-20200101T000000Z-old" ]] || { echo 'Retention did not remove expired set' >&2; exit 1; }

echo 'Backup, corruption, failure cleanup, retention, and restore test: PASS'
