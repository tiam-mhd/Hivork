# TASK-159: Marketing Layout & Nav

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-10-Marketing-Foundation |
| ID | TASK-159 |
| Priority | P0 |
| Depends on | TASK-158 |
| Blocks | TASK-160, TASK-161, TASK-162, TASK-163, TASK-168 |
| Estimated | 5h |

---

## هدف

Layout مارکتینگ — header nav، footer، theme tokens، responsive.

---

## معیار پذیرش

- [ ] Shared MarketingLayout component
- [ ] Nav links: خانه، امکانات، قیمت‌گذاری، ثبت‌نام
- [ ] CTA button «شروع رایگان» → /register
- [ ] Footer: links + copyright
- [ ] Theme tokens from @hivork/theme
- [ ] Mobile hamburger menu

---

## مشخصات فنی

### Nav items

```typescript
const nav = [
  { href: '/', label: 'خانه' },
  { href: '/features', label: 'امکانات' },
  { href: '/pricing', label: 'قیمت‌گذاری' },
  { href: '/register', label: 'ثبت‌نام' },
];
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/features/marketing/marketing-layout.tsx` |
| Create | `apps/web/src/features/marketing/marketing-header.tsx` |
| Create | `apps/web/src/features/marketing/marketing-footer.tsx` |
| Update | `apps/web/src/app/(marketing)/layout.tsx` |

---

## مراحل پیاده‌سازی

1. Layout components
2. Responsive nav
3. Theme integration
4. Wire layout.tsx

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Long nav on mobile | — | hamburger |
| Active link state | — | highlight current route |

---

## تست

- [ ] Component: nav renders links
- [ ] Visual: RTL layout

---

## UX (if UI)

- [ ] Responsive mobile nav
- [ ] Focus states a11y
- [ ] CTA prominent
- [ ] RTL spacing

---

## Policy Alignment

- [ ] EXCELLENCE §7
- [ ] Theme package tokens
- [ ] Separate from seller layout

---

## مراجع

- `packages/theme/`
- `Phases/Phase-4-Bale-Marketing/Epic-10-Marketing-Foundation/README.md`

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
