# نقشه راه توسعه

## Timeline کلی (با AI-assisted development)

| بازه | تحویل |
|------|--------|
| **ماه ۱** | Foundation + پنل فروشنده |
| **ماه ۲** | ربات تلگرام + PWA مشتری |
| **ماه ۳** | بله + سایت فروش + beta (۱۰ tenant) |
| **ماه ۴+** | monetization + polish + native app (optional) |

---

## فاز ۰ — Foundation (هفته ۱–۲)

### تحویل

- [ ] Monorepo scaffold (pnpm + Turborepo)
- [ ] Docker Compose (PG 16, Redis 7)
- [ ] Prisma schema: Platform, **User**, Tenant, Branch, Staff, RBAC, GlobalCustomer, TenantCustomer
- [ ] packages/domain — core entities (**User**, Staff, GlobalCustomer, …)
- [ ] packages/contracts — Zod schemas
- [ ] Auth OTP flow (request + verify)
- [ ] Tenant context middleware
- [ ] RBAC guards (permission + data scope skeleton)
- [ ] Audit log infrastructure
- [ ] Module registry skeleton

### Vertical Slice Test

```
Staff login → create tenant → create customer → (empty dashboard)
```

---

## فاز ۱ — پنل فروشنده (هفته ۲–۵)

### Backend

- [ ] Installments module register
- [ ] CreateSale + generate installments
- [ ] ListInstallments (today, overdue)
- [ ] Customer CRUD + Excel import
- [ ] Settings CRUD (installments)
- [ ] Staff + Role management (core)
- [ ] Branch CRUD

### Frontend

- [ ] OTP login
- [ ] Dashboard (today due, overdue count)
- [ ] Customer list + create
- [ ] Sale create form
- [ ] Sale detail + installment list
- [ ] Overdue report
- [ ] Settings: reminders
- [ ] Staff + roles (owner only for role custom)

### Exit Criteria

فروشنده بتواند end-to-end: مشتری → فروش → اقساط → گزارش معوقات

---

## فاز ۲ — ربات تلگرام (هفته ۵–۷)

### bot-gateway

- [ ] Webhook setup
- [ ] Link token flow (`/start link_XXX`)
- [ ] Customer: list installments, report payment
- [ ] Seller: daily summary, payment reported alert
- [ ] Inline keyboards + deep links to PWA

### scheduler

- [ ] Daily overdue mark job
- [ ] Reminder scheduling (BullMQ delayed)
- [ ] SendReminderJob + idempotency log

### Exit Criteria

مشتری linked → یادآور دریافت → «پرداخت کردم» → فروشنده notify

---

## فاز ۳ — PWA مشتری + Payment Flow (هفته ۷–۹)

- [ ] Customer OTP login (separate from staff)
- [ ] Installment calendar (Jalali)
- [ ] Payment history
- [ ] Personal installments CRUD
- [ ] Staff: confirm/reject payment in panel
- [ ] PWA manifest + basic offline

---

## فاز ۴ — بله + Marketing (هفته ۹–۱۱)

- [ ] Bale adapter (clone telegram flows)
- [ ] Channel preference in settings
- [ ] Landing page + pricing + tenant register
- [ ] SEO basics

---

## فاز ۵ — Beta & Monetization (هفته ۱۱–۱۳)

- [ ] ۱۰ pilot tenants
- [ ] Import Excel polished
- [ ] Case study
- [ ] Subscription/plan enforcement
- [ ] Billing integration (manual invoice first — درگاه later)

---

## فاز ۶ — Post-Launch (ماه ۴+)

| Feature | Priority |
|---------|----------|
| SMS fallback | medium |
| Export PDF/Excel reports | medium |
| SSE real-time panel notifications | low |
| Native seller app (Flutter) | low |
| Payment gateway | when validated |
| POS API | year 2 |

---

## اولین Vertical Slice (کامل‌ترین demo)

```
1. Seller registers tenant (default branch)
2. Seller adds customer (phone)
3. Seller creates sale → 6 installments
4. Seller sends bot link to customer
5. Customer /start → sees installments
6. Scheduler sends reminder
7. Customer taps «پرداخت کردم»
8. Seller confirms in panel
9. Installment → paid
10. Dashboard updates
```

---

## User Journeys

### فروشنده — ثبت فروش جدید

```
Login → Dashboard → مشتریان → انتخاب/ایجاد مشتری
→ فروش جدید → مبلغ کل → پیش‌پرداخت → تعداد قسط → تاریخ اول
→ preview اقساط → تأیید → (optional) ارسال لینک ربات
```

### مشتری — پرداخت قسط

```
یادآور تلگرام → «پرداخت کردم» → pending
→ فروشنده تأیید → پیام تأیید به مشتری
```

### Owner — نقش سفارشی

```
Settings → نقش‌ها → ایجاد نقش → انتخاب permissions → data scope
→ Staff → assign role
```

---

## API Endpoints (خلاصه v1)

```
# Auth
POST   /api/v1/auth/otp/request
POST   /api/v1/auth/otp/verify
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

# Tenant / Core
GET    /api/v1/tenants/me
PATCH  /api/v1/tenants/me
GET    /api/v1/branches
POST   /api/v1/branches
GET    /api/v1/staff
POST   /api/v1/staff
GET    /api/v1/roles
POST   /api/v1/roles
GET    /api/v1/settings

# Installments
GET    /api/v1/customers
POST   /api/v1/customers
POST   /api/v1/customers/import
GET    /api/v1/sales
POST   /api/v1/sales
GET    /api/v1/sales/:id
POST   /api/v1/sales/:id/cancel
GET    /api/v1/installments
GET    /api/v1/installments/overdue
GET    /api/v1/installments/today
POST   /api/v1/payments/report
POST   /api/v1/payments/:id/confirm
POST   /api/v1/payments/:id/reject

# Customer portal
GET    /api/v1/my/installments
GET    /api/v1/my/personal-installments
POST   /api/v1/my/personal-installments

# Bot
POST   /api/v1/bot/link-token
POST   /webhooks/telegram
POST   /webhooks/bale

# Reports
GET    /api/v1/reports/dashboard
GET    /api/v1/reports/cashflow
```

---

## Definition of Done (هر feature)

- [ ] Domain rule + unit test
- [ ] Use case + integration test
- [ ] Permission guard
- [ ] Audit log (if sensitive)
- [ ] API contract (Zod)
- [ ] UI (if applicable)
- [ ] Docs updated
