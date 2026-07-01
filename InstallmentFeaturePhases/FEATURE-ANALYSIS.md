# تحلیل کامل امکانات — InstallmentFeaturePhases

> **وضعیت:** Approved — v1.0  
> **نسخه:** 1.0 — 1405/04/10  
> **ADRهای مرتبط:** ADR-001, ADR-002, ADR-004, ADR-007, ADR-013, ADR-015, ADR-016, ADR-017  
> **منبع:** [`installment-module-features.md`](../docs/01-product/installment-module-features.md)

---

## خلاصه اجرایی

این سند **تحلیل سیستمی** هر یک از ۲۳ حوزه محصول + قابلیت‌های cross-cutting را قبل از فازبندی ارائه می‌دهد. هر حوزه شامل: موجودیت‌ها، use caseها، وابستگی‌ها، ریسک‌ها، و نگاشت به فاز IFP است.

**اصل طراحی:** همه entityهای business با soft delete؛ مبالغ `bigint` ریال؛ RBAC `{module}.{resource}.{action}`؛ audit روی عملیات حساس.

---

## §۱ — صفحه ورود

### تحلیل

| بعد | جزئیات |
|-----|--------|
| **Actors** | Staff (پنل فروشنده) — `actor: staff` |
| **پایه موجود** | Phase 0: OTP login، JWT 15min، refresh httpOnly |
| **Gap** | رمز عبور، 2FA، Captcha، session management، forgot password |
| **Entity جدید** | `UserCredential` (passwordHash)، `StaffSession`، `LoginAttempt` (rate limit) |
| **Security** | ADR-017 — phone روی User؛ Staff چند tenant |
| **فاز IFP** | Phase-01 |

### Flows

```
Flow A: OTP-only (موجود Phase 0)
Flow B: Password → JWT (IFP-002)
Flow C: Password → OTP step-up 2FA → JWT (IFP-004, IFP-005)
Flow D: Forgot password → OTP verify → reset (IFP-006)
```

### Edge Cases

- Staff در چند tenant — tenant picker بعد از auth
- Account lockout بعد از N تلاش — Redis TTL
- Remember Me — refresh rotation، revoke on password change
- Logout all — invalidate all StaffSession rows

---

## §۲ — داشبورد

### تحلیل

| KPI | منبع داده | Permission |
|-----|-----------|------------|
| تعداد مشتریان | `TenantCustomer` count | `customers.customer.list` |
| قراردادها | `Sale` by status | `installments.sale.list` |
| اقساط امروز/معوق | `Installment` + Tehran TZ | `installments.installment.list` |
| مطالبات/وصول | aggregate BigInt sum | `reports.dashboard.view` |
| وضعیت ربات/پیامک/درگاه | settings + health check | `settings.integration.view` |

**Gap Phase 1:** فقط dashboard stats پایه (TASK-060 area) — charts، widgets، integration status ناقص.

**فاز IFP:** Phase-07 (Epic-01 تا Epic-03)

### وابستگی

- نیاز به Phase-05 (installments data) و Phase-08 (notification status)
- Cache Redis — TTL 5min برای KPI aggregates

---

## §۳ — مدیریت مشتریان

### تحلیل

| قابلیت | Entity / UC | Priority |
|--------|-------------|----------|
| CRUD پایه | TenantCustomer | P0 — Phase 1 partial |
| آرشیو/soft delete | deletedAt | P0 |
| ادغام | `MergeCustomers` UC + audit | P1 |
| برچسب/دسته | `CustomerLabel`, `CustomerCategory` | P1 |
| اسناد | `CustomerDocument` → FileStorage | P1 |
| امتیاز/بلک‌لیست | score field + `isBlacklisted` | P2 |
| تاریخچه | timeline از AuditLog + related aggregates | P1 |

**Invariant:** Customer زیر Branch نیست (ADR-002) — data scope via sale branch assignment.

**فاز IFP:** Phase-03

---

## §۴ — مدیریت قراردادها

### تحلیل

Sale = Contract در domain فعلی. Gapها:

| Feature | Domain impact |
|---------|---------------|
| تمدید/کپی | `ExtendSale`, `CopySale` — new sale + link `sourceSaleId` |
| فسخ/لغو/بستن | state machine extensions — BR-013+ |
| نسخه‌ها | `ContractVersion` append-only snapshot |
| ضامن/وثیقه | `Guarantor`, `Collateral` entities |
| جریمه/تخفیف | settings-driven + line items |
| امضاء | `ContractSignature` + file ref |

**Invariant مالی:** `downPayment + sum(installments) = total` — BR-005

**فاز IFP:** Phase-04 (+ §15 settings در Epic-05)

---

## §۵ — مدیریت اقساط (هسته)

### تحلیل

Phase 1 پوشش: CreateSale، list، confirm payment پایه.

| Feature cluster | Use Cases |
|-----------------|-----------|
| Schedule ops | Reschedule, Defer, Accelerate, Regenerate, Merge/Split |
| Payment channels | Manual, Bank, Online, POS, Cash, Check, Transfer |
| Adjustments | Waive, Penalty, Discount, Fee |
| Lifecycle | Void payment, Confirm/Reject, Receipt |

**Invariant:** Installment هرگز hard/soft delete — فقط status transition (domain.md)

**State machine:** pending → paid | overdue | waived (terminal)

**فاز IFP:** Phase-05

---

## §۶ — پرداخت‌ها

### تحلیل

`PaymentAttempt` فعلی = Array به ledger یکپارچه:

| Entity | نقش |
|--------|-----|
| `PaymentTransaction` | ledger مرکزی — همه روش‌ها |
| `PaymentRefund` | استرداد linked |
| `PaymentSettlement` | تسویه batch |

**Idempotency:** POST مالی — `Idempotency-Key` header

**فاز IFP:** Phase-06 Epic-01/02

---

## §۷ — چک‌ها

### تحلیل

Entity `Check` مستقل:

```
status: received | deposited | cleared | bounced | transferred | cancelled
direction: receivable | payable
```

پیIds| FK به PaymentTransaction، Customer، BankAccount |
| تصویر | FileStorage ref |
| سررسید | dueDate + reminder job |

**فاز IFP:** Phase-06 Epic-04

---

## §۸ — اعلان‌ها

### تحلیل

| Channel | وضعیت |
|---------|--------|
| Bale | Phase 4 — NotificationLog |
| SMS | Gap — provider adapter |
| In-app | Gap — `InAppNotification` |
| Email/Push | P2 — adapter pattern |

**Engine:** template + variable substitution + schedule + bulk + idempotency

**فاز IFP:** Phase-08 Epic-01 (extends Phase 4)

---

## §۹ — اتوماسیون

### تحلیل

```
Trigger (event/schedule) → Rule evaluation → Action (notify, status change, webhook)
```

| Component | Storage |
|-----------|---------|
| AutomationRule | tenant-scoped JSON conditions |
| AutomationRun | append-only execution log |

**Safety:** actions مالی نیاز به permission + audit + dry-run mode

**فاز IFP:** Phase-08 Epic-04

---

## §۱۰ — گزارشات

### تحلیل

| Report type | Data source | Export |
|-------------|-------------|--------|
| مالی | PaymentTransaction aggregates | Excel/PDF |
| اقساط | Installment + Sale | Pivot |
| معوقات | overdue filter | Chart |
| عملکرد کاربر | AuditLog by staffId | Excel |

**Pattern:** ReportDefinition (saved) + ReportRun (cached result TTL)

**فاز IFP:** Phase-07 Epic-04/05

---

## §۱۱ — تقویم

### تحلیل

Unified calendar view — events از:
- Installment due dates
- Contract start/end
- Payment dates
- Tenant holidays (settings)
- Reminders

**Timezone:** Asia/Tehran — BR-015

**فاز IFP:** Phase-07 Epic-06

---

## §۱۲ — فایل‌ها

### تحلیل

| Layer | Implementation |
|-------|----------------|
| Storage | S3-compatible / local dev |
| Entity | `StoredFile` — tenantId, category, mime, size |
| Access | signed URL + RBAC |
| Backup | export bundle — Phase-10 |

**فاز IFP:** Phase-10 Epic-01 (+ customer/contract refs in earlier phases)

---

## §۱۳ — کاربران

### تحلیل

Phase 1: Staff CRUD، Role، Permission override.

| Gap | Task |
|-----|------|
| Groups | `StaffGroup` junction |
| Login log | `StaffSession` + query UI |
| Permission UI matrix | frontend Epic-02 Phase-09 |

**فاز IFP:** Phase-09

---

## §۱۴ — تنظیمات فروشگاه

### تحلیل

Settings schema-based (ADR-005):

```typescript
tenant.profile: { name, logo, phone, address }
tenant.financial: { defaultTaxRate, currency display }
tenant.integrations: { paymentGateway, smsProvider }
tenant.businessHours: { ... }
```

**فاز IFP:** Phase-09 Epic-03

---

## §۱۵ — تنظیمات اقساط

### تحلیل

```typescript
installments.calculation: { formula, roundingMode, remainderDistribution }
installments.penalty: { type, rate, graceDays }
installments.calendar: { holidayCalendar, dateDisplay }
installments.numbering: { salePrefix, installmentFormat }
```

**Invariant:** settings change ≠ retroactive on existing sales (snapshot on Sale)

**فاز IFP:** Phase-04 Epic-05

---

## §۱۶ — ربات بله

### تحلیل

Phase 4: connect bot، reminders، seller flows.

| Gap admin UI | IFP |
|--------------|-----|
| Token management UI | Phase-08 Epic-03 |
| Menu/button editor | Phase-08 |
| Broadcast | Phase-08 |
| Template management | Phase-08 |

---

## §۱۷ — پیامک

### تحلیل

| Component | Detail |
|-----------|--------|
| Provider adapter | Kavenegar/Melipayamak — interface |
| SMS line | tenant config |
| Credit balance | provider API poll |
| Template/pattern | provider + local mapping |
| History | NotificationLog channel=sms |

**فاز IFP:** Phase-08 Epic-02

---

## §۱۸ — حسابداری حرفه‌ای

### تحلیل

Double-entry optional module:

| Entity | Role |
|--------|------|
| `CashAccount`, `BankAccount` | treasury |
| `JournalEntry` | debit/credit lines |
| `FiscalPeriod` | close books |

**Integration:** auto journal on PaymentTransaction confirm

**فاز IFP:** Phase-11 (آخر — وابسته به Phase-06)

---

## §۱۹ — لاگ سیستم

### تحلیل

| Log type | Storage | Policy |
|----------|---------|--------|
| AuditLog | PostgreSQL | append-only — موجود |
| ApiAccessLog | partitioned table | retention 90d |
| ErrorLog | structured + Sentry | PII scrub |
| SecurityLog | login failures, permission denies | append-only |

**فاز IFP:** Phase-10 Epic-02

---

## §۲۰ — امنیت

### تحلیل

Overlap با §1 — consolidated in Phase-01:
- Change password, 2FA, active devices, IP allowlist, sessions, API keys

---

## §۲۱ — نسخه پشتیبان

### تحلیل

| Operation | Scope |
|-----------|-------|
| Backup | tenant data export JSON + files |
| Restore | platform admin only — audit |
| Schedule | BullMQ job weekly |

**Privacy:** encrypted at rest — tenant key

**فاز IFP:** Phase-10 Epic-03

---

## §۲۲ — اشتراک و پلن‌ها

### تحلیل

Phase 0: Plan, Subscription entities exist.

| Gap | Feature |
|-----|---------|
| Billing UI | invoice list, pay renewal |
| Feature caps | module entitlement enforcement |
| Usage metering | SMS count, staff count |

**فاز IFP:** Phase-10 Epic-04

---

## §۲۳ — پشتیبانی

### تحلیل

| Feature | Scope |
|---------|-------|
| Ticket | tenant → platform support |
| FAQ/Help | static CMS in web |
| In-app docs | link to docs portal |

**فاز IFP:** Phase-10 Epic-05

---

## Cross-Cutting — قابلیت‌های عمومی

### تحلیل

این قابلیت‌ها **زیرساخت UI/Backend** هستند — یک بار در Phase-02 ساخته می‌شوند و در همه list pages consume می‌شوند:

| Capability | Pattern |
|------------|---------|
| جستجوی لحظه‌ای | debounced search → API `?q=` |
| فیلتر پیشرفته | FilterBuilder → JSON → query DSL |
| صفحه‌بندی | cursor-based |
| عملیات گروهی | selectedIds[] + bulk endpoint |
| Excel/PDF | export service |
| Saved views | StaffSavedView per user |
| Audit history | AuditLog tab on detail pages |
| Undo | soft undo window 30s for non-financial |
| RBAC UI | `<RequirePermission>` wrapper |
| Dark/light | theme tokens packages/theme |
| تاریخ شمسی/میلادی | `@hivork/i18n` date utils |

**فاز IFP:** Phase-02 — **پیش‌نیاز** Phase-03+

---

## Risk Register

| Risk | Mitigation |
|------|------------|
| Scope creep | TRACEABILITY-MATRIX — هر bullet mapped |
| Financial inconsistency | BigInt + BR tests before each payment task |
| Performance on reports | materialized views + Redis cache |
| Multi-tenant leak | integration test every list API |
| Soft delete violation | CI grep in every phase test epic |

---

## ADR پیشنهادی (قبل از implement)

| ADR | موضوع | Phase |
|-----|--------|-------|
| ADR-018 | UserCredential (platform password) | Phase-01 — IFP-001 |
| ADR-019 | PaymentTransaction ledger model | Phase-06 |
| ADR-020 | Automation rule engine | Phase-08 |
| ADR-021 | Accounting double-entry integration | Phase-11 |
| ADR-022 | File storage abstraction | Phase-10 |

---

*آخرین به‌روزرسانی: 1405/04/10*
