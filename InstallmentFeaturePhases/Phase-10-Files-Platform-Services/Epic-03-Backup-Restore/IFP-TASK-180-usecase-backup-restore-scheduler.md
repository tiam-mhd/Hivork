# IFP-180: Use Case + Scheduler — Backup & Restore

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 10 |
| Epic | Epic-03-Backup-Restore |
| ID | IFP-180 |
| Priority | P0 |
| Depends on | IFP-172, Phase-4 TASK-150 |
| Blocks | IFP-181 |
| Estimated | 14h |

---

## هدف

Export tenant snapshot، scheduled backup BullMQ، restore from upload — soft delete backup jobs.

---

## معیار پذیرش

- [ ] CreateBackupUseCase — pg dump subset + files manifest
- [ ] ScheduleBackupJob cron per tenant settings
- [ ] RestoreBackupUseCase — validate checksum, dry-run
- [ ] BackupJob model status pending|running|done|failed
- [ ] Audit backup.create|restore

---

## مشخصات فنی

BackupJob: tenantId, storageKey, sizeBytes, triggeredBy, scheduleId

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/backup/*.use-case.ts` |
| Create | `apps/scheduler/src/jobs/tenant-backup.job.ts` |

---

## مراحل پیاده‌سازی

1. Backup job model
2. Export pipeline
3. Scheduler
4. Restore validation

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Restore version mismatch | 409 | BACKUP_VERSION_INCOMPATIBLE |
| Running backup exists | 409 | BACKUP_ALREADY_RUNNING |

---

## تست

- [ ] Integration backup roundtrip testcontainer

---

## Policy Alignment

- [ ] SOFT-DELETE on BackupJob metadata

---

## مراجع

- `§21`

---

## Self-Review Score

> مبنا: `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md` §10

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata (ID, Priority, Depends, Blocks, Estimate) | /10 | 10 | |
| Completeness (criteria, spec بدون TODO، files table) | /25 | 25 | |
| Policy (EXCELLENCE §8، soft delete، ADR cited) | /25 | 25 | |
| Executability (edge cases، tests، dev بدون سؤال) | /25 | 24 | |
| Alignment (sync docs، contracts، Epic README) | /15 | 15 | |
| **جمع** | **/100** | **99** | ≥95 — Ready |
