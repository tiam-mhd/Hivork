# Epic-04 — Contract Financials

> **Phase:** 04 — Contract Enterprise  
> **تسک‌ها:** IFP-068 → IFP-071  
> **Priority:** P0

---

## هدف Epic

**اقلام قرارداد**، **مالیات**، و **بیمه** — line items با محاسبه جمع، tax/insurance fields روی Sale، contracts و use cases.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-068 | [IFP-TASK-068-prisma-sale-line-item.md](./IFP-TASK-068-prisma-sale-line-item.md) | Prisma — SaleLineItem (اقلام قرارداد) | IFP-055 | P0 |
| IFP-069 | [IFP-TASK-069-sale-tax-insurance-fields.md](./IFP-TASK-069-sale-tax-insurance-fields.md) | Prisma + Domain — Tax & Insurance on Sale | IFP-055, IFP-068 | P0 |
| IFP-070 | [IFP-TASK-070-domain-line-item-totals.md](./IFP-TASK-070-domain-line-item-totals.md) | Domain — Line item totals + BR sum reconciliation | IFP-068, Phase 1 TASK-065 | P0 |
| IFP-071 | [IFP-TASK-071-api-contract-financials.md](./IFP-TASK-071-api-contract-financials.md) | API + Contracts — Financials CRUD & recalculate | IFP-068–070, IFP-058 | P0 |

---

## Dependency داخلی Epic

```
IFP-055
  └── IFP-068
         ├── IFP-069
         └── IFP-070
                │
                ▼
             IFP-071
```

---

## Policy notes

- BR-001/BR-005: `sum(lineItems) + tax - discount = totalAmountRial` (با tolerance 0 — bigint exact)
- مالیات/بیمه: bigint Rial — ADR-007
- ویرایش اقلام فقط در `status = ACTIVE` و بدون installment `paid`
- Recalculate → `ContractVersion` snapshot (IFP-056)

---

*Epic-04 — Phase 04*
