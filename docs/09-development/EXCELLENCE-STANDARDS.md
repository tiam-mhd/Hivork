# استاندارد تعالی — Hivork Excellence Standards

> **وضعیت:** اجباری — مکمل `DEVELOPMENT_RULES.md`  
> **اصل:** Hivork محصول **enterprise-grade** است، نه MVP سطحی.  
> **قاعده:** اگر فیلد، state، یا UX path «منطقی» است برای کاربر حرفه‌ای — **باید** در طراحی باشد.

---

## ۱. فلسفه

| ❌ نادرست | ✅ درست |
|----------|---------|
| «بعداً اضافه می‌کنیم» | از اول کامل طراحی، feature-flag اگر لازم |
| فیلدهای حداقلی | هر فیلدی که فروشنده/مشتری/پشتیبانی به آن نیاز دارد |
| فرم فقط name + phone | فرم با validation، help، states، accessibility |
| Happy path فقط | تمام edge cases + error paths |
| صفحه فقط جدول | loading, empty, error, filter, sort, export, actions |

**توجه:** کامل بودن ≠ شلوغ بی‌دلیل. هر فیلد باید **use case** داشته باشد.

---

## ۲. استاندارد جداول (Database / Prisma)

### ۲.۱ فیلدهای پایه — **هر جدول**

| فیلد | نوع | الزام |
|------|-----|--------|
| `id` | UUID | ✅ |
| `createdAt` | timestamptz | ✅ |
| `updatedAt` | timestamptz | ✅ |
| `createdById` | UUID? FK | ✅ (except system tables) |
| `updatedById` | UUID? FK | ✅ |
| `deletedAt` | timestamptz? | ✅ soft delete |
| `deletedById` | UUID? | ✅ |
| `version` | Int @default(1) | ✅ optimistic lock (مالی/حساس) |
| `metadata` | Json? | ✅ extensibility بدون migration |

### ۲.۲ فیلدهای tenant-scoped — **هر جدول tenant**

| فیلد | الزام |
|------|--------|
| `tenantId` | ✅ NOT NULL + index |
| `branchId` | ✅ اگر داده branch-specific |

### ۲.۳ Indexing — **اجباری بررسی**

- FK columns → index
- `(tenantId, status)` composite
- `(tenantId, createdAt DESC)` for lists
- Unique business keys: `(tenantId, userId)` on Staff, `User.phone` platform-wide, `(tenantId, localCode)` on TenantCustomer
- Full-text search columns (phase 2+) — plan now

### ۲.۴ Enum / Status

- هر entity با lifecycle → enum صریح (نه string آزاد)
- State machine documented در `docs/03-modules/`
- `statusReason` / `suspendedReason` where applicable

### ۲.۵ Relations

- `onDelete: Restrict` یا `SetNull` — **هرگز Cascade hard delete**
- Soft delete parent ≠ hard delete children — children stay for financial/legal history
- جداول junction: soft delete via flag or unlink record
- تاریخچه جدا (audit) برای تغییرات حساس — append-only

### ۲.۶ Soft Delete — **اجباری ۱۰۰٪**

> مرجع کامل: **`SOFT-DELETE-POLICY.md`**

| قانون | |
|-------|---|
| Hard delete | ❌ ممنوع — هیچ استثنای business data |
| Soft delete | ✅ `deletedAt` + `deletedById` روی **همه** جداول business |
| Query default | `deletedAt: null` — Prisma extension |
| Restore | platform admin + tenant owner — API + audit |
| کاربر | deleted = invisible — داده در DB باقی |
| GDPR | pseudonymize + soft delete — نه DELETE |

### ۲.۷ Checklist قبل از merge schema

```
[ ] Soft delete fields (deletedAt, deletedById) — SOFT-DELETE-POLICY
[ ] No onDelete: Cascade hard delete
[ ] Prisma extension plan for soft delete filter
[ ] Version (if financial or concurrent edit)
[ ] metadata JSON
[ ] All FKs indexed
[ ] tenantId + data scope columns
[ ] Comments در schema برای فیلدهای غیر obvious
[ ] Seed data covers all enums
```

---

## ۳. استاندارد Domain / Backend Logic

### ۳.۱ هر Use Case

| بخش | الزام |
|-----|--------|
| Input validation | Zod + domain rules |
| Authorization | permission + module + data scope |
| Idempotency | POST مالی/حساس |
| Transaction | multi-aggregate atomic |
| Audit log | actions حساس |
| Domain events | side effects via outbox |
| Error codes | documented, fa-IR message map |
| Logging | structured, no PII |

### ۳.۲ هر Query List API

```
- cursor pagination (not offset)
- sort (whitelist fields)
- filter (status, date range, branch, search)
- include relations (optional ?include=)
- count total (or hasNext)
- max limit enforced
```

### ۳.۳ Edge Cases — **همیشه پیاده یا document**

- Duplicate create (unique violation → 409)
- Concurrent update (version mismatch → 409)
- Soft-deleted record access
- Tenant suspended → block writes
- Plan limit exceeded → 403 `PLAN_LIMIT_EXCEEDED`
- Empty/null optional fields vs required

---

## ۴. استاندارد API Contracts

- Request + Response Zod schemas
- OpenAPI description per field (description fa)
- Examples in schema comments
- Error responses per endpoint
- Deprecation policy for breaking changes

---

## ۵. استاندارد فرم‌ها (Frontend)

### ۵.۱ هر فیلد فرم

| Element | الزام |
|---------|--------|
| Label (fa) | ✅ |
| Placeholder | ✅ |
| Help text / tooltip | ✅ برای فیلدهای غیر obvious |
| Validation message (fa) | ✅ client + server sync |
| Required indicator | ✅ |
| Disabled/readonly state | ✅ when applicable |
| Format hint (phone, money) | ✅ |

### ۵.۲ Form-level

```
[ ] React Hook Form + Zod from @hivork/contracts
[ ] Submit loading state (disable double submit)
[ ] Server error mapping per field
[ ] Unsaved changes warning (beforeunload / router)
[ ] Success toast + redirect/next action
[ ] Reset / Clear option
[ ] Keyboard: Enter submit, Esc close modal
[ ] Mobile: input type correct (tel, numeric)
[ ] RTL: labels, errors aligned
[ ] Accessibility: aria-invalid, aria-describedby
```

### ۵.۳ فرم‌های مالی

- Input تومان با format on blur
- Preview محاسبات (e.g. installment breakdown)
- Confirm dialog before submit
- نمایش bigint-safe (string)

---

## ۶. استاندارد Flow / UX

### ۶.۱ هر User Flow

Document قبل از code:

```
1. Entry points (منو، deep link، notification)
2. Preconditions (auth، permission، module)
3. Steps (happy path)
4. Alternative paths (edit mid-flow، cancel)
5. Error paths (network، validation، 403)
6. Exit points (success destination)
7. Recovery (retry، support link)
```

### ۶.۲ Multi-step flows

- Progress indicator (step 1/3)
- Back button preserves data
- Summary step before confirm
- Cannot skip validation steps

### ۶.۳ Feedback

| Event | UX |
|-------|-----|
| Success | toast + clear next action |
| Error | inline + toast, actionable message |
| Long operation | skeleton / progress |
| Empty | illustration + CTA |
| Permission denied | explain + contact owner |

### ۶.۴ لیست‌ها / جداول UI

```
[ ] Search / filter bar
[ ] Column sort
[ ] Pagination or infinite scroll
[ ] Row actions (menu)
[ ] Bulk actions (if applicable)
[ ] Empty state
[ ] Loading skeleton
[ ] Error retry
[ ] Export (CSV/Excel) where business needs
[ ] Responsive: card view mobile optional
[ ] Sticky header / actions
```

---

## ۷. استاندارد صفحات (Pages)

### ۷.۱ Anatomy — **هر صفحه admin**

```
┌─────────────────────────────────────┐
│ Breadcrumb                          │
│ Page title + primary action(s)      │
│ Description/subtitle (optional)     │
├─────────────────────────────────────┤
│ Filters / tabs / date range         │
├─────────────────────────────────────┤
│ Main content (table/form/dashboard) │
├─────────────────────────────────────┤
│ Secondary: help link, docs          │
└─────────────────────────────────────┘
```

### ۷.۲ Dashboard widgets

- KPI cards with trend (vs yesterday/week)
- Actionable lists (today due → click → detail)
- Quick actions
- Refresh + last updated time

### ۷.۳ Page states — **همه mandatory**

| State | Required |
|-------|----------|
| Loading | skeleton |
| Empty | message + CTA |
| Error | retry button |
| Partial load | show cached + refresh |
| No permission | explain role needed |

---

## ۸. استاندارد Entity-Specific Completeness

### Tenant

```
name, slug, legalName?, taxId?, logoUrl?, address?, phone?, email?,
status, statusReason, planId, trialEndsAt, enabledModules,
timezone, locale, suspendedAt, settings snapshot, onboardingCompletedAt,
metadata
```

### User (ADR-017)

```
phone (unique platform-wide), name?, avatarUrl?, status, lastLoginAt, metadata
```

### Staff

```
userId (FK → User), name, email?, nationalId?, avatarUrl?, jobTitle?,
status, dataScope, assignedBranchIds, primaryBranchId?, lastLoginAt, invitedAt,
invitedById, passwordless only (OTP), metadata
```

**Phone in API/DTO:** join از `User` — نه ستون Staff.

**Branch rules (ADR-015):**

- `assignedBranchIds` — UUID[]؛ خالی = همه شعب tenant؛ هر id باید همان tenant باشد
- `primaryBranchId` — optional؛ پیش‌فرض UI (ثبت فروش)؛ ∈ assigned یا default branch وقتی assign خالی
- Active branch session — Redis/cookie + `X-Branch-Id`؛ **not** in JWT
- هر جدول عملیاتی branch-scoped: `branchId NOT NULL` + `@@index([tenantId, branchId])`

### GlobalCustomer / TenantCustomer

```
userId (FK → User, 1:1 GlobalCustomer), name, email?, nationalId?, birthDate?, gender?, address?,
localCode, tags[], notes, internalNotes (staff only),
creditScore, overdueCount, totalPurchaseRial, lastPurchaseAt,
preferredContactChannel, marketingOptIn, defaultBranchId, metadata
```

**Phone in API/DTO:** از join `User.phone` — TenantCustomer **مستقیم** به User FK ندارد (ADR-017).

### Sale (phase 1+)

```
title, description?, invoiceNumber?, totalAmountRial, downPaymentRial,
discountRial?, taxRial?, installmentCount, firstDueDate, scheduleType,
branchId, sellerId, customerId, contractDate, status, cancelledReason,
attachments[], metadata + full installment relation
```

**`branchId` — NOT NULL** از اولین migration فروش؛ FK `branches`؛ index `(tenant_id, branch_id)`.

---

## ۹. Checklist قبل از «Done»

### Database
- [ ] Excellence §2 checklist
- [ ] Migration + seed updated

### Backend
- [ ] Excellence §3 checklist
- [ ] Integration tests for edge cases

### Frontend
- [ ] Excellence §5–7 checklist
- [ ] All page states implemented
- [ ] RTL + mobile checked

### Flow
- [ ] Flow document updated in task or docs
- [ ] Error paths tested manually

### Code Review & Git
- [ ] PR Author Checklist از `CODE-REVIEW-GUIDE.md` §3 تکمیل شده
- [ ] هیچ Red Flag از `CODE-REVIEW-GUIDE.md` §5 وجود ندارد
- [ ] Branch naming از `BRANCHING-STRATEGY.md` §2 رعایت شده
- [ ] Commit messages از `BRANCHING-STRATEGY.md` §3 رعایت شده

---

## ۱۰. رابطه با Phase Tasks

- هر TASK در `Phases/` **باید** این سند را رعایت کند
- اگر TASK فیلدی ندارد → در implementation **اضافه** شود مگر ADR خلاف آن
- TASK جدید یا به‌روزرسانی schema → §8 entity list مرجع

---

---

*نسخه 1.1 — 1405/04/08*
