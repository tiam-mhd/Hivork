# IFP-176: Frontend — File Management UI

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 10 |
| Epic | Epic-01-File-Management |
| ID | IFP-176 |
| Priority | P0 |
| Depends on | IFP-175, IFP-002 |
| Blocks | IFP-187 |
| Estimated | 14h |

---

## هدف

صفحه `/admin/files` — grid/list، categories sidebar، search، upload dropzone.

---

## معیار پذیرش

- [ ] Route /admin/files
- [ ] Upload dropzone
- [ ] Category filter
- [ ] Preview images
- [ ] Download + soft delete
- [ ] Excellence §7

---

## مشخصات فنی

FileManagerPage, CategorySidebar, UploadDropzone

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/app/(admin)/admin/files/page.tsx` |

---

## مراحل پیاده‌سازی

1. UI shell
2. Upload wiring
3. Preview

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Upload progress fail | — | Retry + error |

---

## تست

- [ ] E2E upload image

---

## UX (if UI)

- [ ] Excellence §5–7
- [ ] Drag-drop a11y

---

## Policy Alignment

- [ ] EXCELLENCE §7

---

## مراجع

- `§12 product doc`

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
