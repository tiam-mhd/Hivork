# Epic-02 — Payment Methods Unified API

## هدف Epic

API **یکپارچه** روش‌های پرداخت (آنلاین، حضوری، نقدی، کارت، چک، حواله، کیف پول) با contracts مشترک و تنظیمات فعال/غیرفعال per tenant.

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-104 | [IFP-TASK-104-contracts-unified-payment-methods.md](./IFP-TASK-104-contracts-unified-payment-methods.md) | Contracts — unified payment methods | IFP-086, IFP-101 | P0 |
| IFP-105 | [IFP-TASK-105-usecase-unified-payment-api.md](./IFP-TASK-105-usecase-unified-payment-api.md) | Use Case + API — gateway یکپارچه | IFP-104, IFP-103 | P0 |
| IFP-106 | [IFP-TASK-106-payment-method-settings.md](./IFP-TASK-106-payment-method-settings.md) | Settings — فعال‌سازی روش‌های پرداخت | IFP-104 | P1 |

## Dependency داخلی Epic

```
IFP-104 → IFP-105
IFP-104 → IFP-106
```

## Policy notes

- Idempotency برای POST مالی
- Method enum: `cash`, `card`, `pos`, `bank_transfer`, `check`, `online`, `wallet`
- Plan entitlement: برخی methods فقط در plan بالاتر
