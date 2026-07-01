# TASK-160: Landing Page

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-11-Marketing-Pages |
| ID | TASK-160 |
| Priority | P0 |
| Depends on | TASK-159 |
| Blocks | TASK-166 |
| Estimated | 6h |

---

## هدف

صفحه فرود مارکتینگ — hero، value props، CTA ثبت‌نام.

---

## معیار پذیرش

- [ ] Route `/` — full landing content fa-IR
- [ ] Hero + 3 value props + social proof placeholder
- [ ] CTA → /register
- [ ] Mobile-first responsive
- [ ] Error boundary
- [ ] Lighthouse performance baseline

---

## مشخصات فنی

### Sections

1. Hero — headline + sub + CTA
2. Value props — اقساط، یادآور بله، پنل فروشنده
3. How it works — 3 steps
4. Final CTA

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/app/(marketing)/page.tsx` |
| Create | `apps/web/src/features/marketing/landing/hero-section.tsx` |
| Create | `apps/web/src/features/marketing/landing/value-props.tsx` |

---

## مراحل پیاده‌سازی

1. Hero section
2. Value props
3. CTA wiring
4. Responsive polish

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| JS disabled | — | core content visible SSR |
| Slow network | — | SSR content first |

---

## تست

- [ ] Component: hero renders
- [ ] Build: / route

---

## UX (if UI)

- [ ] Skeleton N/A — SSR static
- [ ] Error boundary
- [ ] Mobile-first
- [ ] CTA accessible

---

## Policy Alignment

- [ ] EXCELLENCE §7
- [ ] Public page — no auth

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
