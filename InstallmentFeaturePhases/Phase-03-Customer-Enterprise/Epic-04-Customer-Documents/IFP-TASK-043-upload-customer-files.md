# IFP-TASK-043: Upload Customer Files

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | IFP-03 Customer Enterprise |
| Epic | Epic-04-Customer-Documents |
| ID | IFP-043 |
| Priority | P0 |
| Depends on | IFP-034, IFP-039 |
| Blocks | IFP-044 |
| Estimated | 6h |

---

## هدف

API آپلود فایل‌های مشتری (کارت ملی، شناسنامه، قرارداد، تصاویر) — ذخیره در object storage، رکورد `CustomerDocument`، validation نوع/حجم، permission و audit.

---

## معیار پذیرش

- [ ] POST `/api/v1/customers/:id/documents` — multipart
- [ ] Allowed mime: image/jpeg, image/png, application/pdf
- [ ] Max size: tenant setting default 10MB per file
- [ ] Fields: file, documentType, description?, expiresAt?
- [ ] Storage key pattern: `{tenantId}/customers/{customerId}/{uuid}.{ext}`
- [ ] GET list documents for customer
- [ ] DELETE soft-delete document — permission `installments.customer.document.delete`
- [ ] Audit `customer.document.upload`, `customer.document.delete`
- [ ] Permission upload: `installments.customer.document.upload`
- [ ] Data scope same as get customer

---

## مشخصات فنی

### Upload flow

Validate customer access  
→ Validate file mime/size  
→ Stream to storage port  
→ Create CustomerDocument record  
→ Return document metadata (not raw storage credentials)  

### Download

GET `/api/v1/customers/:id/documents/:docId/download` — signed URL TTL 15min

### Storage port

Use shared FileStoragePort — if Phase 10 not ready, local filesystem adapter for dev

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/customers/upload-customer-document.use-case.ts` |
| Create | `packages/application/src/customers/list-customer-documents.use-case.ts` |
| Create | `packages/application/src/customers/delete-customer-document.use-case.ts` |
| Update | `apps/api/src/customers/customer-documents.controller.ts` |
| Update | storage adapter if needed |

---

## مراحل پیاده‌سازی

1. FileStoragePort inject
2. Upload use case + virus scan hook no-op
3. List + soft delete use cases
4. Signed URL generator
5. Controller routes
6. Integration test with test file buffer

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Wrong mime | 422 | UNSUPPORTED_FILE_TYPE |
| Too large | 413 | FILE_TOO_LARGE |
| Customer not found | 404 | CUSTOMER_NOT_FOUND |
| Storage failure | 503 | STORAGE_ERROR — no orphan DB row |
| Duplicate upload same name | 201 | allow multiple |

---

## تست

- [ ] Integration: upload jpeg + list + soft delete
- [ ] Integration: wrong mime rejected
- [ ] RBAC: deny upload without permission

---

## UX (اگر UI دارد)

- [ ] Drag-drop zone — IFP-044
- [ ] Progress bar upload
- [ ] File type icons by documentType

---

## Flow

```
Entry: customer detail → documents tab
Select file + type → upload
Success → thumbnail in gallery
Error size → message
Delete → confirm → soft delete
```

---

## Policy Alignment

- [ ] SOFT-DELETE-POLICY — document soft delete
- [ ] ADR-013 — no hard delete storage in MVP (retention policy later)
- [ ] Tenant isolation on storage path

---

## مراجع

- `docs/01-product/installment-module-features.md` §۳ — فایل‌ها
- IFP-034 CustomerDocument model

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
