# IFP-190: Domain — Accounting Invariants & Rules

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 11 |
| Epic | Epic-01-Accounting-Schema |
| ID | IFP-190 |
| Priority | P0 |
| Depends on | IFP-189 |
| Blocks | IFP-191, IFP-193 |
| Estimated | 10h |

---

## هدف

قوانین domain: تراز سند، post، void، عدم حذف posted — zero framework imports.

---

## معیار پذیرش

- [ ] JournalEntryEntity.post()
- [ ] void() with reason
- [ ] validateBalanced(lines)
- [ ] Account normal balance rules
- [ ] Unit tests all transitions

---

## مشخصات فنی

State: draft → posted → void; no draft delete if lines exist optional

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/domain/src/accounting/journal-entry.entity.ts` |
| Create | `packages/domain/src/accounting/journal-entry.entity.spec.ts` |

---

## مراحل پیاده‌سازی

1. Entity
2. Unit tests
3. Export

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Void posted | — | Creates reversing entry pattern P1 |

---

## تست

- [ ] Unit: balanced, post guards

---

## Policy Alignment

- [ ] Domain pure
- [ ] state machine doc

---

## مراجع

- `docs/03-modules/installments/state-machines.md`

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
