# PostgreSQL backups — Perevozki

> **Not deployed.** All commands in this document that affect the VPS require
> separate approval from the owner. This change only adds code and documentation.
> Do not restart Compose, edit the live database, or touch Amola Finance / Cement CRM.

## What is protected

- `scripts/backup-postgres.sh` calls **pg_dump** for the **Perevozki** database
  via `docker compose exec -T db`; it never writes into the database.
- PostgreSQL 16 custom-format archive (`database.dump`), matching
  `database.dump.sha256`, in a private directory under `BACKUP_DIR`.
- During export: hidden `.incomplete-*` staging directory. The archive must
  be nonempty, have a matching SHA-256 and pass both `pg_restore --list` and
  full `pg_restore --file=/dev/null`. Only then is the entire directory
  atomically renamed to `perevozki-<UTC timestamp>-<random suffix>`.
- Single-writer `flock`; failure has a nonzero exit code and removes the staging
  directory. Rotation runs **only after a verified successful export**.
- Local retention: `BACKUP_RETENTION_DAYS=14` (configurable, 1–3650); deletes
  only completed, specifically named backup directories older than this age.
  It never rotates `.incomplete-*`, unrelated paths, or offsite copies.
- The destination must be an absolute, real, mode-`0700` directory outside the
  repository and Docker's own storage. Defaults to
  `/var/backups/perevozki/postgresql`, **not**
  `perevozki_postgres_data`.

**Important:** `/var/backups` on the same VPS is a separate directory, **not**
independent disaster recovery. A VPS disk failure or compromise may destroy
both the database and these backups. Copy verified backup sets to a separate
storage account/host, ideally with encryption and independent retention.
The logical dump also does not include cluster-wide roles or Docker/Telegram
secrets; save configuration/credentials separately in a secure secrets manager.

## Tests without production data

Run on a development machine or isolated CI runner with Docker Compose v2:

```bash
bash scripts/test-postgres-backup.sh
```

This starts a temporary, network-isolated PostgreSQL 16 **test Compose project**,
inserts fictitious vehicles and trips, runs the real backup script and checks:
successful publication, SHA-256, archive decoding, full restore to a separate
disposable PostgreSQL container, exact restored counts and sums, rejection of a
tampered archive, clean failure when the source DB is absent, and retention.
Test project volumes and containers are removed afterward. **No production
container, named volume, database, network, or VPS access is used.**

Static checks: `bash -n scripts/*postgres*.sh` (and `scripts/test-postgres-backup.sh`).

## Installation on VPS — only after owner approval

1. First inspect existing VPS-side backups and storage capacity; avoid overwriting
   an existing backup schedule. Review the output of
   `docker compose -p perevozki ps` and `df -h` **read-only**, not other projects.
2. Review the code merged into `main` and the exact `/opt/perevozki` checkout.
3. Provision the private storage directory (ideally a separate mounted device):

   ```bash
   sudo install -d -m 0700 /var/backups/perevozki/postgresql
   sudo install -m 0600 infra/perevozki-postgres-backup.env.example /etc/perevozki-postgres-backup.conf
   ```

   Edit the config if using a mounted backup disk. Set
   `BACKUP_REQUIRE_MOUNTPOINT=/mount/path` so an absent mount causes a failure,
   instead of silently filling the VPS root disk.

4. With the owner's permission, install **only** these units:

   ```bash
   sudo install -m 0644 infra/perevozki-postgres-backup.service /etc/systemd/system/
   sudo install -m 0644 infra/perevozki-postgres-backup.timer /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now perevozki-postgres-backup.timer
   ```

   Timer runs daily around **03:20 in the VPS system timezone** (0–10 min jitter).
   `Persistent=true` runs a missed backup after timer resumes. Service is
   `oneshot` with a two-hour timeout, and is **not** enabled by merging code.
   No Compose service, database schema, or existing container is changed.

5. After the owner approves a first live **read-only backup**, run:

   ```bash
   sudo systemctl start perevozki-postgres-backup.service
   sudo systemctl status perevozki-postgres-backup.service
   sudo journalctl -u perevozki-postgres-backup.service -n 80 --no-pager
   sudo systemctl list-timers perevozki-postgres-backup.timer
   ```

   A red/failed service, missing daily success log, no recent backup directory,
   or failed checksum must trigger an alert to the owner. Connect
   `systemctl is-failed perevozki-postgres-backup.service` and freshness checks
   to an external monitoring/alerting service. Journald logs alone do **not**
   notify the owner if nobody monitors them.

The script needs Linux `bash`, `docker compose`, `flock`, `sha256sum`,
`realpath`, `find` and `stat`. The unit runs as root because Docker socket
access is required. Access to private backup files must be limited to root.

## Integrity check and isolated restore test

Inside `/opt/perevozki`, for a chosen completed backup directory:

```bash
sudo bash scripts/verify-postgres-backup.sh /var/backups/perevozki/postgresql/perevozki-YYYYMMDDTHHMMSSZ-RANDOM
```

Verification rereads/decompresses the archive using `pg_restore` **without**
connecting to a database. The default verifier executes `pg_restore` within
the existing Perevozki `db` container, read-only. To avoid any dependency on
running production containers when testing restoration, use:

```bash
sudo bash scripts/test-postgres-restore.sh /var/backups/perevozki/postgresql/perevozki-YYYYMMDDTHHMMSSZ-RANDOM
```

The test creates **its own PostgreSQL 16 container** with `--network none`, no
published ports, no reused volumes or bind mounts. It checks SHA-256, fully
restores the dump in a fresh temporary `restore_test` database, verifies that
public tables exist, then removes the temporary container **and its anonymous
volume**. For application-specific checks, pass `RESTORE_ASSERT_SQL` returning
the PostgreSQL boolean `t`, e.g. a count comparison. Do not run a large archive
restore test on the shared production VPS without separately evaluating CPU,
memory and disk impact; prefer an isolated development/CI host.

## Disaster recovery — manual, requires separate owner approval

1. Stop writes to **Perevozki only** after approval. Never stop Amola/Cement.
2. Select a copied, checksum-verified completed backup set. Determine timestamp,
   schema/application version and any writes that would be lost since then.
3. Provision a **new, empty PostgreSQL 16 database**, ideally on a separate
   restore host. Do **not** restore into the existing `perevozki` database or
   replace its Docker volume. Use a dedicated restore role with the needed rights.
4. After the isolated restore test passes, restore from the backup file to the
   **new** database (example on an authorized restore host with PostgreSQL tools):

   ```bash
   pg_restore --exit-on-error --single-transaction --no-owner --no-privileges \
     --host RESTORE_HOST --username RESTORE_USER --dbname EMPTY_RESTORE_DB \
     /secure/copied-backup/database.dump
   ```

5. Validate row counts for `EquipmentVehicle`, `EquipmentTrip`,
   `EquipmentExpenseCategory`, `EquipmentExpense` and `User`,
   inspect business totals, run application smoke tests against the **new**
   database, then obtain owner sign-off for any traffic cutover. Preserve the
   original DB and backups for rollback. Change only Perevozki configuration
   under a separately authorized deployment plan.

Do **not** run `pg_restore --clean`, `docker compose down -v`,
`docker volume rm`, or `DROP DATABASE` against production as part of this procedure.

## Offsite storage (not activated)

Copy **completed** `perevozki-*` directories and checksums to external storage
using `rclone` (with a `crypt` remote), `restic`, or equivalent, after
separately configuring credentials and granting permission. Example for an
already configured encrypted `rclone` remote:

```bash
rclone copy /var/backups/perevozki/postgresql encrypted-remote:perevozki/postgresql \
  --include 'perevozki-*/**' --exclude '**'
```

Do not use `sync` with deletion against the only remote copy. Configure
independent retention/immutability, monitor upload failures, periodically
download a backup and run `test-postgres-restore.sh` on a separate host.
Never commit backups or remote credentials to GitHub.
