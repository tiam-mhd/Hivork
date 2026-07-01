# TASK-050: Service — Outbox Publisher

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-08-Core-Services |
| ID | TASK-050 |
| Priority | P0 |
| Depends on | TASK-026 (OutboxEvent Prisma schema), TASK-009 (domain events) |
| Blocks | — |
| Estimated | 6h |

---

## هدف

پیاده‌سازی Transactional Outbox Pattern: side effects (یادآور، notification، stats) از طریق `OutboxEvent` table و نه direct call. Publisher در همان transaction DB اصلی می‌نویسد → Worker بعداً event‌ها را با idempotency پردازش می‌کند. Phase 0: skeleton worker بدون handlers واقعی (Phase 2).

---

## معیار پذیرش

- [ ] `DomainEvent` abstract base class در `packages/domain/`
- [ ] `IOutboxPublisher` port با `publish(event, options?, tx?): Promise<void>`
- [ ] `PrismaOutboxPublisher` نوشتن در `OutboxEvent` table
- [ ] Publisher **همیشه از `tx` استفاده می‌کند** وقتی داده شده → atomicity با business operation
- [ ] `OutboxEvent` status: `pending → processing → processed | failed`
- [ ] `OutboxProcessorService` — batch processing، idempotent via `updateMany` with `status=pending` filter
- [ ] Worker retry: failed events در فاز آینده retry می‌شوند (Phase 2)
- [ ] Integration test: event + entity save در یک transaction — هر دو یا هیچ‌کدام
- [ ] Unit test: `publish()` در `OutboxEvent.create()` با صحیح payload می‌نویسد

---

## مشخصات فنی

### DomainEvent Base

```typescript
// packages/domain/src/events/domain-event.base.ts
export abstract class DomainEvent {
  abstract readonly eventType: string;
  abstract readonly aggregateId: string;
  abstract toPayload(): Record<string, unknown>;
}
```

### IOutboxPublisher Port

```typescript
// packages/application/src/ports/outbox.port.ts
export type OutboxTransaction = Omit<PrismaClient, ...>;

export type OutboxPublishOptions = {
  tenantId?: string;
  aggregateType?: string;
};

export interface IOutboxPublisher {
  publish(event: DomainEvent, options?: OutboxPublishOptions, tx?: OutboxTransaction): Promise<void>;
}

export const OUTBOX_PUBLISHER = Symbol('OUTBOX_PUBLISHER');
```

### PrismaOutboxPublisher

```typescript
// packages/infrastructure/src/outbox/prisma-outbox.publisher.ts
@Injectable()
export class PrismaOutboxPublisher implements IOutboxPublisher {
  constructor(private readonly prisma: PrismaService) {}

  async publish(event: DomainEvent, options?: OutboxPublishOptions, tx?: OutboxTransaction): Promise<void> {
    const client = tx ?? this.prisma;
    await client.outboxEvent.create({
      data: {
        tenantId: options?.tenantId ?? getTenantId(),
        aggregateType: options?.aggregateType ?? event.eventType.split('.')[0],
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        payload: event.toPayload(),
        status: 'pending',
      },
    });
  }
}
```

### OutboxProcessorService (Scheduler skeleton)

```typescript
// packages/infrastructure/src/outbox/outbox-processor.service.ts
@Injectable()
export class OutboxProcessorService {
  async processPendingBatch(batchSize = 25): Promise<number> {
    // 1. findMany where status=pending
    // 2. for each: updateMany where id=X AND status=pending (idempotent claim)
    // 3. if claimed.count=0 → skip (already claimed by another worker)
    // 4. Phase 2: dispatch to registered event handlers
    // 5. update status=processed | failed
  }
}
```

### OutboxEvent Status Flow

```
pending → processing → processed
                     ↘ failed (retry in Phase 2)
```

### Atomicity Example (در Use Case)

```typescript
await prisma.$transaction(async (tx) => {
  await prisma.sale.create({ data: { ... }, tx });
  await outboxPublisher.publish(new SaleCreatedEvent(...), { tenantId }, tx);
});
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create/Update | `packages/domain/src/events/domain-event.base.ts` |
| Create/Update | `packages/application/src/ports/outbox.port.ts` |
| Create/Update | `packages/infrastructure/src/outbox/prisma-outbox.publisher.ts` |
| Create/Update | `packages/infrastructure/src/outbox/outbox-processor.service.ts` |
| Create/Update | `packages/infrastructure/src/outbox/prisma-outbox.publisher.spec.ts` |
| Create/Update | `packages/infrastructure/src/outbox/prisma-outbox.publisher.integration.spec.ts` |
| Create/Update | `packages/infrastructure/src/outbox/outbox-processor.service.spec.ts` |

---

## مراحل پیاده‌سازی

1. تعریف `DomainEvent` abstract class در domain
2. تعریف `IOutboxPublisher`, `OutboxPublishOptions`, `OutboxTransaction` در application port
3. پیاده‌سازی `PrismaOutboxPublisher.publish()` با transaction-aware client
4. پیاده‌سازی `OutboxProcessorService.processPendingBatch()` با idempotent claim
5. Unit tests برای publisher
6. Integration test: entity + outbox در یک transaction

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| `tx` داده نشده | از `this.prisma` مستقیم می‌نویسد |
| Business write rollback | OutboxEvent هم rollback می‌شود (atomicity) |
| Worker crash بین claim و processed | status=processing می‌ماند → Phase 2 cleanup job |
| Duplicate event publish | دو row می‌سازد — handler‌ها باید idempotent باشند |
| DB unavailable | publish throw می‌کند → business operation هم fail می‌شود |

---

## تست

- [ ] Unit: `publish()` → `outboxEvent.create()` با درست payload
- [ ] Unit: `processPendingBatch()` → claimی که count=0 → skip
- [ ] Integration: entity + event در یک transaction — هر دو یا هیچ‌کدام (rollback test)
- [ ] Integration: `processPendingBatch()` → status از `pending` به `processed` تغییر می‌کند

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §3 (transactions، idempotency)
- [ ] SOFT-DELETE-POLICY: OutboxEvent استثنا — append-only، هرگز delete
- [ ] ADR-013: OutboxEvent مانند AuditLog — `no delete`

---

## مراجع

- `docs/02-architecture/overview.md` (Event-driven section)
- `docs/09-development/SOFT-DELETE-POLICY.md` §2
- `docs/08-decisions/adr-log.md`

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | Priority, Depends, Blocks, Estimated |
| Completeness | 25/25 | DomainEvent، Publisher، Processor، Files، Steps |
| Policy | 25/25 | Atomicity، OutboxEvent append-only، idempotency |
| Executability | 25/25 | Code patterns، transaction example، edge cases |
| Alignment | 14/15 | sync با domain-event.base.ts و outbox.port.ts |
| **جمع** | **99/100** | ≥95 ✅ |
