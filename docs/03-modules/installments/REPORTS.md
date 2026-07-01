# گزارش‌ها و KPIها — ماژول اقساط
# Reports & KPIs — Installments Module

> **وضعیت:** Approved — v1.0  
> **نسخه:** 1.0 — 1405/04/08  
> **ADR مرتبط:** ADR-001, ADR-007, ADR-015  
> **مراجع:**
> - [RBAC](../../02-architecture/rbac.md) — دسترسی گزارش‌ها
> - [domain.md](./domain.md)
> - [STAFF-FLOWS.md](./STAFF-FLOWS.md)

---

## ۱. داشبورد اصلی (Dashboard)

### ۱.۱ کارت‌های خلاصه (Summary Cards)

| کارت | محاسبه | به‌روزرسانی |
|------|--------|------------|
| قسط‌های سررسید امروز | `status IN (pending, overdue) AND due_date = today` | real-time |
| معوقات | `status = overdue` | real-time |
| دریافتی امروز | `sum(amountRial) WHERE paidAt = today` | real-time |
| دریافتی این ماه | `sum(amountRial) WHERE paidAt IN current_month` | real-time |
| فروش‌های فعال | `count WHERE status = active` | real-time |
| مشتریان با بدهی | `count tenantCustomers WITH overdue > 0` | real-time |

### ۱.۲ جدول قسط‌های سررسید امروز

```sql
SELECT
    i.id,
    i.sequence_number,
    i.amount_rial,
    i.due_date,
    i.status,
    s.title as sale_title,
    tc.display_name as customer_name,
    tc.phone
FROM installments i
JOIN sales s ON i.sale_id = s.id
JOIN tenant_customers tc ON s.tenant_customer_id = tc.id
WHERE
    i.tenant_id = :tenantId
    AND i.due_date::date = CURRENT_DATE
    AND i.status IN ('pending', 'overdue')
    AND i.deleted_at IS NULL
    -- data scope: AND s.branch_id IN (:branchIds)
ORDER BY i.due_date ASC
```

### ۱.۳ نمودار دریافتی ۳۰ روز گذشته

```
نوع: Bar Chart
محور X: تاریخ شمسی
محور Y: مبلغ (تومان)
داده: مجموع amountRial به تفکیک روز — status = paid
```

---

## ۲. گزارش معوقات (Overdue Report)

### هدف
شناسایی مشتریانی که قسط‌های سررسید گذشته دارند برای پیگیری.

### فیلترها

| فیلتر | نوع | توضیح |
|-------|-----|-------|
| شعبه | dropdown | بر اساس دسترسی |
| بازه معوق | range | مثلاً: ۷–۳۰ روز |
| مشتری | text search | |
| حداقل مبلغ معوق | number | |
| مرتب‌سازی | select | مبلغ، تعداد روز، نام |

### ستون‌های خروجی

| ستون | توضیح |
|------|-------|
| مشتری | نام + شماره |
| تعداد اقساط معوق | count |
| مجموع مبلغ معوق (ریال) | sum |
| قدیمی‌ترین سررسید | oldest due_date |
| آخرین پرداخت | آخرین paidAt |
| وضعیت اتصال ربات | linked / not linked |

### Query

```sql
SELECT
    tc.id as customer_id,
    tc.display_name,
    tc.phone,
    COUNT(i.id) as overdue_count,
    SUM(i.amount_rial) as total_overdue_rial,
    MIN(i.due_date) as oldest_due_date,
    MAX(pa_last.paid_at) as last_payment_at,
    bi.id IS NOT NULL as bot_linked
FROM tenant_customers tc
JOIN sales s ON s.tenant_customer_id = tc.id
JOIN installments i ON i.sale_id = s.id
LEFT JOIN (
    SELECT installment_id, MAX(paid_at) as paid_at
    FROM payment_attempts
    WHERE status = 'confirmed'
    GROUP BY installment_id
) pa_last ON pa_last.installment_id = i.id
LEFT JOIN bot_identities bi ON bi.global_customer_id = tc.global_customer_id
WHERE
    tc.tenant_id = :tenantId
    AND i.status = 'overdue'
    AND i.deleted_at IS NULL
    AND s.deleted_at IS NULL
GROUP BY tc.id, tc.display_name, tc.phone, bi.id
ORDER BY total_overdue_rial DESC
```

---

## ۳. گزارش جریان نقدی (Cashflow Forecast)

### هدف
پیش‌بینی دریافتی‌های آینده بر اساس اقساط pending.

### نمایش

```
نمودار: Stacked Bar — به تفکیک ماه
۱۴۰۵/۰۴: ۱۲,۵۰۰,۰۰۰ تومان (۸ قسط)
۱۴۰۵/۰۵: ۱۸,۰۰۰,۰۰۰ تومان (۱۲ قسط)
۱۴۰۵/۰۶: ۲۲,۵۰۰,۰۰۰ تومان (۱۵ قسط)
...تا ۶ ماه آینده
```

### Query

```sql
SELECT
    DATE_TRUNC('month', i.due_date) as month,
    COUNT(i.id) as installment_count,
    SUM(i.amount_rial) as expected_rial
FROM installments i
JOIN sales s ON i.sale_id = s.id
WHERE
    i.tenant_id = :tenantId
    AND i.status IN ('pending', 'overdue')
    AND i.due_date BETWEEN NOW() AND NOW() + INTERVAL '6 months'
    AND i.deleted_at IS NULL
    -- scope: AND s.branch_id IN (:branchIds)
GROUP BY DATE_TRUNC('month', i.due_date)
ORDER BY month ASC
```

---

## ۴. گزارش اعتبار مشتری (Customer Credit Report)

### هدف
ارزیابی تاریخچه پرداخت مشتری برای تصمیم‌گیری درباره فروش‌های جدید.

### معیارهای محاسبه

| معیار | وزن | توضیح |
|-------|-----|-------|
| درصد پرداخت به موقع | ۴۰٪ | paid / (paid + overdue) |
| تعداد فروش‌های تکمیل‌شده | ۲۰٪ | completed sales |
| میانگین روزهای تأخیر | ۲۰٪ | avg(paidAt - dueDate) |
| مبلغ معوق جاری | ۲۰٪ | current overdue amount |

### نمایش

```
─────────────────────────────────────────
پروفایل مشتری: علی محمدی
─────────────────────────────────────────
تعداد فروش: ۵
تکمیل‌شده: ۳
فعال: ۲

درصد پرداخت به موقع: ۸۷٪ 🟢
میانگین تأخیر: ۳.۲ روز
معوق جاری: ۱,۵۰۰,۰۰۰ تومان

امتیاز اعتباری: ۷۸/۱۰۰ (خوب)
```

---

## ۵. گزارش تجمیعی مالی (Financial Summary)

### محدوده دسترسی
- owner: همه شعبه‌ها
- manager: همه شعبه‌ها
- cashier: شعبه خود فقط

### بازه‌های زمانی
- روزانه
- هفتگی
- ماهانه
- سه‌ماهه
- سالانه
- سفارشی

### ستون‌های گزارش

| ستون | توضیح |
|------|-------|
| بازه زمانی | |
| تعداد فروش جدید | |
| جمع مبلغ فروش‌های جدید | |
| تعداد اقساط دریافتی | |
| جمع مبلغ دریافتی | |
| تعداد اقساط معوق | |
| جمع معوق | |
| نرخ وصول | دریافتی / (دریافتی + معوق) |

---

## ۶. Export گزارش‌ها

### فرمت‌های پشتیبانی‌شده

| فرمت | کاربرد | permission |
|------|--------|-----------|
| Excel (.xlsx) | گزارش‌های مالی، لیست مشتریان | `installments.report.export` |
| CSV | import در سیستم‌های دیگر | `installments.report.export` |
| PDF | گزارش رسمی | `installments.report.export` |

### محدودیت‌های Export

- حداکثر ۵۰,۰۰۰ ردیف در هر export
- فایل‌های بزرگ‌تر: async generation + download link
- PII: شماره تلفن‌ها ماسک می‌شوند در گزارش‌های viewer

---

## ۷. KPIهای کلیدی

### KPI فروشنده (Tenant-level)

| KPI | فرمول | هدف |
|-----|-------|-----|
| نرخ وصول | sum(paid) / sum(total) | > 90% |
| میانگین تأخیر پرداخت | avg(paidAt - dueDate) | < 5 روز |
| نرخ واکنش مشتری | customers who paid / total active customers | > 80% |
| نرخ بات اتصال | linked customers / total customers | > 60% |
| معوقات بیش از ۳۰ روز | count overdue > 30d | < 5% |

### KPI پلتفرم (Platform-level)

| KPI | توضیح |
|-----|-------|
| تعداد فروش ماهانه | growth metric |
| تعداد tenantهای فعال | tenants with ≥1 sale/month |
| میانگین اقساط per tenant | depth metric |
| نرخ churm tenant | tenants با ۰ فروش در ۳۰ روز |

---

## ۸. الگوی Query — Cursor Pagination

همه لیست‌های API از cursor pagination استفاده می‌کنند:

```typescript
// Request
GET /api/v1/installments?limit=20&cursor=<lastId>&status=overdue

// Response
{
  "data": [...],
  "pagination": {
    "limit": 20,
    "nextCursor": "uuid-of-last-item",
    "hasMore": true
  }
}
```

```typescript
// Repository pattern
async findOverdue(query: OverdueQuery, ctx: TenantContext) {
  const items = await this.prisma.installment.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: 'overdue',
      ...(ctx.branchIds && { sale: { branchId: { in: ctx.branchIds } } }),
      deletedAt: null,
      ...(query.cursor && { id: { gt: query.cursor } }),
    },
    take: query.limit + 1,  // یکی اضافه برای تشخیص hasMore
    orderBy: { dueDate: 'asc' },
    include: { sale: { include: { tenantCustomer: true } } },
  });

  const hasMore = items.length > query.limit;
  if (hasMore) items.pop();

  return {
    data: items,
    pagination: {
      nextCursor: hasMore ? items[items.length - 1].id : null,
      hasMore,
    },
  };
}
```

---

## ۹. Cache Strategy گزارش‌ها

| گزارش | Cache TTL | Invalidation |
|-------|-----------|-------------|
| Dashboard cards | 30 ثانیه | پس از هر payment.confirm |
| Overdue list | 5 دقیقه | پس از daily job |
| Cashflow forecast | 1 ساعت | پس از create/cancel sale |
| Customer credit | 1 ساعت | پس از payment.confirm |

Cache key: `report:{tenantId}:{reportType}:{filters_hash}`

---

*نسخه 1.0 — 1405/04/08*
