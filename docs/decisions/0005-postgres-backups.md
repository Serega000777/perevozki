# ADR 0005 — PostgreSQL backups

Date: 2026-10-30. Status: proposed; not deployed.

## Context

Perevozki stores its data in a PostgreSQL 16 Docker named volume. The
`import-from-cement.sh` dump is a one-off, partial source export, not a backup.
The VPS is shared with Amola Finance and Cement CRM, which must not be changed.

## Decision

Use a host-side, read-only `pg_dump -Fc` through **Perevozki's own**
`docker compose exec -T db`. Stage each dump in a private directory; require
nonzero size, SHA-256, TOC verification and a complete decode before atomic
publication. Serialize with `flock`. After success, prune only completed
sets older than configured retention. Run a dedicated daily systemd timer
only after explicit owner approval.

Provide a disposable, network-isolated PostgreSQL 16 restore test on a
development/CI host. Store local backups outside the database volume and
application tree, with offsite encrypted replication configured separately.

## Alternatives

- Copy the Docker volume: requires consistent filesystem snapshots or a stopped
  server; more operational risk and tightly couples recovery to disk layout.
- `pg_basebackup` plus WAL shipping/PITR: gives a lower RPO but requires more
  storage, replication configuration and operational expertise. Revisit when
  recovery objectives justify it.
- Sidecar backup container: convenient scheduling, but changes Compose and
  deployment on the shared VPS. A host systemd timer leaves live Compose
  unchanged until an explicitly approved rollout.

## Limitations

Daily dumps can lose up to approximately one day of changes (RPO).
Restore time grows with database size (RTO must be measured). A local directory
on the same VPS is not offsite protection. Systemd failures must be connected
to active alerting; a successful `pg_restore --file=/dev/null` is not a
substitute for regular isolated full-restore exercises.
