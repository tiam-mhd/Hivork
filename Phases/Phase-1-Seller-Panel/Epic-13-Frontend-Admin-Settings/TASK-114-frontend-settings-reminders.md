# TASK-114: Frontend — Settings Reminders

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-13-Frontend-Admin-Settings |
| ID | TASK-114 |
| Priority | P0 |
| Depends on | TASK-106, TASK-107, TASK-108, TASK-109, TASK-082, TASK-071 |
| Blocks | TASK-123 |
| Estimated | 8h |

---

## هدف

صفحه تنظیمات یادآور اقساط در پنل admin — ویرایش schema settings ماژول installments در سطح tenant — با فرم کامل فارسی، validation Zod، و ذخیره از طریق PATCH API. SF-009 در STAFF-FLOWS.

---

## معیار پذیرش

- [ ] Route `/admin/settings/reminders` با breadcrumb: تنظیمات → یادآورها
- [ ] Permission guard UI: **`installments.reminder.configure`** (نه `core.settings.edit`)
- [ ] فرم با ۵ فیلد schema: `daysBefore[]`, `onDueDate`, `overdueDays[]`, `sendTime`, `channels[]`
- [ ] Load: `GET /api/v1/settings?module=installments` — populate form
- [ ] Save: `PATCH /api/v1/settings/installments` — partial update
- [ ] Info banner: «تنظیمات branch-level در Phase 1 پشتیبانی نمی‌شود — tenant-level only»
- [ ] Excellence §5 form checklist — همه موارد
- [ ] Excellence §7 page states: loading, empty (N/A), error, no-permission
- [ ] Success toast: «تغییرات از فردا اعمال می‌شود»
- [ ] RTL + mobile input types صحیح

---

## مشخصات فنی

### Route & Layout

```
apps/web/src/app/(admin)/admin/settings/reminders/page.tsx
```

- داخل `(admin)` layout از TASK-107
- Sidebar: تنظیمات → یادآورها (visible if `installments.reminder.configure`)

### Permission (تصمیم نهایی)

| Permission | استفاده |
|------------|---------|
| **`installments.reminder.configure`** | ✅ **این صفحه** — owner + manager (rbac.md matrix) |
| `core.settings.edit` | ❌ **نه این صفحه** — مخصوص core tenant settings (`timezone`, `display_currency`) در `/admin/settings/general` (خارج از scope Phase 1) |

Backend guard روی PATCH: `@RequirePermission('installments.reminder.configure')` + `@RequireModule('installments')`.

### Schema Field Mapping

| UI Label (fa) | Schema Key | Type | Default | Validation |
|---------------|------------|------|---------|------------|
| روزهای قبل از سررسید | `reminder_days_before` | `int[]` multi-select | `[3, 1]` | each 0–30, unique, sorted desc |
| ارسال در روز سررسید | `reminder_on_due_date` | boolean toggle | `true` | — |
| روزهای بعد از سررسید (معوق) | `overdue_escalation_days` | `int[]` multi-select | `[1, 3, 7]` | each 1–30, unique, sorted asc |
| ساعت ارسال | `reminder_time` | time picker | `09:00` | HH:mm, timezone Asia/Tehran |
| کانال‌های یادآور | `default_reminder_channels` | enum[] multi-select | `['telegram']` | values: `telegram`, `bale`, `sms` |

Zod schema: `@hivork/contracts/installments/settings.schema.ts` (TASK-071).

### API Integration

**Load:**
```http
GET /api/v1/settings?module=installments
Authorization: Bearer {staffToken}
```

**Save:**
```http
PATCH /api/v1/settings/installments
Authorization: Bearer {staffToken}
Content-Type: application/json

{
  "reminder_days_before": [3, 1],
  "reminder_on_due_date": true,
  "overdue_escalation_days": [1, 3, 7],
  "reminder_time": "09:00",
  "default_reminder_channels": ["telegram"]
}
```

Response `200`:
```json
{
  "installments": {
    "reminder_days_before": [3, 1],
    "reminder_on_due_date": true,
    "overdue_escalation_days": [1, 3, 7],
    "reminder_time": "09:00",
    "default_reminder_channels": ["telegram"]
  },
  "updatedAt": "2025-06-29T10:00:00.000Z"
}
```

### Branch Override Note (Future)

```
┌─────────────────────────────────────────────────────────┐
│ ℹ️ تنظیمات یادآور در سطح tenant اعمال می‌شود.          │
│    override شعبه‌ای در نسخه‌های بعدی اضافه می‌شود.     │
└─────────────────────────────────────────────────────────┘
```

Phase 1: **tenant-level only** — no branch selector.

### Component Structure

```
RemindersSettingsPage
├── PageHeader (breadcrumb, title, description)
├── BranchOverrideInfoBanner
├── RemindersSettingsForm
│   ├── DaysBeforeMultiSelect
│   ├── OnDueDateToggle
│   ├── OverdueDaysMultiSelect
│   ├── SendTimePicker (Jalali-aware display, stores HH:mm)
│   ├── ChannelsMultiSelect
│   └── FormActions (ذخیره, بازنشانی)
└── PageStates (loading skeleton, error retry, no-permission)
```

### Form Implementation

- React Hook Form + Zod resolver from contracts
- `useMutation` for PATCH — invalidate `['settings', 'installments']` query
- Unsaved changes: `beforeunload` + Next.js router guard
- Server errors mapped per field via `setError()`

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/app/(admin)/admin/settings/reminders/page.tsx` |
| Create | `apps/web/src/features/settings/reminders/reminders-settings-form.tsx` |
| Create | `apps/web/src/features/settings/reminders/use-reminders-settings.ts` |
| Create | `apps/web/src/features/settings/reminders/reminders-settings.schema.ts` (re-export contracts) |
| Update | `apps/web/src/components/layout/admin-sidebar.tsx` — menu item |
| Update | `apps/web/src/lib/permissions.ts` — `canConfigureReminders()` |

---

## مراحل پیاده‌سازی

1. ایجاد route + page shell با PageHeader و breadcrumb
2. Hook `useRemindersSettings`: GET on mount, React Query cache
3. فرم با ۵ فیلد — multi-select options از constants
4. PATCH mutation + success toast + form reset to saved values
5. Permission gate: redirect یا NoPermission state
6. Info banner branch override
7. Page states: skeleton, error retry, no-permission
8. Sidebar menu item با permission check
9. Manual test: owner save, manager save, cashier → no access

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار UI |
|--------|-------------|----------|
| بدون permission | 403 `PERMISSION_DENIED` | NoPermission page — «با مدیر تماس بگیرید» |
| Module disabled | 403 `MODULE_NOT_ENABLED` | Banner — ماژول اقساط فعال نیست |
| Validation: days empty array | 400 `VALIDATION_ERROR` | Inline: «حداقل یک روز انتخاب کنید» |
| Validation: invalid time | 400 | Inline: «فرمت ساعت نامعتبر» |
| Network error | — | Toast + retry button |
| Concurrent edit | 409 `VERSION_CONFLICT` | Toast — reload settings |
| Tenant suspended | 403 `TENANT_SUSPENDED` | Full-page blocked state |

---

## تست

- [ ] Unit: Zod schema validation — days range, channels enum
- [ ] Component: form submit calls PATCH with correct payload
- [ ] Component: no-permission renders explain message
- [ ] Integration (optional): mock API — load + save roundtrip

---

## UX

### Form — Excellence §5 Checklist

- [ ] Label (fa) برای هر فیلد
- [ ] Placeholder where applicable (time picker)
- [ ] Help text: «روزهای قبل — چند روز قبل از سررسید پیام ارسال شود»
- [ ] Help text: «کانال SMS در Phase 2 فعال می‌شود» (if sms selected — info only)
- [ ] Validation message (fa) — client + server sync
- [ ] Required indicator on multi-selects (min 1 item when applicable)
- [ ] Disabled state: submit during loading
- [ ] React Hook Form + Zod from `@hivork/contracts`
- [ ] Submit loading — disable double submit
- [ ] Server error mapping per field
- [ ] Unsaved changes warning
- [ ] Success toast + values persisted
- [ ] Reset button — revert to last saved
- [ ] Keyboard: Enter submit, Esc close (N/A — full page)
- [ ] Mobile: correct input types
- [ ] RTL: labels, errors aligned right
- [ ] Accessibility: `aria-invalid`, `aria-describedby` on errors

### Page — Excellence §7 Checklist

- [ ] Breadcrumb: خانه → تنظیمات → یادآورها
- [ ] Page title: «تنظیمات یادآور»
- [ ] Description subtitle
- [ ] Loading: form skeleton (5 fields)
- [ ] Error: retry button
- [ ] No permission: role explanation
- [ ] Primary action: ذخیره (sticky on mobile optional)

---

## Flow

```
Entry: Sidebar → تنظیمات → یادآورها
  ↓ Permission check (installments.reminder.configure)
  ↓ GET settings → populate form
  ↓ User edits fields
  ↓ Submit → PATCH
  ↓ Success toast «از فردا اعمال می‌شود»
Exit: form shows saved values
  ↘ 403 → NoPermission
  ↘ 400 → inline field errors
  ↘ network → toast + retry
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §5 (form), §7 (page states)
- [ ] ADR-004 (RBAC — UI + backend guard)
- [ ] settings.md — schema keys only, no arbitrary rules
- [ ] SOFT-DELETE-POLICY — N/A (settings entity)

---

## مراجع

- `docs/03-modules/installments/STAFF-FLOWS.md` — SF-009
- `docs/02-architecture/settings.md` — installments schema
- `docs/02-architecture/rbac.md` — `installments.reminder.configure`
- `docs/02-architecture/api-contracts.md` §4 settings
- `docs/09-development/EXCELLENCE-STANDARDS.md` §5–§7

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | /10 | 10 | Depends, Blocks, Estimate |
| Completeness | /25 | 25 | Permission decision, 5 fields, API, files |
| Policy | /25 | 24 | Excellence §5–§7 full, ADR-004 |
| Executability | /25 | 25 | Edge cases, component tree, steps |
| Alignment | /15 | 15 | SF-009, settings.md, rbac matrix |
| **جمع** | **/100** | **99** | ≥95 ✅ |
