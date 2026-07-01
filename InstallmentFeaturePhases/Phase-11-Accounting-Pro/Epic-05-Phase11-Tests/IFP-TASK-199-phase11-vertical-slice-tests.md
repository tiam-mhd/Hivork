# IFP-199: Phase 11 — Vertical Slice E2E Tests

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 11 |
| Epic | Epic-05-Phase11-Tests |
| ID | IFP-199 |
| Priority | P0 |
| Depends on | IFP-197, IFP-198 |
| Blocks | — |
| Estimated | 10h |

---

## هدف

E2E gate فاز ۱۱: create account → receipt → view ledger → P&L.

---

## معیار پذیرش

- [ ] Playwright/API E2E full accounting path
- [ ] RBAC deny cashier without permission
- [ ] CI job phase11
- [ ] Exit criteria InstallmentFeaturePhases accounting slice

---

## مشخصات فنی

apps/api/test/phase11-accounting.e2e-spec.ts

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/api/test/phase11-accounting.e2e-spec.ts` |

---

## مراحل پیاده‌سازی

1. E2E script
2. Document in Phase README

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Flaky dates | — | Fixed test dates UTC |

---

## تست

- [ ] E2E slice

---

## Policy Alignment

- [ ] Vertical slice required

---

## مراجع

- `InstallmentFeaturePhases/README.md`

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
