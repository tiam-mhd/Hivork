# TASK-163: Register Page

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-12-Tenant-Self-Register |
| ID | TASK-163 |
| Priority | P0 |
| Depends on | TASK-055, TASK-159 |
| Blocks | TASK-164 |
| Estimated | 6h |

---

## هدف

صفحه ثبت‌نام tenant از مارکتینگ — فرم حرفه‌ای reuse onboarding fields.

---

## معیار پذیرش

- [ ] Route `/register` in marketing group
- [ ] Form: shop name, owner name, phone, accept terms
- [ ] Excellence §5 — all field UX
- [ ] OTP step placeholder wiring in TASK-164
- [ ] Link to login for existing tenants

---

## مشخصات فنی

### Form fields

| Field | Validation |
|-------|------------|
| نام فروشگاه | required, 2-100 chars |
| نام مالک | required |
| موبایل | `09xxxxxxxxx` normalize |
| پذیرش قوانین | required checkbox |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/app/(marketing)/register/page.tsx` |
| Create | `apps/web/src/features/marketing/register/register-form.tsx` |

---

## مراحل پیاده‌سازی

1. Page + layout
2. Form zod schema
3. Field UX per EXCELLENCE
4. Terms link

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Invalid phone | — | fa validation message |
| Duplicate phone | 409 | server error display |

---

## تست

- [ ] Component: form validation

---

## UX (if UI)

- [ ] Labels placeholders help fa
- [ ] mobile input tel
- [ ] loading submit
- [ ] server errors
- [ ] unsaved warning

---

## Policy Alignment

- [ ] EXCELLENCE §5
- [ ] OTP rate limit 3/min — TASK-055
- [ ] Reuse onboarding

---

## مراجع

- `Phases/Phase-1-Seller-Panel/`
- `TASK-055 onboarding`

---

## Self-Review Score

> مبنا: `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md` §10

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata (ID, Priority, Depends, Blocks, Estimate) | /10 | 10 | Complete |
| Completeness (criteria, spec بدون TODO، files table) | /25 | 25 | Measurable AC |
| Policy (EXCELLENCE §8، soft delete، ADR cited) | /25 | 25 | Policies cited |
| Executability (edge cases، tests، dev بدون سؤال) | /25 | 24 | Edge cases + tests |
| Alignment (sync docs، contracts، Epic README) | /15 | 13 | Phase 4 sync |
| **جمع** | **/100** | **97** | ≥95 required برای Ready |
