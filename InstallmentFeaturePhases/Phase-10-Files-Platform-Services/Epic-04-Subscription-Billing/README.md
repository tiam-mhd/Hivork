# Epic-04 — اشتراک و صورتحساب

## هدف Epic

پلن، تمدید، پرداخت، فاکتور، سقف امکانات §۲۲.

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-182 | [IFP-TASK-182-domain-subscription-plan-entitlements.md](./IFP-TASK-182-domain-subscription-plan-entitlements.md) | Domain — Subscription Plan & Feature Caps | Phase-0 Plan model | P0 |
| IFP-183 | [IFP-TASK-183-usecase-api-subscription-billing.md](./IFP-TASK-183-usecase-api-subscription-billing.md) | Use Case + API — Subscription Billing | IFP-182 | P0 |
| IFP-184 | [IFP-TASK-184-frontend-subscription-billing-ui.md](./IFP-TASK-184-frontend-subscription-billing-ui.md) | Frontend — Subscription & Billing UI | IFP-183, IFP-002 | P0 |


## Dependency داخلی Epic

Tasks به ترتیب جدول برای Depends زنجیره‌ای داخل epic رعایت شده است.

## Policy notes

- Plan limits enforced in use cases; bigint Rial.
- EXCELLENCE-STANDARDS · SOFT-DELETE-POLICY · ADR-004/005/013/015/017

## مراجع

- `docs/01-product/installment-module-features.md`
- `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md`
