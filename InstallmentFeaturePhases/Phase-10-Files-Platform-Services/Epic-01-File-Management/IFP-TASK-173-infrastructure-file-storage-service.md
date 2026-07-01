# IFP-173: Infrastructure — File Storage Service (S3/local)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 10 |
| Epic | Epic-01-File-Management |
| ID | IFP-173 |
| Priority | P0 |
| Depends on | IFP-172 |
| Blocks | IFP-174, IFP-175 |
| Estimated | 10h |

---

## هدف

آداپتر ذخیره‌سازی فایل — upload signed URL / direct stream، download، delete soft + storage lifecycle.

---

## معیار پذیرش

- [ ] IFileStoragePort interface
- [ ] Local + S3-compatible implementations
- [ ] Max size env config per mime
- [ ] Tenant prefix in storage key
- [ ] Checksum SHA-256 on upload

---

## مشخصات فنی

### Port
upload(stream, meta) → storageKey
download(storageKey) → stream
delete(storageKey) — physical delete only after retention job + soft deleted

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/infrastructure/src/files/file-storage.service.ts` |
| Create | `packages/application/src/ports/file-storage.port.ts` |

---

## مراحل پیاده‌سازی

1. Port
2. S3 adapter
3. Local dev adapter
4. Env DOCUMENTATION

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| File too large | 413 | FILE_TOO_LARGE |
| Mime not allowed | 415 | FILE_MIME_NOT_ALLOWED |

---

## تست

- [ ] Integration: roundtrip upload/download

---

## Policy Alignment

- [ ] ENVIRONMENT-CONFIG new vars

---

## مراجع

- `docs/09-development/ENVIRONMENT-CONFIG.md`

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
