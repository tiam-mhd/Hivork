# IFP-TASK-062: Use Case — Terminate Contract (فسخ)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 04 — Contract Enterprise |
| Epic | Epic-02-Contract-Lifecycle |
| ID | IFP-TASK-062 |
| Priority | P0 |
| Depends on | IFP-TASK-059, IFP-TASK-056 |
| Blocks | IFP-064 |
| Estimated | 5h |

---

## هدف

`TerminateContractUseCase` — فسخ قرارداد فعال با ثبت دلیل، timestamp، ContractVersion، و audit — متمایز از `cancel` (لغو بدون بدهی پرداخت‌شده).

---

## معیار پذیرش

- [ ] `TerminateContractUseCase.execute({ saleId, reason, effectiveDate? })`
- [ ] Permission: `installments.sale.terminate`
- [ ] Domain: `sale.terminate()` — only `ACTIVE`
- [ ] Set `terminatedAt`, `terminatedById`, `terminateReason`, `status=TERMINATED`
- [ ] ContractVersion `TERMINATE` snapshot before update
- [ ] Audit: `sale.terminate`
- [ ] Unpaid installments remain — overdue job continues (Phase 05 penalty)
- [ ] Idempotency: already terminated → 409

---

## مشخصات فنی

### API (IFP-064)

```
POST /api/v1/sales/:saleId/terminate
Body: { "reason": "...", "effectiveDate": "2025-06-01" }
```

### Response

```json
{
  "data": {
    "id": "uuid",
    "status": "terminated",
    "terminatedAt": "2025-06-01T00:00:00.000Z",
    "terminateReason": "..."
  }
}
```

### Difference cancel vs terminate

| Action | Status | Paid installments allowed? |
|--------|--------|---------------------------|
| cancel | CANCELLED | No |
| terminate | TERMINATED | Yes — debt may remain |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/installments/terminate-contract.use-case.ts` |
| Create | Integration tests |

---

## مراحل پیاده‌سازی

1. Load sale with version
2. Branch + permission checks
3. Snapshot version
4. Call domain terminate
5. Persist + audit
6. Return enterprise DTO

---

## Edge Cases & Errors

| سناریو | HTTP | Code |
|--------|------|------|
| Not active | 409 | `INVALID_STATUS_TRANSITION` |
| Archived | 409 | `SALE_ARCHIVED_READONLY` |
| Already terminated | 409 | `SALE_ALREADY_TERMINATED` |
| reason too short | 400 | validation |

---

## تست

- [ ] Integration: terminate active sale with paid installments — OK
- [ ] Integration: terminate cancelled — 409
- [ ] Integration: audit log entry exists
- [ ] RBAC deny test

---

## UX

IFP-077 — destructive confirm dialog, reason required.

---

## Flow

```
entry: actions menu → فسخ
steps: reason → confirm checkbox
exit: status badge «فسخ‌شده»
```

---

## Policy Alignment

- [ ] Audit mandatory
- [ ] No delete of installments
- [ ] ADR-013 soft delete separate

---

## مراجع

- IFP-TASK-059 domain transitions
- `docs/01-product/installment-module-features.md` §۴ — فسخ

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
