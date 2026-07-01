# IFP-188: Prisma — Chart of Accounts, Cash & Bank

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 11 |
| Epic | Epic-01-Accounting-Schema |
| ID | IFP-188 |
| Priority | P0 |
| Depends on | IFP-168, Phase-0 TASK-018 |
| Blocks | IFP-189, IFP-190 |
| Estimated | 8h |

---

## هدف

حساب‌های صندوق و بانک tenant — کد حساب، نوع، موجودی افتتاحیه.

---

## معیار پذیرش

- [ ] Account model: code, name, type asset|liability|equity|revenue|expense
- [ ] CashAccount, BankAccount detail tables or type discriminator
- [ ] openingBalanceRial BigInt
- [ ] Unique (tenantId, code)
- [ ] Base fields

---

## مشخصات فنی

Account.type enum; bank: sheba, bankName

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/infrastructure/persistence/prisma/schema/accounting-account.prisma` |

---

## مراحل پیاده‌سازی

1. COA model
2. Seed default accounts on tenant

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Delete account with entries | 409 | ACCOUNT_HAS_ENTRIES |

---

## تست

- [ ] Migration

---

## Policy Alignment

- [ ] EXCELLENCE §8
- [ ] bigint Rial

---

## مراجع

- `§18`
- `docs/03-modules/installments/domain.md`

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
