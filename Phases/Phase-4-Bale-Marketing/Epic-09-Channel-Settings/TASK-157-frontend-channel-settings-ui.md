# TASK-157: Frontend — Channel Settings UI

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-09-Channel-Settings |
| ID | TASK-157 |
| Priority | P0 |
| Depends on | TASK-156, TASK-114 |
| Blocks | TASK-174 |
| Estimated | 6h |

---

## هدف

صفحه تنظیمات کانال در پنل — فرم ترجیحات بله و یادآورها.

---

## معیار پذیرش

- [ ] Route `/admin/settings/channels`
- [ ] Form: toggle bale, reminder days, daily summary
- [ ] Excellence §5 form + §7 page states
- [ ] Extend TASK-114 reminders page or sibling nav
- [ ] Staff bot connect CTA → generate link

---

## مشخصات فنی

### Form fields

| Field | Type | Help |
|-------|------|------|
| بله فعال | toggle | یادآورها از بازوی بله |
| روزهای قبل سررسید | multi-number | مثلاً ۳ و ۱ |
| خلاصه روزانه | toggle | نیاز به اتصال بازو |
| اتصال بازو | button | → staff link flow |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/app/(seller)/admin/settings/channels/page.tsx` |
| Create | `apps/web/src/features/settings/channel-settings-form.tsx` |

---

## مراحل پیاده‌سازی

1. Page + breadcrumb
2. Form with react-hook-form + zod
3. API wiring
4. Loading/error/empty states
5. RTL

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| No permission | — | no-permission state |
| Save conflict | 409 | version message |
| Network error | — | retry toast |

---

## تست

- [ ] Component: form validation
- [ ] E2E optional: toggle save

---

## UX (if UI)

- [ ] Label + placeholder + help fa
- [ ] Loading skeleton
- [ ] Server error display
- [ ] Unsaved changes warning
- [ ] RTL + mobile
- [ ] a11y labels

---

## Policy Alignment

- [ ] EXCELLENCE §5 form
- [ ] EXCELLENCE §7 page
- [ ] TASK-114 alignment

---

## مراجع

- `Phases/Phase-1-Seller-Panel/Epic-13-Frontend-Admin-Settings/TASK-114-frontend-settings-reminders.md`

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
