# TASK-168: Blog Shell (empty)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-13-SEO-Blog |
| ID | TASK-168 |
| Priority | P1 |
| Depends on | TASK-159 |
| Blocks | — |
| Estimated | 3h |

---

## هدف

Shell صفحه بلاگ — empty state «به‌زودی» بدون پست.

---

## معیار پذیرش

- [ ] Route `/blog`
- [ ] Empty state با پیام به‌زودی
- [ ] Nav link optional or footer
- [ ] Posts deferred — no CMS
- [ ] SEO metadata from TASK-166 pattern

---

## مشخصات فنی

### Page

Empty state component — illustration + «مقالات به‌زودی»

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/app/(marketing)/blog/page.tsx` |
| Create | `apps/web/src/features/marketing/blog/blog-empty-state.tsx` |

---

## مراحل پیاده‌سازی

1. Route + empty state
2. Metadata
3. Nav link optional

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Direct /blog/post/slug | 404 | not implemented |

---

## تست

- [ ] Component: empty state renders

---

## UX (if UI)

- [ ] Empty state illustration
- [ ] RTL
- [ ] Breadcrumb

---

## Policy Alignment

- [ ] Scope: shell only — posts deferred

---

## مراجع

- `Phases/Phase-4-Bale-Marketing/Epic-13-SEO-Blog/README.md`

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
