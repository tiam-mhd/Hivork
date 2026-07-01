# IFP-TASK-042: Export Customers Excel/PDF

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | IFP-03 Customer Enterprise |
| Epic | Epic-03-Customer-Search-List |
| ID | IFP-042 |
| Priority | P1 |
| Depends on | IFP-040, IFP-039 |
| Blocks | IFP-053 |
| Estimated | 6h |

---

## هدف

**خروجی Excel و PDF** لیست مشتریان با همان فیلترهای list API — §۳ چاپ/Excel/PDF. Respect data scope؛ بدون export مشتریان خارج از دسترسی staff.

---

## معیار پذیرش

- [ ] GET `/api/v1/customers/export?format=xlsx|pdf` — query same as list filters
- [ ] Max export rows: tenant setting default 5000 — above → 422 or async job stub
- [ ] Excel columns: name, phone, localCode, category, tags, creditScore, status, totalPurchaseRial, lastPurchaseAt, primary city
- [ ] PDF: printable table RTL — header tenant logo optional
- [ ] Filename: `customers-{date}.{xlsx|pdf}`
- [ ] Audit `customer.export` with filter snapshot (no PII body)
- [ ] Permission: `installments.customer.export`
- [ ] Rate limit: 10/hour per staff

---

## مشخصات فنی

### Export pipeline

Reuse ListTenantCustomers query without cursor — stream rows  
→ XLSX: exceljs or equivalent  
→ PDF: puppeteer HTML template or pdfkit RTL  

### PDF print layout

- A4 landscape
- Font: Vazirmatn or tenant setting
- Page numbers footer
- Generated at timestamp Tehran TZ

### Security

- Signed short-lived URL optional for large files
- No export of soft-deleted unless admin flag

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/customers/export-customers.use-case.ts` |
| Create | `packages/infrastructure/export/customer-xlsx.writer.ts` |
| Create | `packages/infrastructure/export/customer-pdf.writer.ts` |
| Update | `apps/api/src/customers/customers.controller.ts` |

---

## مراحل پیاده‌سازی

1. Export use case delegating to list query
2. XLSX writer with column mapping
3. PDF HTML template RTL
4. Controller streaming response
5. Audit + rate limit
6. Integration test: export 3 rows matches list filter

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Zero rows | 404 or empty file | document empty xlsx with headers |
| Over row limit | 422 | EXPORT_LIMIT_EXCEEDED |
| Rate limit | 429 | TOO_MANY_REQUESTS |
| Invalid format | 422 | VALIDATION_ERROR |

---

## تست

- [ ] Integration: xlsx row count matches filter
- [ ] Integration: PDF generates valid buffer
- [ ] RBAC: export denied without permission
- [ ] RBAC: branch scope limits rows

---

## UX (اگر UI دارد)

- [ ] Export button on list — format dropdown — IFP-053
- [ ] Loading toast during generation
- [ ] Print CSS for browser print alternative

---

## Flow

```
Entry: list with filters applied
Click export → choose Excel/PDF
Download starts
Error limit → message
Exit: file saved
```

---

## Policy Alignment

- [ ] Data scope ADR-015
- [ ] Audit without PII payload
- [ ] bigint as string in xlsx or formatted toman

---

## مراجع

- `docs/01-product/installment-module-features.md` §۳ — Excel, PDF, چاپ

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
