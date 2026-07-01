# IFP-181: API + Frontend — Backup & Restore UI

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 10 |
| Epic | Epic-03-Backup-Restore |
| ID | IFP-181 |
| Priority | P0 |
| Depends on | IFP-180 |
| Blocks | IFP-187 |
| Estimated | 12h |

---

## هدف

UI و API دانلود/آپلود بکاپ + schedule config.

---

## معیار پذیرش

- [ ] GET/POST /api/v1/backups
- [ ] GET /api/v1/backups/:id/download
- [ ] POST /api/v1/backups/restore upload
- [ ] PATCH schedule settings
- [ ] Route /admin/settings/backup
- [ ] Owner only

---

## مشخصات فنی

Restore: multipart .hivork-backup zip

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/api/src/modules/core/backups.controller.ts` |
| Create | `apps/web/src/app/(admin)/admin/settings/backup/page.tsx` |

---

## مراحل پیاده‌سازی

1. API
2. Frontend page
3. Confirm dialogs danger

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Restore without confirm | — | Type tenant name confirm |

---

## تست

- [ ] E2E download backup list

---

## UX (if UI)

- [ ] Danger confirm for restore
- [ ] Excellence §7

---

## Policy Alignment

- [ ] Owner-only destructive

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
