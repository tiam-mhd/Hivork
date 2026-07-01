# IFP-167: Settings Schema — Financial, Gateway, Tax, Business Hours

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 09 |
| Epic | Epic-03-Store-Settings |
| ID | IFP-167 |
| Priority | P0 |
| Depends on | IFP-166, Phase-1 payment settings |
| Blocks | IFP-168, IFP-170 |
| Estimated | 8h |

---

## هدف

کلیدهای مالی §۱۴: درگاه پرداخت، مالیات، ساعت کاری — بدون free-form rules.

---

## معیار پذیرش

- [ ] Keys: `store.financial.*`, `store.paymentGateway.*`, `store.tax.*`, `store.businessHours`
- [ ] Payment gateway: provider enum, merchantId, terminalId, sandbox flag — secrets in env/vault ref
- [ ] Tax: enabled, ratePercent (bigint basis points), inclusive flag
- [ ] Business hours: per-weekday slots `{ open, close }` Asia/Tehran
- [ ] Zod + defaults documented

---

## مشخصات فنی

### businessHours
```typescript
businessHours: z.record(z.enum(['sat','sun',...]), z.array(z.object({ open: timeSchema, close: timeSchema })))
```

### tax.ratePercent
Stored as integer basis points (900 = 9.00%) — not float

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `packages/domain/src/settings/settings.schema.ts` |
| Create | `packages/domain/src/settings/store-financial.defaults.ts` |

---

## مراحل پیاده‌سازی

1. Define nested schema
2. Document secret handling
3. Unit tests edge times

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| close < open | 400 | INVALID_BUSINESS_HOURS |
| Tax rate > 100% | 400 | VALIDATION_ERROR |

---

## تست

- [ ] Unit: hours validation
- [ ] Unit: tax bigint

---

## Policy Alignment

- [ ] ADR-005
- [ ] No float for money/rates — basis points int

---

## مراجع

- `docs/03-modules/installments/BUSINESS-RULES.md`

---

## Self-Review Score

> مبنا: `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md` §10

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata (ID, Priority, Depends, Blocks, Estimate) | /10 | 10 | |
| Completeness (criteria, spec بدون TODO، files table) | /25 | 25 | |
| Policy (EXCELLENCE §8، soft delete، ADR cited) | /25 | 25 | |
| Executability (edge cases، tests، dev بدون سؤال) | /25 | 24 | |
| Alignment (sync docs، contracts، Epic README) | /15 | 15 | |
| **جمع** | **/100** | **99** | ≥95 — Ready |
