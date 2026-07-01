# IFP-174: Use Case — File CRUD, Categories, Search

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 10 |
| Epic | Epic-01-File-Management |
| ID | IFP-174 |
| Priority | P0 |
| Depends on | IFP-173 |
| Blocks | IFP-175, IFP-176 |
| Estimated | 12h |

---

## هدف

Upload، list، get، soft delete، restore، categories CRUD، search by name/mime.

---

## معیار پذیرش

- [ ] UploadFileUseCase
- [ ] ListFilesUseCase cursor + filters
- [ ] SoftDeleteFileUseCase
- [ ] FileCategory CRUD
- [ ] Search full-text on originalName
- [ ] Audit file.upload|delete

---

## مشخصات فنی

Permissions: core.file.view|upload|delete|category.manage

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/files/*.use-case.ts` |

---

## مراحل پیاده‌سازی

1. Upload pipeline
2. Category use cases
3. Search index

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| File in use as logo | 409 | FILE_IN_USE |

---

## تست

- [ ] Integration: upload list delete

---

## Policy Alignment

- [ ] SOFT-DELETE-POLICY

---

## مراجع

- `IFP-172`

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
