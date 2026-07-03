# ماژول اقساط — Domain Model

> **وضعیت:** Approved — v1.2  
> **نسخه:** 1.2 — 1405/07/03  
> **ADR مرتبط:** ADR-001, ADR-002, ADR-007, ADR-008, ADR-013, ADR-015  
> **مراجع:**
> - قوانین کامل کسب‌وکار: [`BUSINESS-RULES.md`](./BUSINESS-RULES.md) — **BR-001 تا BR-047**
> - State Machines: [`state-machines.md`](./state-machines.md)
> - فلوهای مشتری: [`CUSTOMER-FLOWS.md`](./CUSTOMER-FLOWS.md)
> - فلوهای کارمند: [`STAFF-FLOWS.md`](./STAFF-FLOWS.md)
> - گزارش‌ها: [`REPORTS.md`](./REPORTS.md)
> - API: [`docs/02-architecture/api-contracts.md`](../../02-architecture/api-contracts.md)
> - RBAC: [`docs/02-architecture/rbac.md`](../../02-architecture/rbac.md)

## Aggregate Roots

### Sale (فروش قسطی)

| فیلد | نوع | توضیح |
|------|-----|--------|
| id | UUID | |
| tenant_id | UUID | |
| branch_id | UUID | **NOT NULL** — FK `branches`؛ index `(tenant_id, branch_id)` |
| tenant_customer_id | UUID | |
| created_by | UUID | staff_id |
| title | string? | شرح کالا/خدمت |
| total_amount_rial | BigInt | |
| down_payment_rial | BigInt | پیش‌پرداخت |
| installment_count | int | |
| status | enum | `active`, `completed`, `cancelled` |
| created_at | timestamptz | |
| cancelled_at | timestamptz? | |
| cancelled_by | UUID? | |

**Invariant:**
- `branch_id` required — every sale belongs to exactly one branch (ADR-015)
- `down_payment + sum(installments) = total_amount`
- cancel فقط اگر هیچ installment `paid` نباشد (یا با permission `sale.cancel` + audit)

---

### Installment (قسط)

| فیلد | نوع | توضیح |
|------|-----|--------|
| id | UUID | |
| sale_id | UUID | |
| tenant_id | UUID | denormalized for query |
| sequence_number | int | ۱-based |
| due_date | timestamptz | UTC — نمایش Jalali |
| amount_rial | BigInt | |
| status | enum | `pending`, `paid`, `overdue`, `waived` |
| paid_at | timestamptz? | |
| confirmed_by | UUID? | staff_id |
| waived_by | UUID? | staff + permission |

**Invariant:**
- `paid` → `paid_at` و `confirmed_by` required (unless auto-confirm setting)
- `waived` → audit + permission
- **هرگز delete** (soft یا hard) — فقط status change
- Cancel/waive = status transition + audit — record remains forever

---

### PaymentAttempt (تلاش/گزارش پرداخت)

| فیلد | نوع | توضیح |
|------|-----|--------|
| id | UUID | |
| installment_id | UUID | |
| reported_by_type | enum | `customer`, `staff` |
| reported_by_id | UUID | customer_id or staff_id |
| amount_rial | BigInt | |
| status | enum | `pending`, `confirmed`, `rejected` |
| evidence_file_id | UUID? | رسید |
| note | string? | |
| confirmed_by | UUID? | |
| rejected_reason | string? | |

> **تأیید شده:** «ثبت پرداخت» ≠ «پرداخت واقعی» — flow تأیید فروشنده.

---

### PaymentLedgerEntry (دفتر یکپارچه تراکنش‌های مالی)

Append-only ledger per tenant — **هرگز hard delete**؛ ابطال با reversing entry و `status: voided` روی سطر اصلی.

| فیلد | نوع | توضیح |
|------|-----|--------|
| id | UUID | |
| tenant_id | UUID | |
| branch_id | UUID | **NOT NULL** — ADR-015 |
| entry_type | enum | `payment_in`, `payment_out`, `refund`, `fee`, `penalty`, `discount`, `adjustment`, `settlement` |
| direction | enum | `credit`, `debit` |
| amount_rial | BigInt | ADR-007 |
| status | enum | `posted`, `voided` |
| occurred_at | timestamptz | زمان وقوع مالی |
| recorded_at | timestamptz | زمان ثبت در دفتر |
| payment_method | string? | `cash`, `bank_transfer`, … |
| payment_attempt_id | UUID? | لینک به PaymentAttempt |
| installment_id | UUID? | |
| sale_id | UUID? | |
| check_id | UUID? | IFP-111+ |
| settlement_batch_id | UUID? | تسویه دسته‌ای |
| reverses_entry_id | UUID? | سطر reversing برای void |
| voided_at / voided_by / void_reason | | metadata ابطال |

**Semantics (IFP-101):**

| رویداد | entry |
|--------|-------|
| Confirm payment (IFP-092) | `PAYMENT_IN` + `CREDIT` — `occurredAt` = `confirmedAt` |
| Void payment (IFP-094) | reversing `DEBIT` + original → `status: voided` |
| Penalty / discount (IFP-097/098) | `PENALTY` / `DISCOUNT` entries (handlers فاز ۶+) |

**Invariant:**

- Unique `(payment_attempt_id, entry_type)` where `status = posted` — idempotent confirm retry
- `onDelete: Restrict` on all FKs — ADR-013
- Soft delete base fields برای audit؛ ledger semantics از reversing entry پیروی می‌کند نه `deleted_at`

---

### Check (چک دریافتی / پرداختی — IFP-111)

Entity مستقل برای چرخه کامل چک — لینک اختیاری به PaymentAttempt، PaymentLedgerEntry، Sale و Installment.

| فیلد | نوع | توضیح |
|------|-----|--------|
| id | UUID | |
| tenant_id | UUID | |
| branch_id | UUID | **NOT NULL** — ADR-015 |
| check_type | enum | `received`, `payable` |
| status | enum | `registered`, `due`, `collected`, `bounced`, `transferred`, `cancelled` |
| check_number | string | شماره چک |
| bank_name | string | نام بانک |
| bank_branch_code | string? | کد شعبه |
| amount_rial | BigInt | ADR-007 |
| due_date | timestamptz | سررسید |
| drawer_name | string | صادرکننده |
| payee_name | string? | دریافت‌کننده |
| sayad_id | string? | شناسه صیاد |
| payment_attempt_id | UUID? | لینک به PaymentAttempt (IFP-091) |
| ledger_entry_id | UUID? | سطر ledger اصلی پس از وصول |
| installment_id | UUID? | |
| sale_id | UUID? | |
| image_file_id | UUID? | تصویر اسکن چک |
| collected_at / bounced_at / bounce_reason | | lifecycle timestamps |
| transferred_to / transferred_at | | انتقال چک |
| tracking_notes | text? | یادداشت پیگیری |

**Indexes:**

- `(tenant_id, status)` — لیست بر اساس وضعیت
- `(tenant_id, due_date)` — سررسید / overdue job
- `(tenant_id, check_number, bank_name)` — جستجو
- Partial unique `(tenant_id, check_number, bank_name) WHERE deleted_at IS NULL` — جلوگیری از duplicate فعال

**Invariant:**

- `onDelete: Restrict` on all FKs — ADR-013
- Soft delete via base fields — state transitions in IFP-112
- `PaymentLedgerEntry.check_id` ↔ `Check.ledger_entry_id` — dual optional link for ledger posting

---

### PersonalInstallment (اقساط شخصی مشتری)

مستقل از tenant — متعلق به `GlobalCustomer`.

| فیلد | نوع | توضیح |
|------|-----|--------|
| id | UUID | |
| global_customer_id | UUID | |
| title | string | |
| total_amount_rial | BigInt? | optional |
| due_date | timestamptz | |
| amount_rial | BigInt | |
| status | enum | `pending`, `paid` |
| reminder_enabled | boolean | |
| note | string? | |

---

### ReminderPolicy (مشتق از Settings)

Runtime object — persist نمی‌شود as entity جدا (settings + branch override).

```typescript
{
  daysBefore: number[]      // [3, 1]
  onDueDate: boolean
  overdueDays: number[]     // [1, 3, 7]
  sendTime: string          // '09:00'
  channels: ('telegram' | 'bale' | 'sms')[]
}
```

---

## Domain Events

| Event | Payload | Handlers |
|-------|---------|----------|
| `SaleCreated` | saleId, customerId, tenantId | welcome bot message, audit |
| `InstallmentDueSoon` | installmentId, daysUntil | schedule/send reminder |
| `InstallmentOverdue` | installmentId | reminder + notify seller |
| `PaymentReported` | attemptId, installmentId | notify seller |
| `PaymentConfirmed` | installmentId, attemptId | thank customer, stats, **post ledger PAYMENT_IN** |
| `PaymentRejected` | attemptId, reason | notify customer |
| `PaymentVoided` | attemptId, installmentId | **post reversing ledger entry** |
| `CustomerLinkedToBot` | customerId, platform | enable reminders |

---

## Domain Rules — خلاصه

> برای قوانین کامل و شماره‌گذاری‌شده، مراجعه کنید به [`BUSINESS-RULES.md`](./BUSINESS-RULES.md)

### محاسبه اقساط (BR-005)

```typescript
// الگوریتم — BigInt ریال (ADR-007)
const remaining: bigint = totalAmountRial - downPaymentRial;  // BR-002
const base: bigint = remaining / BigInt(count);                // integer division
const remainder: bigint = remaining % BigInt(count);

// قسط‌های اول `remainder` عدد → base + 1 دریافت می‌کنند
// ضمانت: sum(installments) + downPayment === totalAmount همیشه

// مثال: 10,000,000 ریال / 3 قسط
// base = 3,333,333n، remainder = 1n
// installment[0] = 3,333,334n ← باقی‌مانده به اول
// installment[1] = 3,333,333n
// installment[2] = 3,333,333n
// sum = 10,000,000n ✅
```

### Mark Overdue (BR-015 — daily job)

```
ساعت ۰۰:۳۰ به وقت تهران:
IF status == pending AND due_date < today (Tehran)
  → status = overdue
  → raise InstallmentOverdue (در outbox)
  → batch 500 per transaction
```

### Installment Advanced Operations (IFP-079)

Pure domain validation lives in `packages/domain/src/installments/installment-operations.service.ts` — consumed by Phase 05 use cases (reschedule, defer, accelerate, regenerate, merge, split).

| Operation | Allowed status | Key invariant |
|-----------|----------------|---------------|
| reschedule | pending, overdue | `newDueDate ≥ today` (Tehran) unless `allow_past_reschedule` |
| defer | pending only | `0 < deferDays ≤ defer_max_days` |
| accelerate | pending, overdue | `newDueDate ≤ current dueDate` |
| regenerate | sale active | no paid/waived in affected range; sum amounts conserved |
| merge | ≥2 pending/overdue same sale | merged amount = sum(sources) |
| split | 1 pending/overdue | parts sum = original; each part ≥ `split_min_part_rial` |

Policy value objects: `ReschedulePolicy`, `DeferPolicy`, `MergeSplitPolicy` — defaults align with tenant settings keys introduced in IFP-080+.

Terminal states (`paid`, `waived`) block all operations → `INSTALLMENT_STATUS_INVALID` / `INSTALLMENT_ALREADY_WAIVED`.

See [`state-machines.md`](./state-machines.md) and IFP-TASK-079.

### Auto-Complete Sale (BR-018)

```
بعد از هر تغییر وضعیت قسط:
IF all installments.status IN (paid, waived)
  → sale.status = completed
  → raise SaleCompleted (در outbox)
```

### Idempotent Reminder (BR-029)

```
Unique constraint: (installment_id, reminder_type, channel)
reminder_type: 'before_3d' | 'before_1d' | 'due_date' | 'overdue_1d' | 'overdue_3d' | 'overdue_7d'
channel: 'telegram' | 'bale' | 'sms'
```

### موارد خاص / Edge Cases

| سناریو | رفتار | قانون |
|---------|-------|-------|
| پرداخت جزئی (مبلغ کمتر از قسط) | گزارش ثبت می‌شود — تأیید whole installment | BR-023 |
| پرداخت بیشتر از مبلغ قسط | مجاز — مبلغ گزارشی اطلاعاتی است | BR-023 |
| لغو فروش با قسط waived | مجاز — waived مانند pending عمل می‌کند | BR-013 |
| تأیید پرداخت قسط overdue | مجاز — overdue → paid | BR-026 |
| فروش با ۰ پیش‌پرداخت | مجاز | BR-002 |
| تمام مبلغ پیش‌پرداخت | مجاز — یک قسط با مبلغ ۰ | BR-004 |

---

## Use Cases (Application Layer)

| Use Case | Actor | Permission |
|----------|-------|------------|
| CreateSale | Staff | installments.sale.create |
| CancelSale | Staff | installments.sale.cancel |
| ReportPayment | Customer/Staff | installments.payment.report |
| ConfirmPayment | Staff | installments.payment.confirm |
| RejectPayment | Staff | installments.payment.reject |
| WaiveInstallment | Staff | installments.installment.waive |
| ImportCustomers | Staff | installments.customer.import |
| ListOverdue | Staff | installments.report.overdue |
| CreatePersonalInstallment | Customer | (own data) |
| LinkBot | Customer | bot link token |

---

## Reports

| Report | Query |
|--------|-------|
| Dashboard today | installments WHERE due_date = today AND status IN (pending, overdue) |
| Overdue list | status = overdue OR (pending AND due_date < today) |
| Cashflow forecast | sum(amount) GROUP BY due_date range |
| Customer credit | count overdue per tenant_customer |

---

## Import Excel (Customer)

Columns: `phone`, `name`, `local_code?`, `notes?`

- phone normalize → `09xxxxxxxxx`
- User findOrCreateByPhone → GlobalCustomer by userId + TenantCustomer link (ADR-017)
- duplicate phone in file → error row (skip + report)
- Result: `{ totalRows, successCount, errors: [{ row, phone, error }] }`

---

## خطاهای Domain (کدهای خطا)

| کد | HTTP | سناریو |
|----|------|---------|
| `SALE_HAS_PAID_INSTALLMENT` | 409 | cancel فروش با قسط پرداخت‌شده |
| `SALE_ALREADY_CANCELLED` | 409 | cancel فروش لغوشده |
| `INSTALLMENT_ALREADY_PAID` | 409 | تأیید پرداخت قسط پرداخت‌شده |
| `INSTALLMENT_ALREADY_WAIVED` | 409 | بخشودگی قسط بخشوده‌شده |
| `INSTALLMENT_STATUS_INVALID` | 409 | transition غیرمجاز |
| `INSTALLMENT_ALREADY_WAIVED` | 409 | عملیات روی قسط بخشوده‌شده |
| `AMOUNT_MISMATCH` | 400 | عدم حفظ مجموع مبلغ (merge/split/regenerate) |
| `MERGE_MIN_COUNT` | 400 | ادغام کمتر از ۲ قسط |
| `SPLIT_INVALID_PARTS` | 400 | تقسیم نامعتبر |
| `REGENERATE_PAID_BLOCKED` | 409 | بازتولید با قسط paid در بازه |
| `DEFER_MAX_EXCEEDED` | 400 | تعویق بیش از سقف tenant |
| `DUE_DATE_IN_PAST` | 400 | تاریخ سررسید قبل از امروز (تهران) |
| `PAYMENT_ALREADY_CONFIRMED` | 409 | تأیید پرداخت تأییدشده |
| `PAYMENT_ALREADY_REJECTED` | 409 | رد پرداخت ردشده |
| `PAYMENT_PENDING_EXISTS` | 409 | ثبت پرداخت جدید با pending موجود |
| `CUSTOMER_ALREADY_EXISTS` | 409 | ثبت مشتری تکراری در tenant |
| `AMOUNT_EXCEEDS_TOTAL` | 400 | پیش‌پرداخت > مبلغ کل |

مرجع کامل: [`docs/09-development/ERROR-CODES.md`](../../09-development/ERROR-CODES.md)

---

## Prisma Schema (خلاصه)

جداول اصلی ماژول (فاز ۱):

```
Sale          → Installment[] → PaymentAttempt[]
              ↘ PaymentLedgerEntry[] (tenant-wide ledger)
              ↘ Check[] (received / payable)
PersonalInstallment (GlobalCustomer-owned)
NotificationLog (append-only)
```

همه جداول: base fields + soft delete + version + metadata (EXCELLENCE §2)

---

---

## مستندات مرتبط

| سند | محتوا |
|-----|-------|
| [`BUSINESS-RULES.md`](./BUSINESS-RULES.md) | ۴۷ قانون کامل با مثال و جدول خلاصه |
| [`state-machines.md`](./state-machines.md) | Mermaid diagrams state transitions |
| [`CUSTOMER-FLOWS.md`](./CUSTOMER-FLOWS.md) | تجربه کاربری مشتری end-to-end |
| [`STAFF-FLOWS.md`](./STAFF-FLOWS.md) | فلوهای کارمند با RBAC per action |
| [`REPORTS.md`](./REPORTS.md) | گزارش‌ها، KPI، query patterns |

---

*نسخه 1.2 — 1405/07/03*
