# Epic-03 — Guarantor & Collateral

> **Phase:** 04 — Contract Enterprise  
> **تسک‌ها:** IFP-065 → IFP-067  
> **Priority:** P0

---

## هدف Epic

مدیریت **ضامن** و **وثیقه** قرارداد — schema، domain validation، CRUD API با RBAC و audit.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-065 | [IFP-TASK-065-prisma-contract-guarantor.md](./IFP-TASK-065-prisma-contract-guarantor.md) | Prisma — ContractGuarantor | IFP-055 | P0 |
| IFP-066 | [IFP-TASK-066-prisma-contract-collateral.md](./IFP-TASK-066-prisma-contract-collateral.md) | Prisma — ContractCollateral | IFP-055 | P0 |
| IFP-067 | [IFP-TASK-067-api-guarantor-collateral.md](./IFP-TASK-067-api-guarantor-collateral.md) | Domain + API — Guarantor & Collateral CRUD | IFP-065, 066, IFP-058 | P0 |

---

## Dependency داخلی Epic

```
IFP-055
  ├── IFP-065
  └── IFP-066
         │
         ▼
      IFP-067
```

---

## Policy notes

- ضامن می‌تواند `tenantCustomerId` (مشتری موجود) یا اطلاعات خارجی (نام، کدملی، تلفن) باشد — یکی اجباری
- وثیقه: `estimatedValueRial` bigint — ADR-007
- Soft delete + restore برای هر دو entity
- حداکثر ضامن/وثیقه per sale: از settings یا default 10 (در task مشخص)

---

*Epic-03 — Phase 04*
