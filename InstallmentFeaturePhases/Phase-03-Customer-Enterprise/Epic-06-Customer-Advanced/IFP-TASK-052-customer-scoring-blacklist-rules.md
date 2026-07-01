# IFP-TASK-052: Customer Scoring + Blacklist Rules

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | IFP-03 Customer Enterprise |
| Epic | Epic-06-Customer-Advanced |
| ID | IFP-052 |
| Priority | P0 |
| Depends on | IFP-033, IFP-037 |
| Blocks | IFP-053 |
| Estimated | 6h |

---

## هدف

**Domain rules** امتیازدهی مشتری (`creditScore`) و **blacklist** — auto-adjust on payment/overdue events، block sale create for blacklisted — §۳ اعتبارسنجی، امتیاز مشتری، بلک لیست.

---

## معیار پذیرش

- [ ] `CustomerScoringService` in domain — zero framework imports
- [ ] Rules: payment confirmed +N, installment overdue -M, waive no change, manual adjust API
- [ ] Score bounds 0–1000 default clamp
- [ ] `overdueCount` increment/decrement on overdue/paid events via domain handlers
- [ ] Blacklist: `blacklist()` sets isBlacklisted, status, reason — `CreateSaleUseCase` checks → 403 CUSTOMER_BLACKLISTED
- [ ] Auto-blacklist when score < tenant threshold setting optional
- [ ] Manual score adjust: PATCH `/api/v1/customers/:id/score` — permission `installments.customer.score.adjust`
- [ ] Audit `customer.score.adjust`, `customer.blacklist`, `customer.unblacklist`
- [ ] Event handlers idempotent subscribe PaymentConfirmed, InstallmentOverdue

---

## مشخصات فنی

### Default scoring weights (tenant settings schema keys)

| Event | Default delta |
|-------|---------------|
| Payment confirmed | +5 |
| Installment overdue | -10 |
| Sale completed on time | +2 |
| Manual adjust | arbitrary with reason |

Settings keys: `customer.scoring.*`, `customer.auto_blacklist_score_threshold`

### Blacklist vs archive

Blacklisted: visible in list with badge; blocked new sales  
Archived: hidden from default list  

### Create sale guard

Insert check in CreateSaleUseCase before transaction — not controller only

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/domain/src/core/customer/customer-scoring.service.ts` |
| Create | `packages/domain/src/core/customer/customer-scoring.service.spec.ts` |
| Create | `packages/application/src/customers/adjust-customer-score.use-case.ts` |
| Create | `packages/application/src/customers/event-handlers/customer-scoring.handler.ts` |
| Update | create sale use case — blacklist guard |
| Update | tenant settings schema |

---

## مراحل پیاده‌سازی

1. Domain scoring pure functions
2. Settings read port
3. Event handlers register in worker
4. Adjust score use case + blacklist endpoints (may extend IFP-037)
5. Create sale integration guard
6. Unit tests all rules
7. Integration overdue → score drop

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Sale for blacklisted | 403 | CUSTOMER_BLACKLISTED |
| Score adjust without reason | 422 | REASON_REQUIRED |
| Double event same idempotency | — | score change once |
| Unblacklist without permission | 403 | PERMISSION_DENIED |

---

## تست

- [ ] Unit: score clamp 0–1000
- [ ] Unit: overdue decrement
- [ ] Integration: blacklisted customer sale blocked
- [ ] Integration: auto-blacklist threshold

---

## UX (اگر UI دارد)

- [ ] Score badge color bands in list/detail — IFP-053
- [ ] Blacklist banner on detail
- [ ] Admin adjust score modal with reason

---

## Flow

```
Automatic:
Payment confirmed → event → score +5
Overdue job → event → score -10 → maybe auto-blacklist

Manual:
Staff → adjust score → reason → save → audit
Staff → blacklist → reason → block future sales
```

---

## Policy Alignment

- [ ] Domain logic not in controller
- [ ] Settings schema keys only
- [ ] Audit on manual changes
- [ ] BUSINESS-RULES sync

---

## مراجع

- `docs/03-modules/installments/BUSINESS-RULES.md`
- `docs/01-product/installment-module-features.md` §۳

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | 10 | 10 |
| Completeness | 25 | 25 |
| Policy | 25 | 25 |
| Executability | 25 | 25 |
| Alignment | 15 | 15 |
| **جمع** | **100** | **100** |
