# IFP-TASK-034: CustomerDocument + CustomerNote Models

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | IFP-03 Customer Enterprise |
| Epic | Epic-01-Customer-Schema-Extended |
| ID | IFP-034 |
| Priority | P0 |
| Depends on | IFP-033 |
| Blocks | IFP-043, IFP-047 |
| Estimated | 4h |

---

## هدف

مدل‌های `CustomerDocument` (فایل‌های مشتری: کارت ملی، شناسنامه، قرارداد، تصاویر) و `CustomerNote` (یادداشت داخلی ساخت‌یافته staff-only) برای §۳ محصول — جایگزین/مکمل فیلد متنی `internalNotes` با history و soft delete.

---

## معیار پذیرش

- [ ] مدل `CustomerDocument` با type enum: national_id, birth_certificate, contract, photo, other
- [ ] فیلدها: tenantId, tenantCustomerId, fileStorageKey, originalFileName, mimeType, sizeBytes, uploadedById, documentType, description, expiresAt?
- [ ] مدل `CustomerNote` با: tenantId, tenantCustomerId, body (text), isPinned, authorStaffId
- [ ] Base fields + soft delete روی هر دو
- [ ] Indexes: `(tenantId, tenantCustomerId)`, `(tenantId, documentType)`
- [ ] `onDelete: Restrict` روی FKها
- [ ] Repository port stubs — implementation در IFP-043/047

---

## مشخصات فنی

### CustomerDocument

| فیلد | توضیح |
|------|--------|
| documentType | national_id, birth_certificate, contract, photo, other |
| fileStorageKey | reference به object storage (S3/minio path) |
| originalFileName | نام فایل آپلود |
| mimeType | image/jpeg, image/png, application/pdf |
| sizeBytes | bigint |
| uploadedById | FK Staff |
| description | optional caption |
| expiresAt | optional — مثلاً قرارداد منقضی |
| metadata | JSON extensibility |
| + base fields | soft delete — فایل فیزیکی retain |

### CustomerNote

| فیلد | توضیح |
|------|--------|
| body | متن یادداشت — max 5000 char |
| isPinned | boolean — sort pinned first |
| authorStaffId | FK Staff — immutable after create |
| metadata | optional |
| + base fields | soft delete |

### تفاوت با internalNotes روی TenantCustomer

- `internalNotes` (legacy MVP): یک فیلد متنی — **نگه داشته شود** برای backward compat
- `CustomerNote`: چند یادداشت با author/timestamp — UI timeline در IFP-047

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `prisma/schema.prisma` |
| Create | migration folder |
| Create | `packages/domain/src/core/customer/customer-document.entity.ts` |
| Create | `packages/domain/src/core/customer/customer-note.entity.ts` |
| Create | `packages/application/src/ports/customer-document.repository.port.ts` |
| Create | `packages/application/src/ports/customer-note.repository.port.ts` |

---

## مراحل پیاده‌سازی

1. Enum DocumentType در schema
2. مدل CustomerDocument + CustomerNote
3. Relations به TenantCustomer, Staff, Tenant
4. Domain entities: create, softDelete, restore
5. Prisma validate + migrate
6. Unit tests: document type validation, note body length

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| mimeType غیرمجاز | 422 | validation |
| sizeBytes > tenant limit | 413 | PLAN_LIMIT or FILE_TOO_LARGE |
| note body empty | 422 | VALIDATION_ERROR |
| soft delete document | — | hidden in gallery; storage no hard delete |
| customer soft-deleted | 404 | notes/docs not accessible |

---

## تست

- [ ] Unit: CustomerDocument.create with valid types
- [ ] Unit: CustomerNote body max length
- [ ] Integration: FK restrict — cannot hard delete tenant with documents

---

## UX (اگر UI دارد)

- [ ] N/A — IFP-044 gallery, IFP-047 notes UI

---

## Flow (اگر flow دارد)

N/A

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §2.1 base fields
- [ ] SOFT-DELETE-POLICY — no hard delete file record
- [ ] ADR-013 — Restrict FK
- [ ] Staff-only notes — never customer actor

---

## مراجع

- `docs/01-product/installment-module-features.md` §۳ — فایل‌ها، یادداشت داخلی
- `docs/09-development/SOFT-DELETE-POLICY.md`

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
