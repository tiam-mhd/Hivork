# Epic-01 — Contract Schema

> **Phase:** 04 — Contract Enterprise  
> **تسک‌ها:** IFP-055 → IFP-058  
> **Priority:** P0

---

## هدف Epic

تعریف **لایه داده و قرارداد API** برای قرارداد Enterprise: گسترش مدل `Sale`، موجودیت‌های `ContractVersion` و `ContractAttachment`، و Zod schemas هم‌تراز EXCELLENCE §8.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-055 | [IFP-TASK-055-prisma-sale-extended.md](./IFP-TASK-055-prisma-sale-extended.md) | Prisma — Sale extended fields + SaleStatus enterprise | Phase 1 TASK-061 | P0 |
| IFP-056 | [IFP-TASK-056-prisma-contract-version.md](./IFP-TASK-056-prisma-contract-version.md) | Prisma — ContractVersion | IFP-055 | P0 |
| IFP-057 | [IFP-TASK-057-prisma-contract-attachment.md](./IFP-TASK-057-prisma-contract-attachment.md) | Prisma — ContractAttachment | IFP-055 | P0 |
| IFP-058 | [IFP-TASK-058-contracts-sale-enterprise.md](./IFP-TASK-058-contracts-sale-enterprise.md) | Zod — Sale enterprise + Version + Attachment DTOs | IFP-055, 056, 057 | P0 |

---

## Dependency داخلی Epic

```
IFP-055
  ├── IFP-056
  ├── IFP-057
  └── IFP-058 (needs 056, 057 schemas)
```

---

## Policy notes

- همه مدل‌ها: base fields EXCELLENCE §2.1 + `tenantId` + soft delete
- `onDelete: Restrict` روی همه FK — ADR-013
- `Sale` financial: `version` برای optimistic locking
- `ContractVersion`: append-only snapshot — **بدون** soft delete روی رکوردهای version (immutable history)
- `ContractAttachment`: soft delete + restore

---

*Epic-01 — Phase 04*
