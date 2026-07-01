# Epic-04 — Adjustments

## هدف Epic

تعدیلات مالی روی اقساط: **بخشودگی** (waive)، **جریمه دیرکرد** (penalty) و **تخفیف** (discount) — با domain rules، audit و sync با Sale totals.

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-096 | [IFP-TASK-096-usecase-waive-installment.md](./IFP-TASK-096-usecase-waive-installment.md) | Use Case + API — بخشودگی قسط | IFP-079, Phase-1 TASK-066 | P0 |
| IFP-097 | [IFP-TASK-097-usecase-apply-penalty.md](./IFP-TASK-097-usecase-apply-penalty.md) | Use Case + API — ثبت جریمه | IFP-079, IFP-055+ | P0 |
| IFP-098 | [IFP-TASK-098-usecase-apply-discount.md](./IFP-TASK-098-usecase-apply-discount.md) | Use Case + API — ثبت تخفیف | IFP-079, IFP-055+ | P0 |

## Dependency داخلی Epic

```
IFP-079 (domain) ─┬─ IFP-096 waive
                  ├─ IFP-097 penalty
                  └─ IFP-098 discount
```

## Policy notes

- Waive: `installments.installment.waive` — terminal `waived`
- Penalty/discount: مبلغ bigint — audit `installment.penalty`, `installment.discount`
- تنظیمات جریمه از tenant settings (IFP Phase-04)
