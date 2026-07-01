# Phase 4 — Bale + Marketing (بازوی بله + سایت فروش)

| Epic | تسک‌ها | حوزه |
|------|--------|------|
| [Epic-01-Channel-Abstraction](./Epic-01-Channel-Abstraction/) | TASK-124 → 126 | معماری کانال |
| [Epic-02-Bale-Infrastructure](./Epic-02-Bale-Infrastructure/) | TASK-127 → 129 | HTTP + Webhook بله |
| [Epic-03-Notification-Database](./Epic-03-Notification-Database/) | TASK-130 → 133 | DB + Redis |
| [Epic-04-Bot-Link-API](./Epic-04-Bot-Link-API/) | TASK-134 → 137 | لینک بازو |
| [Epic-05-Bot-Gateway-Bale](./Epic-05-Bot-Gateway-Bale/) | TASK-138 → 141 | bot-gateway |
| [Epic-06-Customer-Bot-Flows](./Epic-06-Customer-Bot-Flows/) | TASK-142 → 145 | فلو مشتری |
| [Epic-07-Seller-Bot-Flows](./Epic-07-Seller-Bot-Flows/) | TASK-146 → 149 | فلو فروشنده |
| [Epic-08-Scheduler-Notifications](./Epic-08-Scheduler-Notifications/) | TASK-150 → 154 | یادآور BullMQ |
| [Epic-09-Channel-Settings](./Epic-09-Channel-Settings/) | TASK-155 → 157 | تنظیمات کانال |
| [Epic-10-Marketing-Foundation](./Epic-10-Marketing-Foundation/) | TASK-158 → 159 | اسکلت مارکتینگ |
| [Epic-11-Marketing-Pages](./Epic-11-Marketing-Pages/) | TASK-160 → 162 | صفحات عمومی |
| [Epic-12-Tenant-Self-Register](./Epic-12-Tenant-Self-Register/) | TASK-163 → 165 | ثبت‌نام tenant |
| [Epic-13-SEO-Blog](./Epic-13-SEO-Blog/) | TASK-166 → 168 | SEO + بلاگ |
| [Epic-14-Phase4-Tests](./Epic-14-Phase4-Tests/) | TASK-169 → 173 | تست |
| [Epic-15-Phase4-Vertical-Slice](./Epic-15-Phase4-Vertical-Slice/) | TASK-174 | E2E |

**مجموع:** 51 تسک (TASK-124 → TASK-174)

---

## ترتیب اجرا (تصمیم محصول)

> **تغییر نقشه راه (1405/04/09):** به‌دلیل محدودیت و تحریم تلگرام، **فاز ۴ (بله + مارکتینگ) اکنون اجرا می‌شود** و **ربات تلگرام به فاز ۲ (منتقل‌شده / deferred)** موکول شده است.

```
اجرای فعلی:  Phase 1 ✅ → Phase 4 (این فاز) → Phase 3 (PWA) → Phase 2 Telegram (بعداً)
```

---

## هدف فاز

1. **بازوی بله** — لینک مشتری/فروشنده، لیست اقساط، «پرداخت کردم»، یادآورهای زمان‌بندی‌شده
2. **Notification Engine** — adapter بله، idempotency، BullMQ scheduler
3. **سایت مارکتینگ** — Landing، Pricing، Features، ثبت‌نام خودکار tenant، SEO

---

## Exit Criteria (فاز کامل شد وقتی…)

- [ ] همه تسک‌های **P0** (TASK-124 → TASK-174) Done
- [ ] Vertical slice E2E pass (TASK-174):
  - Tenant از سایت ثبت‌نام → ورود پنل
  - فروشنده لینک بله به مشتری می‌دهد
  - مشتری `/start link_*` → اقساط را می‌بیند
  - Scheduler یادآور بله می‌فرستد
  - مشتری «پرداخت کردم» → فروشنده در پنل notify می‌شود
- [ ] Webhook بله روی HTTPS (443) با secret verification
- [ ] Rate limit 429 بله handle می‌شود (`retry_after`)
- [ ] `answerCallbackQuery` روی همه callbackها
- [ ] هیچ business logic در bot controller — فقط use case
- [ ] `operational-phases.md` و `channels-strategy.md` sync
- [ ] self-review ≥ **95/100** روی همه task specs

---

## Epics (جدول کامل)

| Epic | ID Range | عنوان | Priority |
|------|----------|--------|----------|
| Epic-01 | TASK-124–126 | Channel Abstraction + Contracts | P0 |
| Epic-02 | TASK-127–129 | Bale HTTP + Webhook Infra | P0 |
| Epic-03 | TASK-130–133 | NotificationLog + StaffBotIdentity | P0 |
| Epic-04 | TASK-134–137 | Bot Link Token API | P0 |
| Epic-05 | TASK-138–141 | Bot Gateway (Bale) | P0 |
| Epic-06 | TASK-142–145 | Customer Bot Flows | P0 |
| Epic-07 | TASK-146–149 | Seller Bot Flows | P0 |
| Epic-08 | TASK-150–154 | Scheduler + Bale Notifications | P0 |
| Epic-09 | TASK-155–157 | Channel Settings | P0 |
| Epic-10 | TASK-158–159 | Marketing Foundation | P0 |
| Epic-11 | TASK-160–162 | Marketing Pages | P0 |
| Epic-12 | TASK-163–165 | Tenant Self-Register | P0 |
| Epic-13 | TASK-166–168 | SEO + Blog Shell | P1 |
| Epic-14 | TASK-169–173 | Phase 4 Tests | P0 |
| Epic-15 | TASK-174 | Vertical Slice E2E | P0 |

---

## ترتیب اجرا (dependency graph)

```
Phase 1 Done (TASK-123 ✅)
         │
         ▼
    TASK-124 → 126 (abstraction + contracts)
         │
         ▼
    TASK-127 → 129 (Bale infra)
         │
         ▼
    TASK-130 → 133 (DB + repos)
         │
    ┌────┴────┐
    ▼         ▼
TASK-134→137  TASK-150→154 (scheduler — parallel after 133)
    │              │
    ▼              │
TASK-138→141       │
    │              │
    ▼              │
TASK-142→145       │
    │              │
    ▼              │
TASK-146→149       │
    │              │
    └──────┬───────┘
           ▼
    TASK-155 → 157 (settings)
           │
           ▼
    TASK-158 → 162 (marketing pages — parallel with bot)
           │
           ▼
    TASK-163 → 165 (self-register)
           │
           ▼
    TASK-166 → 168 (SEO — P1)
           │
           ▼
    TASK-169 → 173 (tests)
           │
           ▼
    TASK-174 (vertical slice)
```

---

## وابستگی به فاز قبل

| پیش‌نیاز Phase 1 | استفاده در Phase 4 |
|------------------|---------------------|
| TASK-123 (vertical slice) | tenant، customer، sale، installment |
| TASK-022 BotIdentity schema | لینک مشتری بله |
| TASK-008 bot-gateway skeleton | فعال‌سازی webhook بله |
| TASK-009 scheduler skeleton | BullMQ jobs |
| TASK-048 settings service | کانال یادآور |
| TASK-055 onboarding | self-register از مارکتینگ |

**بدون Phase 3 (PWA):** فلو «پرداخت کردم» از بازو → `PaymentAttempt` pending → تأیید در **پنل فروشنده** (Phase 1) کافی است.

---

## قوانین

- API بله: **فقط** [bale-api-reference.md](../../docs/05-channels/bale-api-reference.md) (منبع رسمی docs.bale.ai)
- قبل از هر تسک: `AGENTS.md` + `DEVELOPMENT_RULES.md` + `EXCELLENCE-STANDARDS.md`
- نگارش Task: [PHASE_EPIC_TASK_AUTHORING_RULES.md](../../docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md)

---

## مراجع docs

| موضوع | سند |
|--------|-----|
| API بله | [bale-api-reference.md](../../docs/05-channels/bale-api-reference.md) |
| کانال‌ها | [channels-strategy.md](../../docs/05-channels/channels-strategy.md) |
| Notification | [notifications.md](../../docs/05-channels/notifications.md) |
| فلو مشتری | [CUSTOMER-FLOWS.md](../../docs/03-modules/installments/CUSTOMER-FLOWS.md) |
| Roadmap | [operational-phases.md](../../docs/07-roadmap/operational-phases.md) |

---

*Phase 4 — Bale + Marketing — TASK-124 → TASK-174*
