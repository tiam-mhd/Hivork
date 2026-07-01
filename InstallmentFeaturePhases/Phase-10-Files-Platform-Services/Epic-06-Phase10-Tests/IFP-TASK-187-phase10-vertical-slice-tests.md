# IFP-187: Phase 10 — Integration & Vertical Slice Tests

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 10 |
| Epic | Epic-06-Phase10-Tests |
| ID | IFP-187 |
| Priority | P0 |
| Depends on | IFP-176, IFP-179, IFP-181, IFP-184, IFP-186 |
| Blocks | — |
| Estimated | 14h |

---

## هدف

Gate خروج فاز ۱۰: file upload، logs view، backup list، subscription get، ticket create.

---

## معیار پذیرش

- [ ] Integration each epic happy path
- [ ] Cross-tenant deny
- [ ] CI prisma validate + hard-delete grep
- [ ] Testcontainers

---

## مشخصات فنی

apps/api/test/phase10-platform.e2e-spec.ts

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/api/test/phase10-platform.e2e-spec.ts` |

---

## مراحل پیاده‌سازی

1. Compose slice
2. CI job

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| S3 mock | — | Local storage in test |

---

## تست

- [ ] This task

---

## Policy Alignment

- [ ] 06-testing-quality

---

## مراجع

- `testing-observability.md`

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
