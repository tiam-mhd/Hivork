# IFP-TASK-115: Use Case + API — وصول و انتقال چک

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 06 — Payments & Checks |
| Epic | Epic-04-Check-Management |
| ID | IFP-TASK-115 |
| Priority | P0 |
| Depends on | IFP-TASK-113, IFP-TASK-114 |
| Blocks | IFP-TASK-116, IFP-TASK-117, IFP-TASK-118 |
| Estimated | 6h |

---

## هدف

**وصول چک** (COLLECTED) — ثبت در PaymentLedger و تأیید قسط مرتبط — و **انتقال چک** به شخص/بانک third party با audit.

---

## معیار پذیرش

- [ ] `CollectCheckUseCase` — creates ledger CREDIT entry
- [ ] `TransferCheckUseCase` — status → TRANSFERRED
- [ ] API `POST /api/v1/checks/{id}/collect`
- [ ] API `POST /api/v1/checks/{id}/transfer`
- [ ] Permission: `installments.check.collect`, `installments.check.transfer`
- [ ] Collect links installment → paid if full amount (BR-026)
- [ ] Idempotency-Key on collect POST
- [ ] Audit: `check.collect`, `check.transfer`
- [ ] Integration tests

---

## مشخصات فنی

### Collect

```
POST /api/v1/checks/{checkId}/collect
Permission: installments.check.collect
Header: Idempotency-Key
```

```json
{
  "collectedAt": "1405-10-05T14:00:00.000Z",
  "bankDepositRef": "DEP-12345",
  "confirmInstallment": true
}
```

Response: check status `collected`, optional `ledgerEntryId`, optional installment `paid`.

### Transfer

```
POST /api/v1/checks/{checkId}/transfer
Permission: installments.check.transfer
```

```json
{
  "transferredTo": "علی رضایی",
  "transferReason": "واگذاری به تأمین‌کننده",
  "transferredAt": "1405-10-03T09:00:00.000Z"
}
```

### Ledger on collect

```typescript
PaymentLedgerEntry {
  direction: 'CREDIT',
  method: 'CHECK',
  amountRial: check.amountRial,
  checkId: check.id,
  installmentId: check.installmentId,
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/payments/collect-check.use-case.ts` |
| Create | `packages/application/payments/transfer-check.use-case.ts` |
| Update | `packages/domain/payments/check.entity.ts` |
| Update | `apps/api/src/modules/payments/checks.controller.ts` |

---

## مراحل پیاده‌سازی

1. Domain transitions collect/transfer
2. Collect UC + ledger + installment confirm in transaction
3. Transfer UC
4. Controller + idempotency middleware
5. Tests including double-collect idempotency

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Collect BOUNCED check | 409 | `CHECK_INVALID_STATE` |
| Collect amount mismatch installment | 400 | partial — ledger only, installment manual |
| Duplicate Idempotency-Key | 200 | same response |
| Transfer after COLLECTED | 409 | `CHECK_ALREADY_COLLECTED` |

---

## تست

- [ ] Integration: collect → ledger + installment paid
- [ ] Integration: transfer registered check
- [ ] Integration: idempotent collect
- [ ] Financial: bigint sum invariant

---

## UX

N/A — IFP-117 actions «وصول» / «انتقال».

---

## Flow

```
چک REGISTERED → DUE → [وصول] → COLLECTED → ledger + قسط paid
                  ↘ [انتقال] → TRANSFERRED
```

---

## Policy Alignment

- [ ] ADR-007, ADR-008 payment confirm
- [ ] Idempotency financial POST
- [ ] Audit collect/transfer
- [ ] Transaction atomicity

---

## مراجع

- `docs/01-product/installment-module-features.md` §۷ — وصول، انتقال
- `docs/03-modules/installments/BUSINESS-RULES.md` BR-026
- IFP-TASK-113, IFP-TASK-101

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | |
| Policy | 25 | 25 | |
| Executability | 25 | 25 | |
| Alignment | 15 | 15 | |
| **جمع** | **100** | **100** | ≥95 ✅ |
