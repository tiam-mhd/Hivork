# TASK-107: Frontend — Customer Create / Edit

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-11-Frontend-Customer-Pages |
| ID | TASK-107 |
| Priority | P0 |
| Depends on | TASK-106, TASK-084, TASK-085 |
| Blocks | TASK-110 |
| Estimated | 12h |

---

## هدف

فرم ایجاد و ویرایش مشتری tenant با **تمام** فیلدهای EXCELLENCE §8 — phone read-only در edit، validation client/server، unsaved warning.

---

## معیار پذیرش

- [ ] Routes: `/admin/customers/new`, `/admin/customers/[id]/edit`
- [ ] Create: `POST /api/v1/customers`
- [ ] Edit: `GET /api/v1/customers/:id` + `PATCH /api/v1/customers/:id`
- [ ] Phone read-only on edit (disabled + help text)
- [ ] All §8 fields visible to staff
- [ ] `internalNotes` فقط staff — section جدا
- [ ] Read-only stats on edit: creditScore, overdueCount, totalPurchaseRial, lastPurchaseAt
- [ ] Unsaved changes warning
- [ ] Success toast + redirect to list or stay

---

## مشخصات فنی

### Routes

```
apps/web/app/(seller)/admin/customers/new/page.tsx
apps/web/app/(seller)/admin/customers/[id]/edit/page.tsx
```

### Permissions

| Route | Permission |
|-------|------------|
| `/new` | `installments.customer.create` |
| `/[id]/edit` | `installments.customer.update` |

### API Endpoints

| Method | Path |
|--------|------|
| POST | `/api/v1/customers` |
| GET | `/api/v1/customers/:id` |
| PATCH | `/api/v1/customers/:id` |

### Form Fields (EXCELLENCE §8)

#### بخش اطلاعات تماس

| Field | Label (fa) | Placeholder | Help (fa) | Required | Edit |
|-------|------------|-------------|-----------|----------|------|
| phone | شماره موبایل | ۰۹۱۲۱۲۳۴۵۶۷ | شماره برای OTP و پیامک یادآور | ✅ | read-only |
| name | نام و نام خانوادگی | مثال: حسین احمدی | حداقل ۲ کاراکتر | ✅ | editable |
| email | ایمیل | name@example.com | اختیاری — برای ارسال رسید | ❌ | editable |
| preferredContactChannel | کانال ترجیحی | — | تلگرام، پیامک، تماس | ❌ | select |
| marketingOptIn | دریافت پیام تبلیغاتی | — | پیام‌های پیشنهاد و تخفیف | ❌ | checkbox |

#### بخش هویت

| Field | Label | Placeholder | Help | Required |
|-------|-------|-------------|------|----------|
| nationalId | کد ملی | ۱۰ رقم | برای قراردادهای رسمی | ❌ |
| birthDate | تاریخ تولد | انتخاب تاریخ | تقویم شمسی | ❌ |
| gender | جنسیت | — | مرد / زن / ترجیح نمی‌دهم | ❌ |
| address | آدرس | خیابان، پلاک، واحد | آدرس محل سکونت یا کار | ❌ |

#### بخش tenant

| Field | Label | Placeholder | Help | Required |
|-------|-------|-------------|------|----------|
| localCode | کد محلی | C-001 | کد داخلی فروشگاه شما | ❌ |
| tags | برچسب‌ها | vip, regular | با Enter اضافه کنید | ❌ |
| defaultBranchId | شعبه پیش‌فرض | — | برای فروش‌های جدید | ❌ |
| notes | یادداشت | — | قابل مشاهده در پروفایل | ❌ |
| internalNotes | یادداشت داخلی | — | فقط کارمندان — مشتری نمی‌بیند | ❌ |

#### بخش آمار (edit only — read-only)

| Field | Label | Format |
|-------|-------|--------|
| creditScore | امتیاز اعتباری | عدد |
| overdueCount | تعداد معوقات | عدد |
| totalPurchaseRial | مجموع خرید | formatToman |
| lastPurchaseAt | آخرین خرید | formatJalaliDate |

### Validation

| Rule | Client | Server Code |
|------|--------|-------------|
| phone format | `phoneSchema` | `INVALID_PHONE` |
| name min 2 | Zod | `VALIDATION_ERROR` |
| nationalId 10 digit | Zod optional | `INVALID_NATIONAL_ID` |
| duplicate phone (create) | — | `CUSTOMER_ALREADY_EXISTS` → phone field |
| email format | Zod optional | `INVALID_EMAIL` |

### Wireframe

```
Breadcrumb: خانه > مشتریان > مشتری جدید

ثبت مشتری جدید
─────────────────────────────────────
اطلاعات تماس
  شماره موبایل *     [___________]
  نام *              [___________]
  ...

[انصراف]                    [ذخیره مشتری]
```

### Form-level UX

- Submit loading: «در حال ذخیره…» + disable
- Server errors mapped per field via `details.field`
- `beforeunload` + router blocker if dirty
- Focus first error field on validation fail
- aria-invalid + aria-describedby on errors

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/app/(seller)/admin/customers/new/page.tsx` |
| Create | `apps/web/app/(seller)/admin/customers/[id]/edit/page.tsx` |
| Create | `apps/web/components/customers/customer-form.tsx` |
| Create | `apps/web/components/customers/customer-stats-panel.tsx` |
| Create | `apps/web/lib/schemas/customer-form.schema.ts` |
| Create | `apps/web/hooks/use-unsaved-warning.ts` |

---

## مراحل پیاده‌سازی

1. Zod schema از `@hivork/contracts` + extensions
2. RHF + CustomerForm shared between new/edit
3. PhoneInput readonly mode
4. Tags input component (chip)
5. Branch select from GET branches
6. Stats panel conditional on edit
7. PATCH diff only changed fields
8. Unsaved warning hook

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| 409 duplicate | inline phone error |
| Customer not found 404 | error page |
| 403 update | NoPermissionPage |
| Navigate away dirty | confirm dialog |
| GlobalCustomer exists, new tenant link | API upsert — success |

---

## تست

- [ ] E2E: create customer → appears in list
- [ ] E2E: edit name → saved
- [ ] Unit: phone readonly on edit mode
- [ ] Unit: unsaved warning triggers

---

## UX

- [x] Form §5 complete checklist
- [x] RTL logical properties
- [x] Mobile: tel for phone, numeric where needed
- [x] Money display read-only stats in Toman

---

## Policy Alignment

- [x] EXCELLENCE-STANDARDS §8 GlobalCustomer/TenantCustomer
- [x] Phone normalize 09xxxxxxxxx
- [x] SOFT-DELETE — edit only active customers

---

## مراجع

- `docs/09-development/EXCELLENCE-STANDARDS.md` — §8
- `docs/03-modules/installments/STAFF-FLOWS.md` — SF-007.1
- `docs/02-architecture/api-contracts.md` — customers CRUD

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | /10 | 10 |
| Completeness | /25 | 25 |
| Policy | /25 | 25 |
| Executability | /25 | 25 |
| Alignment | /15 | 15 |
| **جمع** | **/100** | **100** |
