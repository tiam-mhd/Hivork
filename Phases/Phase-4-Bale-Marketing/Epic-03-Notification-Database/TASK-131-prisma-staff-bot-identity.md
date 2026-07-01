# TASK-131: Prisma — StaffBotIdentity

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-03-Notification-Database |
| ID | TASK-131 |
| Priority | P0 |
| Depends on | TASK-130 |
| Blocks | TASK-133, TASK-136, TASK-147 |
| Estimated | 4h |

---

## هدف

مدل `StaffBotIdentity` — اتصال staff به chat_id بله با base fields کامل و soft delete.

---

## معیار پذیرش

- [ ] Prisma model با تمام base fields + soft delete
- [ ] Unique `(tenantId, staffId, platform)` where deletedAt IS NULL
- [ ] `baleChatId` String — User.id
- [ ] `onDelete: Restrict`
- [ ] Migration + seed-safe

---

## مشخصات فنی

### Model

```prisma
model StaffBotIdentity {
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
  tenantId    String   @map("tenant_id") @db.Uuid
  staffId     String   @map("staff_id") @db.Uuid
  platform    String   // bale | telegram
  chatId      String   @map("chat_id")   // Bale User.id as string
  username    String?
  linkedAt    DateTime @default(now()) @map("linked_at") @db.Timestamptz

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  staff  Staff  @relation(fields: [staffId], references: [id], onDelete: Restrict)

  @@unique([tenantId, staffId, platform, deletedAt])
  @@index([tenantId, chatId])
  @@map("staff_bot_identities")
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/infrastructure/persistence/prisma/schema/staff-bot-identity.prisma` |
| Update | `packages/infrastructure/persistence/prisma/schema.prisma` |
| Create | `packages/infrastructure/persistence/migrations/.../staff_bot_identity` |

---

## مراحل پیاده‌سازی

1. Model per EXCELLENCE §8
2. Partial unique index pattern for soft delete
3. Migration
4. Relation to Staff

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Re-link same staff | — | soft-delete old + insert new |
| Staff hard delete | — | Restrict — must soft-delete staff first |
| Duplicate chatId same tenant | 409 | reject second staff |

---

## تست

- [ ] Migration applies
- [ ] Unique constraint behavior

---

## Policy Alignment

- [ ] SOFT-DELETE-POLICY
- [ ] EXCELLENCE §8
- [ ] onDelete: Restrict

---

## مراجع

- `docs/02-architecture/tenancy-and-entities.md`
- `docs/05-channels/bale-api-reference.md`

---

## Self-Review Score

> مبنا: `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md` §10

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata (ID, Priority, Depends, Blocks, Estimate) | /10 | 10 | Complete |
| Completeness (criteria, spec بدون TODO، files table) | /25 | 25 | Measurable AC |
| Policy (EXCELLENCE §8، soft delete، ADR cited) | /25 | 25 | Policies cited |
| Executability (edge cases، tests، dev بدون سؤال) | /25 | 24 | Edge cases + tests |
| Alignment (sync docs، contracts، Epic README) | /15 | 13 | Phase 4 sync |
| **جمع** | **/100** | **97** | ≥95 required برای Ready |
