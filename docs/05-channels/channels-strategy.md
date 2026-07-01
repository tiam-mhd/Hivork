# استراتژی کانال‌ها و UI — Hivork

> **وضعیت:** Approved — v1.0  
> **نسخه:** 1.0 — 1405/04/08  
> **ADR مرتبط:** ADR-006

## اولویت توسعه (تأیید شده — به‌روز 1405/04/09)

| # | کانال | اولویت | وضعیت |
|---|-------|--------|--------|
| 1 | **پنل وب فروشنده** | حیاتی | فاز ۱ |
| 2 | **ربات بله** (فروشنده + مشتری) | حیاتی | **فاز ۴ — اجرای فعلی** |
| 3 | **PWA / وب مشتری** | مهم | فاز ۳ |
| 4 | **ربات تلگرام** | deferred | بعد از PWA — تحریم |
| 5 | **سایت فروش (Landing)** | موازی | فاز ۴ |
| 6 | **اپ Native فروشنده** | بعداً | ماه ۴+ |
| 7 | **اپ Native مشتری** | آخر / skip | — |

---

## چرا Native App فعلاً نه؟

| مورد | Bot + PWA | Native |
|------|-----------|--------|
| نصب مشتری | zero friction | سد اپ‌استور |
| هزینه نگه‌داری | یک codebase web | iOS + Android |
| یادآور | تلگرام native push | نیاز permission |
| تقویم | PWA کافی | overkill |

Native فروشنده: وقتی فروشنده پولی + daily active دارید.

---

## پنل وب فروشنده

### Route Structure

```
/admin/login
/admin/dashboard
/admin/customers
/admin/customers/import
/admin/sales
/admin/sales/new
/admin/sales/:id
/admin/installments/overdue
/admin/installments/today
/admin/reports
/admin/settings
/admin/settings/reminders
/admin/staff
/admin/roles
/admin/branches
```

### Tech

- Next.js App Router `(seller)/admin`
- TanStack Query
- shadcn/ui + RTL
- Recharts (dashboard)

---

## پورتال مشتری (PWA)

### Route Structure

```
/my/login
/my/dashboard
/my/installments              # tenant installments
/my/installments/calendar
/my/personal                   # personal installments
/my/personal/new
/my/settings
/my/link-bot
```

### PWA

- `manifest.json` — fa-IR
- Service worker — cache سبک
- «Add to Home Screen» prompt

---

## Marketing Site

```
/                  # landing
/pricing
/features/installments
/register          # tenant signup
/blog              # SEO (future)
```

---

## Deep Links

### Bot Onboarding

```
https://ble.ir/HivorkBot?start=link_ABC123     # بله — کانال اصلی (فاز ۴)
https://t.me/HivorkBot?start=link_ABC123       # تلگرام — deferred (فاز ۲)
```

`ABC123` = one-time token از `POST /api/v1/bot/link-token`

مرجع API بله: [bale-api-reference.md](./bale-api-reference.md) · [docs.bale.ai](https://docs.bale.ai/)

---

## Staff vs Customer Session

| | Staff | Customer |
|---|-------|----------|
| Login path | `/admin/login` | `/my/login` |
| JWT claim | `actor: staff`, `tenant_id` | `actor: customer` |
| Cookie namespace | `hivork_staff` | `hivork_customer` |
| Cross-access | **ممنوع** | **ممنوع** |

---

## Responsive Strategy

- Seller panel: desktop-first (فروشنده پشت میز) + responsive tablet
- Customer portal: mobile-first
- Marketing: responsive
