# IFP-TASK-077: Frontend — Lifecycle Actions & Installment Settings §۱۵

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 04 — Contract Enterprise |
| Epic | Epic-06-Contract-Frontend |
| ID | IFP-TASK-077 |
| Priority | P0 |
| Depends on | IFP-TASK-076, IFP-TASK-075, IFP-TASK-064 |
| Blocks | IFP-078 |
| Estimated | 12h |

---

## هدف

UI برای **عملیات lifecycle قرارداد** (تمدید، کپی، فسخ، بستن، آرشیو) و **صفحه تنظیمات اقساط Enterprise** §۱۵ — modals/wizards + settings form.

---

## معیار پذیرش

- [ ] Action modals on contract detail: extend, copy, terminate, close, archive (each with reason field min 3)
- [ ] Destructive actions: confirm checkbox + typed confirm for terminate
- [ ] Copy wizard: customer/branch override, dates, copy flags
- [ ] Extend modal: new last due date, optional regen schedule
- [ ] Settings page `/settings/installments` extended with §۱۵ sections
- [ ] Sections: فرمول، جریمه، سود، گرد کردن، تعطیلات، تقویم، شماره‌گذاری
- [ ] Contract number preview live from settings
- [ ] Read-only display `contract_number_next_sequence`
- [ ] Form: RHF + Zod `UpdateInstallmentsSettingsSchema` enterprise partial
- [ ] Excellence §5 form checklist complete

---

## مشخصات فنی

### Lifecycle modals → API

| Modal | POST endpoint |
|-------|---------------|
| Extend | `/sales/:id/extend` |
| Copy | `/sales/:id/copy` |
| Terminate | `/sales/:id/terminate` |
| Close | `/sales/:id/close` |
| Archive | `/sales/:id/archive` |

### Settings page sections

```
InstallmentSettingsPage
├── RemindersSection (Phase 1 TASK-114)
├── CalculationFormulaSection
├── PenaltySection (type, rate, grace)
├── InterestSection
├── RoundingSection (mode, unit, example)
├── HolidaysSection (source, custom date list)
├── CalendarSection (display/input mode)
└── NumberingSection (prefix, pad, preview, next seq read-only)
```

### Copy wizard steps

1. Source summary (read-only)
2. Target customer/branch
3. Dates + copy options
4. Confirm → redirect to new contract

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/features/contracts/modals/*.tsx` |
| Create | `apps/web/src/features/settings/installments/EnterpriseSettingsSections.tsx` |
| Update | `apps/web/src/app/(staff)/settings/installments/page.tsx` |
| Create | E2E `contract-lifecycle.spec.ts` |

---

## مراحل پیاده‌سازی

1. Lifecycle action dropdown on IFP-076 header
2. Implement each modal with Zod schemas from IFP-058
3. Wire mutations + invalidate queries
4. Extend settings page with enterprise sections
5. Numbering preview component
6. Custom holidays date picker (Jalali)
7. E2E: extend flow smoke test

---

## Edge Cases & Errors

| سناریو | UX |
|--------|-----|
| INVALID_STATUS_TRANSITION | Persian toast with code |
| PENALTY_RATE_REQUIRED on save settings | Field error |
| Copy success | Redirect new id |
| Terminate confirm cancel | Close modal no op |

---

## تست

- [ ] E2E: terminate with reason — status updates
- [ ] E2E: save penalty settings
- [ ] Component: numbering preview updates on prefix change
- [ ] Component: terminate requires confirm checkbox

---

## UX

- [ ] Excellence §5 — all fields labeled Persian, help text for bps vs percent
- [ ] Excellence §7 — settings page loading/error states
- [ ] a11y: focus trap in modals
- [ ] RTL layout for wizards

---

## Flow

### Terminate flow

```
actions → فسخ → modal reason → confirm checkbox → submit
success → status badge فسخ‌شده
error → toast
```

### Settings flow

```
settings/installments → edit penalty → save PATCH
validation fail → inline errors
success → toast + show updated preview
```

---

## Policy Alignment

- [ ] No financial logic client-side — preview only cosmetic
- [ ] Permission hide actions user cannot run
- [ ] Unsaved warning on settings form

---

## مراجع

- IFP-TASK-075, IFP-TASK-064, IFP-TASK-058
- Phase 1 `TASK-114-frontend-settings-reminders.md`
- `docs/01-product/installment-module-features.md` §۴, §۱۵

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | 10 | 10 |
| Completeness | 25 | 25 |
| Policy | 25 | 25 |
| Executability | 25 | 25 |
| Alignment | 15 | 15 |
| **جمع** | **100** | **100** |
