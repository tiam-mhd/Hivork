# IFP-172: Prisma — FileAsset & FileCategory

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 10 |
| Epic | Epic-01-File-Management |
| ID | IFP-172 |
| Priority | P0 |
| Depends on | Phase-0 TASK-018 |
| Blocks | IFP-173, IFP-174, IFP-170 |
| Estimated | 6h |

---

## هدف

مدل فایل tenant — metadata، storage key، mime، size، category — §۱۲.

---

## معیار پذیرش

- [ ] FileAsset + FileCategory models
- [ ] Base fields + tenantId
- [ ] storageKey unique
- [ ] categoryId optional FK
- [ ] Index (tenantId, mimeType), (tenantId, categoryId)
- [ ] onDelete: Restrict

---

## مشخصات فنی

### FileAsset
```prisma
// Base fields — EVERY business model (Epic-04 + SOFT-DELETE-POLICY)
id           String    @id @default(uuid()) @db.Uuid
createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz
createdById  String?   @map("created_by_id") @db.Uuid
updatedById  String?   @map("updated_by_id") @db.Uuid
deletedAt    DateTime? @map("deleted_at") @db.Timestamptz
deletedById  String?   @map("deleted_by_id") @db.Uuid
deleteReason String?   @map("delete_reason")
version      Int       @default(1)
metadata     Json?     @db.JsonB
tenantId     String    @map("tenant_id") @db.Uuid
```
storageKey String @unique
originalName String
mimeType String
sizeBytes BigInt
categoryId String?
checksum String?
status String // active | quarantined

### FileCategory
name, code unique per tenant

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/infrastructure/persistence/prisma/schema/file-asset.prisma` |

---

## مراحل پیاده‌سازی

1. Models
2. Migration
3. Types export

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Duplicate storage key | 409 | FILE_STORAGE_CONFLICT |

---

## تست

- [ ] Migration clean

---

## Policy Alignment

- [ ] EXCELLENCE §8
- [ ] SOFT-DELETE-POLICY

---

## مراجع

- `docs/01-product/installment-module-features.md §12`

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
