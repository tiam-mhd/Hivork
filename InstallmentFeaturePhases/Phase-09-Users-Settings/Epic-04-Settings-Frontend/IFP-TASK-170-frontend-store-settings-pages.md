# IFP-170: Frontend — Store Settings Pages

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 09 |
| Epic | Epic-04-Settings-Frontend |
| ID | IFP-170 |
| Priority | P0 |
| Depends on | IFP-168, IFP-169, IFP-002, IFP-172 |
| Blocks | IFP-171 |
| Estimated | 16h |

---

## هدف

صفحه `/admin/settings/store` با تب‌های پروفایل، مالی، درگاه، مالیات، ساعت کاری — §۱۴ کامل.

---

## معیار پذیرش

- [ ] Route `/admin/settings/store` with tabs
- [ ] Tab پروفایل: name, logo upload (IFP-172), phone, email, address
- [ ] Tab مالی/درگاه: provider select, merchant fields, sandbox toggle
- [ ] Tab مالیات: enable, rate, inclusive
- [ ] Tab ساعت کاری: weekly grid editor
- [ ] Save per tab or unified save with dirty state
- [ ] Permission core.settings.view|edit
- [ ] Excellence §5–7 complete
- [ ] RTL + Jalali where applicable

---

## مشخصات فنی

### Layout
StoreSettingsPage → Tabs
  ProfileTab | FinancialTab | GatewayTab | TaxTab | HoursTab

Logo: FilePicker → POST files (Phase 10) → store.logoFileId

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/app/(admin)/admin/settings/store/page.tsx` |
| Create | `apps/web/src/features/settings/store/` |

---

## مراحل پیاده‌سازی

1. Shell + tabs
2. Forms per section
3. Wire PATCH API
4. Loading/error states

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Logo upload fail | — | Inline error + retry |
| Read-only user | — | Disabled fields + banner |

---

## تست

- [ ] E2E: update display name
- [ ] Form validation messages FA

---

## UX (if UI)

- [ ] Excellence §5 all fields
- [ ] §7 skeleton, empty N/A, error, no-permission
- [ ] Unsaved navigation warning

---

## Flow (if applicable)

Entry: Settings menu → Store
Steps: edit tab → validate → save → toast
Error: 409/400 inline
Exit: settings persisted + audit

---

## Policy Alignment

- [ ] EXCELLENCE §5–7
- [ ] ADR-005

---

## مراجع

- `docs/01-product/installment-module-features.md §14`

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
