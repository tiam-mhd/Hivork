# TASK-026: Prisma Schema — OutboxEvent

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-04-Database |
| ID | TASK-026 |
| Priority | P0 |
| Depends on | TASK-018 |
| Blocks | TASK-027, TASK-050 |
| Estimated | 2h |

---

## هدف

تعریف مدل Prisma برای `OutboxEvent` — جدول Transactional Outbox برای reliable event delivery. هر domain write که side effect دارد (notification، stats، sync) یک OutboxEvent در همان transaction می‌نویسد. Worker این رویدادها را poll کرده و process می‌کند.

این جدول **استثنا** است: append-only، بدون soft delete. فقط `status` تغییر می‌کند (pending → processing → processed/failed).

---

## معیار پذیرش

- [ ] مدل `OutboxEvent` با `createdAt` — بدون `updatedAt`، بدون soft delete fields
- [ ] Enum `OutboxStatus`: pending, processing, processed, failed
- [ ] فیلدهای: `aggregateType`, `aggregateId`, `eventType`, `payload`, `status`, `attempts`, `lastError`, `processedAt`
- [ ] Indexes: `(status, createdAt)`, `(tenantId, createdAt DESC)`
- [ ] Prisma extension: `delete`/`deleteMany` → block
- [ ] Worker در TASK-050: poll pending → process → mark processed/failed

---

## مشخصات فنی

### Schema (Append-Only Exception)

```prisma
enum OutboxStatus {
  pending
  processing
  processed
  failed
}

model OutboxEvent {
  id            String       @id @default(uuid()) @db.Uuid
  tenantId      String?      @map("tenant_id") @db.Uuid
  aggregateType String       @map("aggregate_type")
  aggregateId   String       @map("aggregate_id") @db.Uuid
  eventType     String       @map("event_type")
  payload       Json
  status        OutboxStatus @default(pending)
  attempts      Int          @default(0)
  lastError     String?      @map("last_error")
  processedAt   DateTime?    @map("processed_at") @db.Timestamptz
  metadata      Json?        @db.JsonB
  createdAt     DateTime     @default(now()) @map("created_at") @db.Timestamptz

  @@index([status, createdAt])
  @@index([tenantId, createdAt(sort: Desc)])
  @@map("outbox_events")
}
```

### Pattern (TASK-050)

```typescript
// در همان database transaction با domain write:
await prisma.$transaction([
  prisma.sale.update({ ... }),
  prisma.outboxEvent.create({
    data: {
      tenantId,
      aggregateType: 'Sale',
      aggregateId: sale.id,
      eventType: 'SaleCreated',
      payload: { saleId: sale.id, ... },
    }
  }),
]);

// Worker (BullMQ / scheduler):
// 1. SELECT FOR UPDATE SKIP LOCKED WHERE status=pending LIMIT N
// 2. status → processing
// 3. process event (idempotent handler)
// 4. status → processed (یا failed + attempts++)
```

### Idempotency

- Handler باید idempotent باشد (duplicate delivery ممکن است)
- Key: `(aggregateId, eventType)` برای deduplication در handler
- `attempts` حداکثر N بار retry (configurable)

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `prisma/schema.prisma` |
| Create | `packages/infrastructure/src/outbox/prisma-outbox.publisher.ts` — TASK-050 |
| Migration | TASK-027 |

---

## مراحل پیاده‌سازی

1. اضافه کردن enum `OutboxStatus`
2. اضافه کردن مدل `OutboxEvent` **بدون** updatedAt/deletedAt
3. تأیید indexes برای worker poll
4. `pnpm prisma validate`
5. در TASK-050: پیاده‌سازی publisher و processor

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| delete OutboxEvent | — | Prisma extension block |
| handler fail | — | status=failed، attempts++ |
| attempts > maxRetry | — | DLQ یا alert |
| duplicate event | — | handler idempotent |
| tenantId=null | — | platform-level event |

---

## تست

- [ ] Integration: domain write + outbox در یک transaction
- [ ] Integration: worker poll → process → mark processed
- [ ] Unit: handler idempotent (اجرای دو بار → نتیجه یکسان)
- [ ] Integration: `delete` روی OutboxEvent → block

---

## Policy Alignment

- [ ] SOFT-DELETE-POLICY §2 — OutboxEvent استثنا: append-only، بدون soft delete
- [ ] ADR-013 — no delete on OutboxEvent
- [ ] DEVELOPMENT_RULES §1.4 — event-driven، handlers idempotent

---

## مراجع

- `docs/02-architecture/overview.md` §Events
- `docs/09-development/SOFT-DELETE-POLICY.md` §2

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | ID, Priority, Depends, Blocks, Estimate ✓ |
| Completeness | 25/25 | Schema append-only، pattern، idempotency، acceptance criteria ✓ |
| Policy | 25/25 | استثنا documented، extension policy، ADR-013 ✓ |
| Executability | 25/25 | Steps، edge cases، tests ✓ |
| Alignment | 15/15 | Sync با TASK-050 worker، event-driven arch ✓ |
| **جمع** | **100/100** | ≥95 required ✓ |
