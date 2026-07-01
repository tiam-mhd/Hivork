# IFP-TASK-069: Sale Tax & Insurance Fields

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 04 — Contract Enterprise |
| Epic | Epic-04-Contract-Financials |
| ID | IFP-TASK-069 |
| Priority | P0 |
| Depends on | IFP-TASK-055, IFP-TASK-068 |
| Blocks | IFP-071 |
| Estimated | 4h |

---

## هدف

تکمیل فیلدهای **مالیات** و **بیمه** روی Sale (header-level) و domain rules برای تجمیع با line-item tax — §۴ محصول.

---

## معیار پذیرش

- [ ] Sale fields: `taxRial` (existing), `taxRateBps` optional (basis points 0–10000)
- [ ] `taxInclusive` boolean default false
- [ ] Insurance fields from IFP-055: `insuranceRial`, `insuranceProvider`, `insurancePolicyNumber`, `insuranceExpiresAt`
- [ ] Domain: `SaleFinancials.recalculateTotals(lineItems)` — header tax + sum(line tax)
- [ ] BR: `totalAmountRial = sum(lineTotals) + headerTax + insurance` (insurance optional add-on per tenant setting)
- [ ] Migration additive only

---

## مشخصات فنی

### Additional Sale columns

```prisma
taxRateBps         Int?      @map("tax_rate_bps")      // 900 = 9%
taxInclusive       Boolean   @default(false) @map("tax_inclusive")
insuranceExpiresAt DateTime? @map("insurance_expires_at") @db.Date
```

### Recalculation formula

```
subtotal = Σ (quantity * unitPrice - discount + lineTax)
headerTax = taxInclusive ? 0 : applyRate(subtotal, taxRateBps) OR fixed taxRial
totalAmountRial = subtotal + headerTax + (insuranceRial ?? 0)
```

Insurance as add-on: when `settings.insurance_included_in_total = true` (IFP-072 key optional).

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `prisma/schema.prisma` — Sale |
| Create | `packages/domain/installments/sale-financials.ts` |
| Update | IFP-TASK-058 contracts — tax/insurance fields in DTO |

---

## مراحل پیاده‌سازی

1. Migration for new columns
2. Domain recalculate service
3. Unit tests for tax inclusive/exclusive
4. Document in BUSINESS-RULES new BR-048+ if needed

---

## Edge Cases & Errors

| سناریو | Code |
|--------|------|
| taxRateBps > 10000 | `TAX_RATE_INVALID` |
| Both taxRial and taxRateBps set | taxRial wins (documented) |
| Insurance expired | warning flag in DTO not block |

---

## تست

- [ ] Unit: tax inclusive calculation
- [ ] Unit: insurance add-on to total
- [ ] Integration: update tax recalculates total

---

## UX

Financials section in IFP-076 — tax rate % input, insurance fields.

---

## Flow

Edit line items → auto recalculate totals → confirm save.

---

## Policy Alignment

- [ ] ADR-007 bigint
- [ ] Financial version increment on recalc

---

## مراجع

- `docs/01-product/installment-module-features.md` §۴ — مالیات، بیمه
- IFP-TASK-055 insurance fields

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | 10 | 10 |
| Completeness | 25 | 25 |
| Policy | 25 | 25 |
| Executability | 25 | 24 |
| Alignment | 15 | 15 |
| **جمع** | **100** | **99** |
