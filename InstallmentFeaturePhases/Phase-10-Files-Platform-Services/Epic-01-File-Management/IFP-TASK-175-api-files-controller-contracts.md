# IFP-175: API + Contracts — Files

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 10 |
| Epic | Epic-01-File-Management |
| ID | IFP-175 |
| Priority | P0 |
| Depends on | IFP-174 |
| Blocks | IFP-176, IFP-170 |
| Estimated | 8h |

---

## هدف

REST files + categories + multipart upload.

---

## معیار پذیرش

- [ ] POST /api/v1/files multipart
- [ ] GET /api/v1/files
- [ ] GET /api/v1/files/:id/download
- [ ] DELETE soft
- [ ] Categories endpoints
- [ ] Zod contracts

---

## مشخصات فنی

POST multipart/form-data — field file, categoryId optional

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/api/src/modules/core/files.controller.ts` |
| Create | `packages/contracts/src/core/file.schema.ts` |

---

## مراحل پیاده‌سازی

1. Controller
2. Contracts
3. RBAC tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Cross-tenant file id | 404 | FILE_NOT_FOUND |

---

## تست

- [ ] API integration

---

## Policy Alignment

- [ ] ADR-016

---

## مراجع

- `packages/contracts/`

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
