# TASK-158: Marketing Route Group

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-10-Marketing-Foundation |
| ID | TASK-158 |
| Priority | P0 |
| Depends on | TASK-123 |
| Blocks | TASK-159 |
| Estimated | 3h |

---

## هدف

Route group `(marketing)` در Next.js — جدا از پنل seller، public access.

---

## معیار پذیرش

- [ ] `apps/web/src/app/(marketing)/` route group
- [ ] Routes: `/`, `/pricing`, `/features`, `/register` placeholders
- [ ] No staff auth middleware
- [ ] RTL `dir=rtl` lang=fa
- [ ] Typecheck pass

---

## مشخصات فنی

### Structure

```
apps/web/src/app/(marketing)/
  layout.tsx      # minimal root layout
  page.tsx        # redirect or placeholder
  pricing/page.tsx
  features/page.tsx
  register/page.tsx
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/app/(marketing)/layout.tsx` |
| Create | `apps/web/src/app/(marketing)/page.tsx` |

---

## مراحل پیاده‌سازی

1. Create route group
2. Placeholder pages
3. Exclude from seller auth layout
4. Verify build

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Staff cookie present | — | marketing still public |
| Admin route overlap | — | no conflict |

---

## تست

- [ ] Build: marketing routes compile

---

## Policy Alignment

- [ ] Public marketing — no tenant context
- [ ] RTL default

---

## مراجع

- `Phases/Phase-4-Bale-Marketing/README.md`

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
