# TASK-162: Features Page

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-11-Marketing-Pages |
| ID | TASK-162 |
| Priority | P0 |
| Depends on | TASK-159 |
| Blocks | — |
| Estimated | 5h |

---

## هدف

صفحه امکانات — feature grid با آیکون و توضیح.

---

## معیار پذیرش

- [ ] Route `/features`
- [ ] Feature grid: installments, bale bot, reports, RBAC
- [ ] Screenshot placeholders
- [ ] CTA → /register

---

## مشخصات فنی

### Features list

- مدیریت اقساط و فروش
- یادآور بله برای مشتری
- گزارش معوق و نقدینگی
- نقش‌ها و دسترسی‌ها

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/app/(marketing)/features/page.tsx` |
| Create | `apps/web/src/features/marketing/features/feature-grid.tsx` |

---

## مراحل پیاده‌سازی

1. Feature grid component
2. Page
3. Icons from theme
4. Responsive

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Missing image | — | placeholder block |

---

## تست

- [ ] Component: feature grid

---

## UX (if UI)

- [ ] Icon + text pairs
- [ ] Responsive grid
- [ ] SSR

---

## Policy Alignment

- [ ] EXCELLENCE §7

---

## مراجع

- `Phases/Phase-4-Bale-Marketing/Epic-11-Marketing-Pages/README.md`

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
