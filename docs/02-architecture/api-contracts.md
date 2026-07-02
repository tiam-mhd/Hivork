# قراردادهای API و استراتژی Versioning — Hivork

> **وضعیت:** Approved — v1.0  
> **نسخه:** 1.0 — 1405/04/08  
> **ADR مرتبط:** ADR-010  
> **Base URL:** `/api/v1`

---

## ۱. اصول API

| اصل | توضیح |
|-----|--------|
| **REST** | منابع + HTTP verbs |
| **JSON** | Content-Type: application/json |
| **Versioning** | `/api/v1/` — پیشوند ثابت |
| **Auth** | Bearer token در `Authorization` header |
| **Pagination** | cursor-based — نه offset |
| **Money** | `bigint` به ریال — به صورت `string` در JSON |
| **Dates** | UTC ISO 8601: `2025-01-15T10:30:00.000Z` |
| **Errors** | `{ code, message, details? }` |
| **Idempotency** | header `Idempotency-Key` برای POST مالی |

---

## ۲. فرمت‌های پایه

### ۲.۱ درخواست موفق

```json
{
  "data": { ... },
  "meta": { "requestId": "uuid" }
}
```

### ۲.۲ لیست صفحه‌بندی‌شده

```json
{
  "data": [ ... ],
  "meta": {
    "hasNext": true,
    "nextCursor": "eyJpZCI6InV1aWQifQ==",
    "total": 150
  }
}
```

### ۲.۳ پاسخ خطا

```json
{
  "code": "INSTALLMENT_ALREADY_PAID",
  "message": "این قسط قبلاً پرداخت شده است.",
  "details": { "installmentId": "uuid", "status": "paid" }
}
```

### ۲.۴ Pagination Query Parameters

```
GET /api/v1/customers?cursor=CURSOR&limit=20&sort=createdAt:desc&status=active&search=حسین
```

| پارامتر | نوع | پیش‌فرض | توضیح |
|---------|-----|---------|--------|
| `cursor` | string | — | cursor از response قبلی |
| `limit` | int | 20 | حداکثر ۱۰۰ |
| `sort` | string | `createdAt:desc` | `field:asc\|desc` |
| `search` | string | — | جستجوی متنی |
| `status` | string | — | فیلتر وضعیت |

---

## ۳. احراز هویت (Auth API)

### `POST /api/v1/auth/otp/request`

درخواست OTP

```json
// Request
{
  "phone": "09121234567",
  "actor": "staff"    // "staff" | "customer"
}

// Response 200
{
  "message": "کد تأیید ارسال شد.",
  "expiresIn": 120   // ثانیه
}

// Errors:
// 400 INVALID_PHONE
// 429 AUTH_OTP_RATE_LIMITED
```

### `POST /api/v1/auth/otp/verify`

تأیید OTP و ورود

```json
// Request
{
  "phone": "09121234567",
  "code": "12345",
  "actor": "staff",
  "intent": "login",       // "login" | "register"
  "tenantSlug": "my-shop"  // اجباری برای actor=staff
}

// Response 200 (logged in)
{
  "accessToken": "eyJ...",
  "expiresIn": 900,
  "staff": {
    "id": "uuid",
    "name": "علی محمدی",
    "roles": ["owner"],
    "dataScope": "all"
  },
  "tenant": {
    "id": "uuid",
    "name": "فروشگاه موبایل علی",
    "slug": "ali-mobile",
    "enabledModules": ["installments"]
  }
}

// Response 200 (new user - needs registration)
{
  "verifiedToken": "one-time-token",
  "expiresIn": 600
}

// Errors:
// 400 AUTH_OTP_INVALID | AUTH_OTP_EXPIRED
// 404 PHONE_NOT_FOUND (intent=login)
// 429 AUTH_OTP_TOO_MANY_ATTEMPTS
```

### `POST /api/v1/auth/refresh`

تمدید session

```json
// Request (refresh token از cookie httpOnly)
{ "actor": "staff" }

// Response 200
{
  "accessToken": "eyJ...",
  "expiresIn": 900
}
```

### `POST /api/v1/auth/logout`

```json
// Request
{ "actor": "staff" }

// Response 200
{ "message": "خروج موفق." }
```

---

## ۴. Tenant و Core

### `GET /api/v1/tenants/me`

```json
// Response 200
{
  "id": "uuid",
  "name": "فروشگاه موبایل علی",
  "slug": "ali-mobile",
  "legalName": "محمدی موبایل",
  "taxId": null,
  "phone": "02188888888",
  "email": "ali@example.com",
  "address": "تهران، خیابان ولیعصر",
  "status": "active",
  "planId": "uuid",
  "enabledModules": ["installments"],
  "timezone": "Asia/Tehran",
  "locale": "fa_IR",
  "onboardingCompletedAt": "2025-01-10T08:00:00.000Z",
  "createdAt": "2025-01-01T08:00:00.000Z"
}
```

### `GET /api/v1/branches`

```json
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "name": "شعبه اصلی",
      "address": "تهران، بازار موبایل",
      "phone": "02188888888",
      "isDefault": true,
      "isActive": true,
      "createdAt": "..."
    }
  ],
  "meta": { "total": 1, "hasNext": false, "nextCursor": null }
}
```

### `GET /api/v1/staff`

```json
// Query: ?status=active&branchId=uuid&cursor=...&limit=20

// Response 200
{
  "data": [
    {
      "id": "uuid",
      "phone": "09121234567",
      "name": "رضا کریمی",
      "email": null,
      "jobTitle": "فروشنده",
      "status": "active",
      "dataScope": "branch",
      "assignedBranchIds": ["uuid1"],
      "primaryBranchId": "uuid1",
      "roles": [{ "code": "cashier", "name": "صندوقدار" }],
      "lastLoginAt": "2025-01-15T09:00:00.000Z",
      "createdAt": "..."
    }
  ],
  "meta": { "total": 5, "hasNext": false, "nextCursor": null }
}
```

### `GET /api/v1/settings/installments`

```json
// Response 200
{
  "data": {
    "installments": {
      "reminder_days_before": [3, 1],
      "reminder_on_due_date": true,
      "reminder_time": "09:00",
      "overdue_escalation_days": [1, 3, 7],
      "default_installment_count": 12,
      "allow_customer_self_report_payment": true,
      "require_seller_payment_confirmation": true,
      "notify_seller_on_customer_payment_report": true,
      "default_reminder_channels": ["telegram"],
      "calculation_formula": "equal_installments",
      "penalty_type": "none",
      "penalty_rate_bps": 0,
      "penalty_fixed_rial": "0",
      "penalty_grace_days": 0,
      "interest_rate_bps_annual": 0,
      "interest_calculation_method": "none",
      "rounding_mode": "nearest",
      "rounding_unit_rial": "1000",
      "skip_holidays_in_schedule": true,
      "holiday_calendar_source": "merge_official_and_custom",
      "custom_holiday_dates": [],
      "calendar_display_mode": "jalali",
      "calendar_input_mode": "jalali",
      "contract_numbering_enabled": true,
      "contract_number_prefix": "CTR",
      "contract_number_pad_length": 6,
      "contract_number_include_year": true,
      "contract_number_next_sequence": 43
    }
  }
}
```

### `PATCH /api/v1/settings/installments`

```json
// Request
{
  "penalty_type": "percent_daily",
  "penalty_rate_bps": 50,
  "penalty_grace_days": 3,
  "interest_rate_bps_annual": 1800,
  "interest_calculation_method": "simple",
  "rounding_mode": "nearest",
  "rounding_unit_rial": "1000",
  "calendar_display_mode": "jalali",
  "contract_number_prefix": "CTR"
}

// Response 200
{
  "data": {
    "installments": {
      "penalty_type": "percent_daily",
      "penalty_rate_bps": 50,
      "penalty_grace_days": 3,
      "interest_rate_bps_annual": 1800,
      "interest_calculation_method": "simple",
      "rounding_mode": "nearest",
      "rounding_unit_rial": "1000",
      "calendar_display_mode": "jalali",
      "contract_number_prefix": "CTR",
      "contract_number_next_sequence": 43
    }
  }
}
```

`contract_number_next_sequence` is read-only: returned in GET/PATCH responses, but rejected in request bodies with `READONLY_SETTING_KEY`.

---

## ۵. ماژول اقساط (Installments API)

### `GET /api/v1/customers`

```json
// Query: ?search=حسین&status=active&cursor=...&limit=20

// Response 200
{
  "data": [
    {
      "id": "uuid",          // TenantCustomer.id
      "globalCustomer": {
        "id": "uuid",
        "phone": "09121234567",
        "name": "حسین احمدی"
      },
      "localCode": "C-001",
      "tags": ["vip"],
      "creditScore": 85,
      "overdueCount": 1,
      "totalPurchaseRial": "15000000",  // bigint as string
      "lastPurchaseAt": "2025-01-10T00:00:00.000Z",
      "preferredContactChannel": "telegram",
      "createdAt": "..."
    }
  ],
  "meta": { "total": 50, "hasNext": true, "nextCursor": "..." }
}
```

### `POST /api/v1/customers`

```json
// Request
{
  "phone": "09121234567",
  "name": "حسین احمدی",
  "localCode": "C-001",
  "tags": ["vip"],
  "notes": "مشتری قدیمی",
  "defaultBranchId": "uuid",
  "preferredContactChannel": "telegram"
}

// Response 201
{ "id": "uuid", ... }

// Errors:
// 409 CUSTOMER_ALREADY_EXISTS
// 400 INVALID_PHONE
```

### `POST /api/v1/customers/import`

```
Content-Type: multipart/form-data
Permission: installments.customer.import

Body: file (Excel .xlsx, max 5MB)
Headers: Idempotency-Key: uuid
```

```json
// Response 200
{
  "totalRows": 50,
  "successCount": 47,
  "errors": [
    { "row": 12, "phone": "0912xxx", "error": "INVALID_PHONE" },
    { "row": 23, "phone": "09300000001", "error": "CUSTOMER_ALREADY_EXISTS" }
  ]
}
```

### `POST /api/v1/sales`

```json
// Request
// Permission: installments.sale.create
// Header: Idempotency-Key: uuid
{
  "tenantCustomerId": "uuid",
  "branchId": "uuid",
  "title": "موبایل سامسونگ S23",
  "totalAmountRial": "25000000",
  "downPaymentRial": "5000000",
  "installmentCount": 10,
  "firstDueDate": "2025-02-01",
  "contractDate": "2025-01-15"
}

// Response 201
{
  "id": "uuid",
  "tenantCustomerId": "uuid",
  "branchId": "uuid",
  "title": "موبایل سامسونگ S23",
  "totalAmountRial": "25000000",
  "downPaymentRial": "5000000",
  "installmentCount": 10,
  "status": "active",
  "installments": [
    {
      "id": "uuid",
      "sequenceNumber": 1,
      "dueDate": "2025-02-01T00:00:00.000Z",
      "amountRial": "2000000",
      "status": "pending"
    },
    ...
  ],
  "createdAt": "..."
}

// Errors:
// 400 AMOUNT_EXCEEDS_TOTAL | INSTALLMENT_COUNT_INVALID
// 404 CUSTOMER_NOT_FOUND
// 403 BRANCH_NOT_ALLOWED
// 403 TENANT_PLAN_LIMIT_EXCEEDED
// 409 IDEMPOTENCY_CONFLICT
```

### `GET /api/v1/sales/:id`

```json
// Response 200
{
  "id": "uuid",
  "customer": {
    "id": "uuid",
    "phone": "09121234567",
    "name": "حسین احمدی"
  },
  "branchId": "uuid",
  "title": "موبایل سامسونگ S23",
  "totalAmountRial": "25000000",
  "downPaymentRial": "5000000",
  "installmentCount": 10,
  "status": "active",
  "installments": [
    {
      "id": "uuid",
      "sequenceNumber": 1,
      "dueDate": "2025-02-01T00:00:00.000Z",
      "amountRial": "2000000",
      "status": "paid",
      "paidAt": "2025-02-02T10:00:00.000Z",
      "confirmedBy": "uuid"
    },
    ...
  ],
  "createdAt": "..."
}
```

### `POST /api/v1/sales/:id/cancel`

```json
// Request
// Permission: installments.sale.cancel
{ "reason": "مشتری پشیمان شد" }

// Response 200
{ "status": "cancelled", "cancelledAt": "..." }

// Errors:
// 409 SALE_ALREADY_CANCELLED
// 409 SALE_HAS_PAID_INSTALLMENT
```

### Sales enterprise lifecycle (IFP-064)

Branch-scoped mutations require `X-Branch-Id` (or active branch session). Extend requires `X-Sale-Version` (optimistic lock).

| Method | Path | Permission |
|--------|------|------------|
| POST | `/api/v1/sales/:id/extend` | `installments.sale.extend` |
| POST | `/api/v1/sales/:id/copy` | `installments.sale.copy` |
| POST | `/api/v1/sales/:id/terminate` | `installments.sale.terminate` |
| POST | `/api/v1/sales/:id/close` | `installments.sale.close` |
| POST | `/api/v1/sales/:id/archive` | `installments.sale.archive` |
| POST | `/api/v1/sales/:id/unarchive` | `installments.sale.archive` |
| POST | `/api/v1/sales/:id/status` | `installments.sale.change_status` |
| GET | `/api/v1/sales/:id/versions` | `installments.sale.view` |
| GET | `/api/v1/sales/:id/versions/:versionNumber` | `installments.sale.view` |
| GET | `/api/v1/sales/:id/attachments` | `installments.sale.view` |
| POST | `/api/v1/sales/:id/attachments` | `installments.sale.edit` |
| DELETE | `/api/v1/sales/:id/attachments/:attachmentId` | `installments.sale.edit` |
| DELETE | `/api/v1/sales/:id` | `installments.sale.edit` |
| POST | `/api/v1/sales/:id/restore` | `core.data.restore` |

List query extensions: `?includeArchived=true`, `?includeDeleted=true`, `?status=terminated,closed`, `?contractNumber=CTR-2025-000042`.

Common errors: `INVALID_STATUS_TRANSITION` (409), `VERSION_CONFLICT` (409), `SALE_ARCHIVED_READONLY` (409), `SALE_NOT_FOUND` (404), `PERMISSION_DENIED` (403).

### Sales guarantors & collaterals (IFP-067)

Branch-scoped mutations require `X-Branch-Id` (or active branch session).

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/v1/sales/:id/guarantors` | `installments.sale.guarantor.view` |
| POST | `/api/v1/sales/:id/guarantors` | `installments.sale.guarantor.create` |
| PATCH | `/api/v1/sales/:id/guarantors/:guarantorId` | `installments.sale.guarantor.update` |
| DELETE | `/api/v1/sales/:id/guarantors/:guarantorId` | `installments.sale.guarantor.delete` |
| POST | `/api/v1/sales/:id/guarantors/:guarantorId/restore` | `installments.sale.guarantor.update` |
| GET | `/api/v1/sales/:id/collaterals` | `installments.sale.collateral.view` |
| POST | `/api/v1/sales/:id/collaterals` | `installments.sale.collateral.create` |
| PATCH | `/api/v1/sales/:id/collaterals/:collateralId` | `installments.sale.collateral.update` |
| DELETE | `/api/v1/sales/:id/collaterals/:collateralId` | `installments.sale.collateral.delete` |
| POST | `/api/v1/sales/:id/collaterals/:collateralId/release` | `installments.sale.collateral.release` |
| POST | `/api/v1/sales/:id/collaterals/:collateralId/forfeit` | `installments.sale.collateral.forfeit` |

### Sales financials & line items (IFP-071)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/v1/sales/:id/line-items` | `installments.sale.edit_financials` |
| POST | `/api/v1/sales/:id/line-items` | `installments.sale.edit_financials` |
| PUT | `/api/v1/sales/:id/line-items` | `installments.sale.edit_financials` |
| PATCH | `/api/v1/sales/:id/line-items/:lineItemId` | `installments.sale.edit_financials` |
| DELETE | `/api/v1/sales/:id/line-items/:lineItemId` | `installments.sale.edit_financials` |
| PATCH | `/api/v1/sales/:id/financials` | `installments.sale.edit_financials` |
| POST | `/api/v1/sales/:id/financials/recalculate` | `installments.sale.edit_financials` |

Bulk upsert and recalculate accept `expectedVersion` (optimistic lock) and optional `regenerateInstallments`. When installment sum ≠ new total and `regenerateInstallments` is false → `409 INSTALLMENT_SUM_MISMATCH`. Recalculate appends `ContractVersion` with `FINANCIAL_RECALC`.

Audit: `sale.line_item.create|update|delete|bulk_upsert`, `sale.financials.update`, `sale.financials.recalculate`.

Common errors: `GUARANTOR_IDENTITY_REQUIRED` (422), `GUARANTOR_LIMIT_EXCEEDED` (409), `COLLATERAL_LIMIT_EXCEEDED` (409), `INVALID_COLLATERAL_STATUS` (409), `SALE_ARCHIVED_READONLY` (409), `SALE_HAS_PAID_INSTALLMENT` (409).

Audit actions: `sale.guarantor.create|update|delete`, `sale.collateral.create|update|delete|release|forfeit`.

### `GET /api/v1/installments`

```
// Query: ?status=overdue|pending|paid&branchId=uuid&from=2025-01-01&to=2025-01-31&cursor=...
// Permission: installments.installment.view
```

```json
{
  "data": [
    {
      "id": "uuid",
      "saleId": "uuid",
      "customer": { "id": "uuid", "phone": "...", "name": "..." },
      "branchId": "uuid",
      "sequenceNumber": 3,
      "dueDate": "2025-03-01T00:00:00.000Z",
      "amountRial": "2000000",
      "status": "overdue"
    }
  ],
  "meta": { "total": 23, "hasNext": true, "nextCursor": "..." }
}
```

### `POST /api/v1/payments/report`

مشتری یا staff گزارش پرداخت می‌دهد

```json
// Request
// Permission: installments.payment.report (staff) یا customer endpoint
// Header: Idempotency-Key: uuid
{
  "installmentId": "uuid",
  "amountRial": "2000000",
  "note": "کارت به کارت کردم"
}

// Response 201
{
  "id": "uuid",
  "installmentId": "uuid",
  "reportedByType": "customer",
  "amountRial": "2000000",
  "status": "pending",
  "createdAt": "..."
}

// Errors:
// 409 PAYMENT_PENDING_EXISTS
// 409 INSTALLMENT_ALREADY_PAID
```

### `POST /api/v1/payments/:id/confirm`

```json
// Permission: installments.payment.confirm
// Header: Idempotency-Key: uuid
{}

// Response 200
{
  "paymentId": "uuid",
  "status": "confirmed",
  "installment": {
    "id": "uuid",
    "status": "paid",
    "paidAt": "..."
  }
}

// Errors:
// 409 PAYMENT_ALREADY_CONFIRMED
```

### `POST /api/v1/payments/:id/reject`

```json
// Permission: installments.payment.reject
{ "reason": "رسید نادرست است" }

// Response 200
{ "paymentId": "uuid", "status": "rejected" }
```

### `GET /api/v1/reports/dashboard`

```json
// Permission: installments.report.dashboard

// Response 200
{
  "todayDueCount": 15,
  "todayDueAmountRial": "30000000",
  "overdueCount": 8,
  "overdueAmountRial": "16000000",
  "pendingPaymentCount": 3,
  "thisMonthCollectedRial": "120000000",
  "updatedAt": "2025-01-15T09:00:00.000Z"
}
```

### `GET /api/v1/reports/cashflow`

```json
// Query: ?from=2025-01-01&to=2025-03-31
// Permission: installments.report.dashboard

// Response 200
{
  "data": [
    { "date": "2025-01-15", "totalRial": "15000000", "installmentCount": 8 },
    { "date": "2025-01-16", "totalRial": "8000000",  "installmentCount": 4 },
    ...
  ]
}
```

---

## ۶. پورتال مشتری

### `GET /api/v1/my/installments`

```json
// Auth: customer token
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "tenant": { "id": "uuid", "name": "فروشگاه موبایل علی" },
      "saleTitle": "موبایل سامسونگ S23",
      "sequenceNumber": 3,
      "totalInstallments": 10,
      "dueDate": "2025-03-01T00:00:00.000Z",
      "amountRial": "2000000",
      "status": "pending"
    }
  ]
}
```

### `GET /api/v1/my/installments/calendar`

```json
// Response 200
{
  "data": [
    {
      "date": "2025-02-01",
      "installments": [
        { "id": "uuid", "tenant": "فروشگاه علی", "amountRial": "2000000", "status": "pending" }
      ]
    }
  ]
}
```

### `GET /api/v1/my/personal-installments`

```json
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "title": "قسط ماشین",
      "amountRial": "5000000",
      "dueDate": "2025-02-15T00:00:00.000Z",
      "status": "pending",
      "reminderEnabled": true
    }
  ]
}
```

### `POST /api/v1/my/personal-installments`

```json
// Request
{
  "title": "قسط ماشین",
  "amountRial": "5000000",
  "dueDate": "2025-02-15",
  "reminderEnabled": true,
  "note": "اقساط پارسیان"
}

// Response 201
{ "id": "uuid", ... }
```

---

## ۷. Bot API

### `POST /api/v1/bot/link-token`

```json
// Permission: (any authenticated staff)
{
  "tenantCustomerId": "uuid"
}

// Response 200
{
  "token": "ABC123XYZ",
  "deepLinkTelegram": "https://t.me/HivorkBot?start=link_ABC123XYZ",
  "deepLinkBale": "https://ble.ir/HivorkBot?start=link_ABC123XYZ",
  "expiresAt": "2025-01-16T10:00:00.000Z"  // 24h
}
```

---

## ۸. Active Branch (Staff)

### `PATCH /api/v1/staff/me/active-branch`

```json
// Request
{ "branchId": "uuid" }

// Response 200
{ "activeBranchId": "uuid", "branchName": "شعبه مرکزی" }

// Errors:
// 403 BRANCH_NOT_ALLOWED
```

---

## ۹. Webhook‌ها (Bot Gateway)

### `POST /webhooks/telegram`

```
Header: X-Telegram-Bot-Api-Secret-Token: <webhook-secret>
Body: Telegram Update JSON (از API تلگرام)
```

```json
// Response 200 (همیشه — telegram انتظار OK دارد)
{}
```

### `POST /webhooks/bale`

```
Header: X-Bale-Signature: sha256=...
Body: Bale Update JSON
```

---

## ۱۰. استراتژی Versioning

### اصول

```
/api/v1/  → نسخه فعلی
/api/v2/  → هنگام breaking change — هر دو برای ۶+ ماه parallel
```

### Breaking vs Non-Breaking

| تغییر | Breaking؟ | رویکرد |
|-------|----------|---------|
| اضافه کردن فیلد اختیاری به response | ❌ | همان version |
| اضافه کردن endpoint جدید | ❌ | همان version |
| حذف فیلد از response | ✅ | v2 + deprecation |
| تغییر نوع فیلد | ✅ | v2 + deprecation |
| تغییر معنای status enum | ✅ | v2 + deprecation |
| تغییر URL | ✅ | v2 + 301 redirect |

### Deprecation Policy

```
1. فیلد deprecated → اضافه کردن header: X-Deprecated-Field: fieldName
2. مستندات: "Deprecated from v1.X — use fieldNew in v2"
3. حداقل ۶ ماه parallel support
4. اطلاع‌رسانی به clients (changelog + email)
5. حذف در v2
```

---

## ۱۱. Rate Limiting Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1736958000  // Unix timestamp
```

---

## ۱۲. OpenAPI Schema

پس از اجرا، Swagger UI در دسترس است:

```
http://localhost:3001/api  → Swagger UI
http://localhost:3001/api-json  → OpenAPI JSON
```

Zod schemas در `packages/contracts/` به عنوان source of truth — OpenAPI از آنها generate می‌شود.

---

*نسخه 1.0 — 1405/04/08*
