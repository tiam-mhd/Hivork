# TASK-161: Pricing Page

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-11-Marketing-Pages |
| ID | TASK-161 |
| Priority | P0 |
| Depends on | TASK-159 |
| Blocks | — |
| Estimated | 5h |

---

## هدف

صفحه قیمت‌گذاری — پلن‌ها و FAQ.

---

## معیار پذیرش

- [ ] Route `/pricing`
- [ ] Plan cards — starter/pro (placeholder pricing)
- [ ] Feature comparison table
- [ ] FAQ accordion
- [ ] CTA per plan → /register

---

## مشخصات فنی

### Plans (v1 placeholder)

| Plan | Price | Highlights |
|------|-------|------------|
| استارتر | تماس | تا ۱۰۰ مشتری |
| حرفه‌ای | تماس | نامحدود + بله |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/app/(marketing)/pricing/page.tsx` |
| Create | `apps/web/src/features/marketing/pricing/pricing-cards.tsx` |
| Create | `apps/web/src/features/marketing/pricing/pricing-faq.tsx` |

---

## مراحل پیاده‌سازی

1. Pricing cards
2. FAQ
3. Page assembly
4. Responsive

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| No plans configured | — | show contact CTA |

---

## تست

- [ ] Component: pricing cards render

---

## UX (if UI)

- [ ] Accordion a11y
- [ ] RTL table
- [ ] CTA per card

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
