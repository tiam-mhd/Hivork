# TASK-133: Notification Repositories

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-03-Notification-Database |
| ID | TASK-133 |
| Priority | P0 |
| Depends on | TASK-130, TASK-131, TASK-132 |
| Blocks | TASK-134, TASK-150, TASK-137 |
| Estimated | 5h |

---

## هدف

Repository layer برای NotificationLog، StaffBotIdentity، BotLinkToken — tenant-scoped، soft-delete filter.

---

## معیار پذیرش

- [ ] `NotificationLogRepository` — create, findByIdempotencyKey, list cursor
- [ ] `StaffBotIdentityRepository` — upsert link, findByChatId, softDelete
- [ ] `BotLinkTokenStore` wired via DI
- [ ] همه queryها `tenantId` + `deletedAt: null`
- [ ] Integration test با Testcontainers

---

## مشخصات فنی

### NotificationLogRepository

```typescript
interface NotificationLogRepository {
  create(data: CreateNotificationLog): Promise<NotificationLog>;
  findByIdempotencyKey(key: string): Promise<NotificationLog | null>;
  list(query: ListNotificationLogsQuery): Promise<CursorPage<NotificationLog>>;
  // NO update, NO delete
}
```

### StaffBotIdentityRepository

```typescript
interface StaffBotIdentityRepository {
  link(input: LinkStaffBotInput): Promise<StaffBotIdentity>;
  findByChatId(tenantId: string, platform: string, chatId: string): Promise<StaffBotIdentity | null>;
  softDelete(id: string, deletedById: string, reason?: string): Promise<void>;
}
```

### Tenant filter (mandatory)

```typescript
where: { tenantId: ctx.tenantId, deletedAt: null }
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/infrastructure/persistence/repositories/notification-log.repository.ts` |
| Create | `packages/infrastructure/persistence/repositories/staff-bot-identity.repository.ts` |
| Create | `packages/infrastructure/persistence/repositories/notification.repositories.spec.ts` |
| Update | `packages/infrastructure/persistence/repositories/index.ts` |

---

## مراحل پیاده‌سازی

1. NotificationLog repo — append only
2. StaffBotIdentity repo — soft delete
3. Wire BotLinkTokenStore
4. Integration tests cross-tenant fail

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Cross-tenant read | — | returns null / forbidden |
| NotificationLog delete attempt | — | method not exposed |
| List without tenantId | — | compile-time / runtime guard |

---

## تست

- [ ] Integration: create notification log
- [ ] Integration: staff link + soft delete
- [ ] Integration: cross-tenant isolation

---

## Policy Alignment

- [ ] Tenancy — every query tenantId
- [ ] SOFT-DELETE-POLICY
- [ ] NotificationLog append-only

---

## مراجع

- `docs/02-architecture/tenancy-and-entities.md`
- `docs/09-development/SOFT-DELETE-POLICY.md`

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
