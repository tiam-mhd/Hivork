# IFP-TASK-057: Prisma — ContractAttachment

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 04 — Contract Enterprise |
| Epic | Epic-01-Contract-Schema |
| ID | IFP-TASK-057 |
| Priority | P0 |
| Depends on | IFP-TASK-055 |
| Blocks | IFP-058, IFP-076 |
| Estimated | 4h |

---

## هدف

مدل **ContractAttachment** — پیوست و فایل قرارداد (اسکن، امضا، سایر) با soft delete و FK به `fileId` (platform file service).

---

## معیار پذیرش

- [ ] مدل `ContractAttachment` با full base fields + soft delete
- [ ] `saleId`, `tenantId`, `fileId` (UUID — platform file)
- [ ] `attachmentType` enum: `CONTRACT_SCAN`, `SIGNED_CONTRACT`, `IDENTITY_DOC`, `COLLATERAL_DOC`, `OTHER`
- [ ] `label`, `description` optional
- [ ] `sortOrder` int default 0
- [ ] Index `(tenantId, saleId)`, `(tenantId, deletedAt)`
- [ ] `onDelete: Restrict` — sale, file
- [ ] Restore use case documented (IFP-063 pattern)

---

## مشخصات فنی

```prisma
enum ContractAttachmentType {
  CONTRACT_SCAN
  SIGNED_CONTRACT
  IDENTITY_DOC
  COLLATERAL_DOC
  OTHER

  @@map("contract_attachment_type")
}

model ContractAttachment {
  id             String                 @id @default(uuid()) @db.Uuid
  tenantId       String                 @map("tenant_id") @db.Uuid
  saleId         String                 @map("sale_id") @db.Uuid
  fileId         String                 @map("file_id") @db.Uuid
  attachmentType ContractAttachmentType @map("attachment_type")
  label          String?
  description    String?
  sortOrder      Int                    @default(0) @map("sort_order")
  createdAt      DateTime               @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime               @updatedAt @map("updated_at") @db.Timestamptz
  createdById    String?                @map("created_by_id") @db.Uuid
  updatedById    String?                @map("updated_by_id") @db.Uuid
  deletedAt      DateTime?              @map("deleted_at") @db.Timestamptz
  deletedById    String?                @map("deleted_by_id") @db.Uuid
  deleteReason   String?                @map("delete_reason")
  version        Int                    @default(1)
  metadata       Json?                  @db.JsonB

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  sale   Sale   @relation(fields: [saleId], references: [id], onDelete: Restrict)

  @@index([tenantId, saleId])
  @@index([tenantId, deletedAt])
  @@map("contract_attachments")
}
```

> `fileId` references platform `File` model when available (IFP Phase 10); until then FK optional at app layer with validation.

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `prisma/schema.prisma` — ContractAttachment |
| Create | Migration |
| Create | `packages/infrastructure/persistence/contract-attachment.repository.ts` |

---

## مراحل پیاده‌سازی

1. Enum `ContractAttachmentType`
2. Model with base fields
3. Relations Restrict
4. Migration
5. Repository: listBySale, softDelete, restore
6. Max attachments per sale: 50 (domain constant)

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| fileId not found | 404 `FILE_NOT_FOUND` | reject |
| Sale ARCHIVED | 409 `SALE_ARCHIVED_READONLY` | reject upload |
| Max attachments exceeded | 409 `ATTACHMENT_LIMIT_EXCEEDED` | reject |
| Soft delete | — | invisible in list; restore clears deletedAt |

---

## تست

- [ ] Integration: attach file to sale
- [ ] Integration: soft delete attachment — not in list
- [ ] Integration: restore attachment
- [ ] Integration: cross-tenant saleId → fail

---

## UX

N/A — IFP-076 consumes list API.

---

## Flow

```
upload file → create File record → POST attachment { fileId, type }
list attachments on sale detail tab
soft delete → confirm dialog with reason
```

---

## Policy Alignment

- [ ] EXCELLENCE §2.1 base fields
- [ ] SOFT-DELETE-POLICY — soft delete + restore
- [ ] ADR-013 — Restrict

---

## مراجع

- `docs/01-product/installment-module-features.md` §۴ — پیوست، فایل قرارداد
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
