# Epic-05 — Payments Frontend

## هدف Epic

UI **پرداخت‌ها** (لیست تراکنش‌ها، فیلتر روش، جزئیات، استرداد/ابطال) و **چک‌ها** (لیست، ثبت، وصول، برگشتی، تصویر).

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-117 | [IFP-TASK-117-frontend-payments-checks.md](./IFP-TASK-117-frontend-payments-checks.md) | Frontend — پرداخت‌ها و چک‌ها | IFP-103–116 | P0 |

## Dependency داخلی Epic

```
IFP-103–116 → IFP-117
```

## Policy notes

- Excellence §7 — loading, empty, error, no-permission
- Tabs: تراکنش‌ها | چک‌ها | تسویه | مغایرت
- bigint amounts formatted فارسی
