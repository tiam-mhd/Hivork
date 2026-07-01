# ADR — Architecture Decision Records — Hivork

> **وضعیت:** Living Document — به‌روزرسانی مستمر  
> **نسخه:** 1.1 — 1405/04/08  
> **قانون:** هر تصمیم معماری جدید → ADR قبل از implement  
> ثبت تصمیم‌های کلیدی تأیید شده. هر ADR: وضعیت، زمینه، تصمیم، پیامد.  

## فهرست

| شماره | عنوان | وضعیت |
|-------|-------|--------|
| ADR-001 | محصول اول — مدیریت اقساط | ✅ Accepted |
| ADR-002 | GlobalCustomer جدا از TenantCustomer | ✅ Accepted |
| ADR-003 | Modular Monolith | ✅ Accepted |
| ADR-004 | RBAC با User Override | ✅ Accepted |
| ADR-005 | Settings Schema-Based | ✅ Accepted |
| ADR-006 | کانال — Bot قبل از Native App | ✅ Accepted |
| ADR-007 | Money as BIGINT Rial | ✅ Accepted |
| ADR-008 | Payment Report ≠ Payment Confirm | ✅ Accepted |
| ADR-009 | Default Branch Auto-Create | ✅ Accepted |
| ADR-010 | Tech Stack | ✅ Accepted |
| ADR-011 | Staff و Customer Same Phone | ✅ Accepted |
| ADR-012 | Enterprise Completeness | ✅ Accepted |
| ADR-013 | Soft Delete Only | ✅ Accepted |
| ADR-014 | Documentation & Phase/Task Standards | ✅ Accepted |
| ADR-015 | Staff–Branch Access & Active Branch | ✅ Accepted |
| ADR-016 | API Versioning Strategy | ✅ Accepted |
| ADR-017 | User Platform Identity | ✅ Accepted |
| ADR-018 | Notification Channel Abstraction | 📋 Proposed |
| ADR-019 | User Platform Credential (Password) | ✅ Accepted |

---

---

## ADR-001: محصول اول — مدیریت اقساط

**وضعیت:** ✅ Accepted  
**تاریخ:** 1405/04

### زمینه
بازار ایران دو نیاز اصلی داشت: مدیریت اقساط و منوی دیجیتال. تحلیل ICP و pain market نشان داد مدیریت اقساط درد عمیق‌تر و رقابت کمتری دارد.

### تصمیم
**مدیریت اقساط** به عنوان ماژول اول Hivork.

### دلایل
- شدت درد بازار بالا — فروشگاه‌های کوچک با Excel/دفتر مدیریت می‌کنند
- رقابت کمتر نسبت به منوی دیجیتال
- Network effect قوی: هر فروشنده ۵۰–۵۰۰ مشتری وارد اکوسیستم می‌کند
- نیازی به نصب اپ مشتری نیست (ربات تلگرام)
- Go-to-market سریع‌تر — درآمد زودتر

### پیامد
- منوی دیجیتال به عنوان ماژول دوم در آینده
- Brand: Hivork = platform، installments = ماژول اول
- معماری ماژولار از روز ۱ برای ماژول‌های بعدی

---

## ADR-002: GlobalCustomer جدا از TenantCustomer

**وضعیت:** ✅ Accepted

### زمینه
آیا Customer زیر Branch/Tenant باشد؟

### تصمیم
- `GlobalCustomer` = platform-level B2C profile (ADR-002)
- `User` = canonical platform identity — phone unique (ADR-017، تکمیل ADR-002)
- `TenantCustomer` = رابطه tenant ↔ customer
- Customer **نه** child of Branch

> **به‌روزرسانی ADR-017:** phone دیگر روی GlobalCustomer نیست — روی `User` است.

### پیامد
- یک مشتری چند tenant
- پورتال مشتری یکپارche
- Query همیشه از طریق TenantCustomer برای داده tenant

---

## ADR-003: Modular Monolith

**وضعیت:** ✅ Accepted

### تصمیم
Modular Monolith + workers (`api`, `bot-gateway`, `scheduler`) — نه microservice.

### پیامد
- Extract later if needed
- Module registry from day 1

---

## ADR-004: RBAC با User Override

**وضعیت:** ✅ Accepted

### تصمیم
- Role system + tenant custom roles
- User override: grant/deny
- Precedence: DENY > GRANT > Role > default deny
- Data scope: all | branch | own

### پیامد
- Permission matrix per module version
- Owner-only custom role creation

---

## ADR-005: Settings Schema-Based

**وضعیت:** ✅ Accepted

### تصمیم
تنظیمات = typed schema با default — نه free-form business rules.

Invariant rules در domain code.

### پیامد
- Testable combinations
- No «tenant X has weird rule»

---

## ADR-006: کانال — Bot قبل از Native App

**وضعیت:** ✅ Accepted

### ترتیب
1. Web seller panel
2. Telegram bot
3. Customer PWA
4. Bale bot
5. Native app (later)

### پیامد
- Customer onboarding via deep link
- PWA for calendar depth

---

## ADR-007: Money as BIGINT Rial

**وضعیت:** ✅ Accepted

### تصمیم
ذخیره `amount_rial: BigInt` — نمایش Toman در UI based on setting.

---

## ADR-008: Payment Report ≠ Payment Confirm

**وضعیت:** ✅ Accepted

### تصمیم
Customer «پرداخت کردم» → `PaymentAttempt.pending` → staff confirm → `Installment.paid`.

Default: confirmation required.

---

## ADR-009: Default Branch Auto-Create

**وضعیت:** ✅ Accepted

### تصمیم
Tenant جدید → branch «شعبه اصلی» automatic.  
Branch در DB از day 1 — UI simplified for single-branch.

---

## ADR-010: Tech Stack

**وضعیت:** ✅ Accepted

| Layer | Choice |
|-------|--------|
| Monorepo | pnpm + Turborepo |
| Backend | NestJS + Prisma + PostgreSQL |
| Frontend | Next.js + shadcn/ui |
| Queue | Redis + BullMQ |
| Bots | grammY + Bale adapter |

---

## ADR-011: Staff و Customer Same Phone

**وضعیت:** ✅ Accepted

### تصمیم
Allowed — separate actors, separate sessions/tokens.

---

## ADR-012: Enterprise Completeness (Excellence Standard)

**وضعیت:** ✅ Accepted  
**تاریخ:** 1405/04

### زمینه
خطر پیاده‌سازی MVP حداقلی در schema، UI، flows.

### تصمیم
- مرجع اجباری: `docs/09-development/EXCELLENCE-STANDARDS.md`
- Database: base audit fields + soft delete + version + metadata on business tables
- UI: all page states; forms complete; flows with error paths
- «کامل» ≠ فیلد بی‌دلیل — هر فیلد use case دارد

### پیامد
- Cursor rule `08-excellence-completeness.mdc` alwaysApply
- Phase tasks implement با تکمیل §8 entity field lists

---

## ADR-013: Soft Delete Only — No Hard Delete

**وضعیت:** ✅ Accepted  
**تاریخ:** 1405/04

### زمینه
نیاز به حفظ همه داده‌ها، بازیابی، و پنهان‌سازی از کاربر.

### تصمیم
- **هیچ hard delete** روی business data
- همه entityها: `deletedAt`, `deletedById`
- Query پیش‌فرض: `deletedAt: null` + Prisma extension
- Restore: platform admin / tenant owner
- AuditLog/Outbox: append-only — never delete
- GDPR: pseudonymize + soft delete — not SQL DELETE
- Installment paid/waived: no delete at all (status terminal)

### پیامد
- `SOFT-DELETE-POLICY.md` + Cursor rule `09-soft-delete-mandatory.mdc`
- CI grep against `prisma.*.delete(`
- `onDelete: Cascade` forbidden for hard delete chains

---

## ADR-014: Documentation & Phase/Task Authoring Standards

**وضعیت:** ✅ Accepted  
**تاریخ:** 1405/04

### زمینه
یکسان‌سازی کیفیت docs و tasks؛ هدف self-review ≥95/100.

### تصمیم
- `DOCUMENTATION_AUTHORING_RULES.md` برای `docs/`
- `PHASE_EPIC_TASK_AUTHORING_RULES.md` برای `Phases/`
- ساختار: `Phase/Epic/TASK-NNN-slug.md` — یک task یک فایل
- Epic README اجباری؛ `TASK-TEMPLATE.md` به عنوان قالب
- Rubric امتیاز قبل از Approved

### پیامد
- Cursor rules `10-documentation-authoring`, `11-phase-epic-task-authoring`

---

## ADR-015: Staff–Branch Access & Active Branch Session

**وضعیت:** ✅ Accepted  
**تاریخ:** 1405/04

### زمینه

Multi-branch از روز ۱ در DB (ADR-009) اما Staff نباید FK تکی به یک شعبه داشته باشد.  
نیاز UX: پیش‌فرض شعبه در ثبت فروش + switch شعبه بدون re-login.

### تصمیم

1. **Staff → Tenant** برای identity؛ **Branch** via `assigned_branch_ids[]` + `data_scope`.
2. **`primary_branch_id`** optional — default UI برای create sale / reports.
3. **Active branch session** — Redis یا cookie + `X-Branch-Id`؛ **outside JWT**.
4. **Data scope filter** — `effectiveBranchIds` = assign ∩ active (if set).
5. **Transactional records** (`Sale`, …) — `branch_id NOT NULL` + composite index `(tenant_id, branch_id)`.
6. **Validation** — every assigned/default branch UUID ∈ same tenant, not soft-deleted.

### پیامد

- `docs/02-architecture/tenancy-and-entities.md` § Branch
- TASK-020, TASK-023, TASK-031, TASK-038, TASK-041, TASK-045, TASK-052, TASK-057 به‌روز
- Epic-04 README checklist

### Alternatives Considered

- `staff.branch_id` FK — rejected (multi-branch staff, owner all-branches)
- `branchId` in JWT — rejected (switch branch without token refresh)

---

## ADR-016: استراتژی API Versioning

**وضعیت:** ✅ Accepted  
**تاریخ:** 1405/04/08

### زمینه

با رشد تعداد clients (web، bot، آینده: POS API، شرکا)، نیاز به استراتژی روشن برای تغییرات API بدون شکستن clients قدیمی.

### تصمیم

1. **prefix ثابت:** `/api/v1/` برای همه endpoints
2. **breaking change → v2:** `/api/v2/` با parallel support حداقل ۶ ماه
3. **non-breaking:** اضافه کردن فیلد اختیاری یا endpoint جدید بدون version bump
4. **Zod در `packages/contracts`:** source of truth — OpenAPI از آن generate می‌شود
5. **deprecation notice:** header `X-Deprecated-Field` + changelog + ۶ ماه زمان migration

### مثال Breaking Changes

- حذف فیلد از response → v2
- تغییر نوع فیلد → v2
- تغییر معنای enum → v2
- تغییر URL → v2 + 301

### پیامد

- `docs/02-architecture/api-contracts.md` به عنوان مرجع API
- OpenAPI 3.1 برای هر version جدا
- Contract tests در CI (diff check)

---

## ADR-017: User Platform Identity

**وضعیت:** ✅ Accepted  
**تاریخ:** 1405/04/09

### زمینه

`phone` روی `Staff` و `GlobalCustomer` جدا بود — ثبت tenant دوم با همان phone مسدود می‌شد و هویت platform-per-actor تکراری بود.

### تصمیم

- **`User`** = هویت platform (phone unique)
- **`Staff`** = عضویت B2B per tenant — FK `userId`؛ unique `(tenantId, userId)`
- **`GlobalCustomer`** = پروفایل B2C — FK `userId` unique (1:1)
- **`TenantCustomer`** = junction tenant ↔ GlobalCustomer — **نه** مستقیم به User
- **`PlatformUser`** = جدا (تیم Hivork)
- Auth actors (`staff` / `customer`) و session جدا — User فقط identity مشترک
- Register tenant: OTP verify → verified token؛ **بدون** block global برای phone موجود
- Login staff چند-tenant: `NEED_TENANT_SLUG` وقتی بیش از یک Staff membership

### پیامد

- Migration backfill: users از distinct staff/global_customer phones
- API/DTO همچنان `phone` expose می‌کند (join از User)
- Pseudonymize customer: `User.phone` + GlobalCustomer fields
- مرجع: `docs/02-architecture/tenancy-and-entities.md` v1.1
- سند کامل: `docs/08-decisions/ADR-017-user-platform-identity.md`

---

## ADR-018: Notification Channel Abstraction

**وضعیت:** 📋 Proposed (فاز ۴)  
**تاریخ:** —

### زمینه

فاز ۴ نیاز به ارسال اعلان از کانال‌های Bale، SMS، و (آینده) Telegram دارد — بدون coupling مستقیم use case به adapter.

### تصمیم

- Port `INotificationChannel` + adapter per channel
- Fallback order در `NotificationService`
- `User.id` / chat_id به صورت string (Bale)

### پیامد

- Phase-4 tasks: Epic-01 Channel Abstraction
- **توجه:** ADR-017 قبلاً برای User Identity استفاده شده — channel abstraction = ADR-018

---

## ADR-019: User Platform Credential (Password)

**وضعیت:** ✅ Accepted  
**تاریخ:** 1405/04/10

### زمینه

OTP-only login در Phase 0 کافی بود؛ Enterprise login (§۱) نیاز به password، lockout، MFA step-up دارد. Credential باید platform-level روی `User` باشد (ADR-017).

### تصمیم

- `UserCredential` 1:1 با `User` — بدون `tenantId`
- Argon2id primary hash؛ bcrypt fallback via env
- `POST /api/v1/auth/password/set-initial` با `verifiedToken` (consume=false) قبل از register
- Soft delete + audit

### پیامد

- IFP-TASK-001 → IFP-002 password login
- سند کامل: `docs/08-decisions/ADR-019-user-credential.md`

---

## Template for Future ADRs

```markdown
## ADR-XXX: Title

**وضعیت:** Proposed | Accepted | Deprecated
**تاریخ:** 

### زمینه

### تصمیم

### پیامد

### Alternatives Considered
```
