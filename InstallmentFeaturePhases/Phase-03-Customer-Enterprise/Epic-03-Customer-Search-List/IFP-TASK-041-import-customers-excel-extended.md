# IFP-TASK-041: Import Customers Excel (Extended Fields)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | IFP-03 Customer Enterprise |
| Epic | Epic-03-Customer-Search-List |
| ID | IFP-041 |
| Priority | P0 |
| Depends on | IFP-036, IFP-039, Phase 1 TASK-087 |
| Blocks | IFP-053 |
| Estimated | 8h |

---

## هدف

Import Excel مشتریان با **فیلدهای Enterprise** — category, tags, secondary phone, address, emergency contact, localCode — بر پایه TASK-087 با row-level validation، error report، idempotency، و audit `customer.import`.

---

## معیار پذیرش

- [ ] POST `/api/v1/customers/import` — multipart file max 5MB
- [ ] Template downloadable GET `/api/v1/customers/import/template`
- [ ] Columns: phone*, name*, localCode, email, nationalId, category (slug/name), tags (comma-sep), address line, city, phone2, emergency name/phone, notes
- [ ] Row validation — skip invalid + collect errors
- [ ] User findOrCreate + TenantCustomer link — same as create
- [ ] Duplicate active in tenant → row error CUSTOMER_EXISTS
- [ ] Plan limit checked once at start — fail early if batch exceeds
- [ ] Response: `{ totalRows, successCount, failedCount, errors[], jobId? }`
- [ ] Optional error Excel download
- [ ] Audit `customer.import` with counts
- [ ] Permission: `installments.customer.import`

---

## مشخصات فنی

### Import flow

Entry: upload file  
→ Parse xlsx (sheet1)  
→ Validate headers match template version  
→ For each row: normalize phone → validate → create/ link (reuse IFP-036)  
→ Aggregate results  
Exit: summary JSON + optional error file  

### Idempotency

Header `Idempotency-Key` — same key within 24h returns same result without duplicate creates

### Category resolution

Match by slug or name case-insensitive within tenant — not found → row error

### Performance

Batch size 500 rows recommended max — larger files async job (P2 — document stub)

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `packages/application/src/customers/import-customers-excel.use-case.ts` |
| Create | `packages/application/src/customers/import-row-validator.ts` |
| Create | `assets/templates/customer-import-template.xlsx` |
| Update | `apps/api/src/customers/customers.controller.ts` |

---

## مراحل پیاده‌سازی

1. Extend template with Enterprise columns
2. Row mapper + validator
3. Reuse CreateTenantCustomer internally per row (transaction per row)
4. Error collector + error xlsx generator
5. Template endpoint
6. Integration test fixture file
7. Audit

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Wrong headers | 422 | INVALID_TEMPLATE |
| File > 5MB | 413 | FILE_TOO_LARGE |
| Plan limit mid-batch | partial | stop or continue — document: stop at limit |
| Invalid phone row | row error | skip |
| Category ambiguous | row error | duplicate names |

---

## تست

- [ ] Integration: 10 row mixed success/fail
- [ ] Integration: restore soft-deleted via import
- [ ] Integration: idempotency key replay
- [ ] RBAC: import deny

---

## UX (اگر UI دارد)

- [ ] Import wizard: download template → upload → progress → results — IFP-053
- [ ] Download error file button
- [ ] Empty template help text

---

## Flow

```
Entry: مشتریان → Import
Step 1: download template
Step 2: upload filled file
Step 3: processing spinner
Step 4: results table success/fail counts
Error: invalid template → message + link template
Exit: list refresh or download errors
Recovery: fix rows → re-import failed only (P2)
```

---

## Policy Alignment

- [ ] Audit customer.import
- [ ] ADR-017 phone on User
- [ ] Plan limits
- [ ] No PII in application logs

---

## مراجع

- `Phases/Phase-1-Seller-Panel/Epic-07-Customer-Backend/TASK-087-usecase-import-customers-excel.md`
- STAFF-FLOWS SF-007.2

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
