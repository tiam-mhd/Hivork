# TASK-130: Prisma — NotificationLog

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-03-Notification-Database |
| ID | TASK-130 |
| Priority | P0 |
| Depends on | TASK-126 |
| Blocks | TASK-131, TASK-133, TASK-154 |
| Estimated | 4h |

---

## هدف

مدل `NotificationLog` append-only برای ردیابی ارسال اعلان — idempotency key، بدون soft delete و بدون hard delete.

---

## معیار پذیرش

- [ ] Prisma model `NotificationLog` با migration
- [ ] فیلدهای base (createdAt/updatedAt/audit) — **بدون** deletedAt
- [ ] Unique index روی `idempotencyKey`
- [ ] `onDelete: Restrict` روی FKها
- [ ] Repository: insert + list فقط — no update/delete
- [ ] CI grep: no `.delete` on NotificationLog

---

## مشخصات فنی

### Model

```prisma
model NotificationLog {
  id             String    @id @default(uuid()) @db.Uuid
  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  createdById    String?   @map("created_by_id") @db.Uuid
  updatedById    String?   @map("updated_by_id") @db.Uuid
  // append-only: NO deletedAt / deletedById / deleteReason (مثل AuditLog)
  version        Int       @default(1)
  metadata       Json?     @db.JsonB
  tenantId       String    @map("tenant_id") @db.Uuid
  installmentId  String?   @map("installment_id") @db.Uuid
  channel        String    // bale | telegram | sms
  reminderType   String?   @map("reminder_type")
  status         String    // scheduled | sent | failed | skipped
  idempotencyKey String    @unique @map("idempotency_key")
  recipientRef   String    @map("recipient_ref")
  externalMsgId  String?   @map("external_message_id")
  errorCode      String?   @map("error_code")
  sentAt         DateTime? @map("sent_at") @db.Timestamptz

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)

  @@index([tenantId, status])
  @@index([tenantId, installmentId])
  @@map("notification_logs")
}
```

### Idempotency key

```
sha256(`${installmentId}:${reminderType}:${channel}`)
```

### Append-only policy

❌ `prisma.notificationLog.delete()` — FORBIDDEN (like AuditLog)

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/infrastructure/persistence/prisma/schema/notification-log.prisma` |
| Update | `packages/infrastructure/persistence/prisma/schema.prisma` |
| Create | `packages/infrastructure/persistence/migrations/.../notification_log` |

---

## مراحل پیاده‌سازی

1. Add model per spec
2. Migration
3. Document append-only in SOFT-DELETE-POLICY exception list
4. Export types

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Duplicate idempotencyKey | — | unique violation → skip send |
| Attempt hard delete | — | CI blocked |
| Cross-tenant insert | — | tenantId from context only |

---

## تست

- [ ] Migration applies cleanly
- [ ] Unique constraint on idempotencyKey

---

## Policy Alignment

- [ ] SOFT-DELETE-POLICY — NotificationLog exception (append-only)
- [ ] EXCELLENCE §8 base fields
- [ ] onDelete: Restrict

---

## مراجع

- `docs/09-development/SOFT-DELETE-POLICY.md`
- `docs/05-channels/notifications.md`

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
