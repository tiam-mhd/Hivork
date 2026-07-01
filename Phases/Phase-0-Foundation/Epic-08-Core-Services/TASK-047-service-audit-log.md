# TASK-047: Service — Audit Log

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-08-Core-Services |
| ID | TASK-047 |
| Priority | P0 |
| Depends on | TASK-024 (AuditLog Prisma schema), TASK-012 (PrismaService) |
| Blocks | TASK-054, TASK-056 |
| Estimated | 4h |

---

## هدف

سرویس append-only ثبت رویدادهای حساس سیستم (`AuditLogService`). هر عملیات مهم — ایجاد مستأجر، تأیید پرداخت، لغو فروش، تغییر نقش — باید در `audit_logs` ثبت شود. AuditLog هرگز حذف (hard یا soft) نمی‌شود.

---

## معیار پذیرش

- [ ] `AuditService` interface با متدهای `log()` و `find()` در `packages/application/src/ports/audit.port.ts`
- [ ] `PrismaAuditService` در `packages/infrastructure/src/audit/` متد `log()` را پیاده می‌کند
- [ ] `log()` در یک `prisma.auditLog.create()` می‌نویسد — هرگز update یا delete روی AuditLog نیست
- [ ] `AuditLogInput` شامل: `tenantId?, actorType, actorId, action, entityType, entityId, oldValue?, newValue?, ip?, userAgent?, metadata?`
- [ ] `actorType` فقط: `staff | customer | system | platform`
- [ ] متد `find()` با query: `tenantId?, entityType?, entityId?, action?, limit?` (max 100)
- [ ] `AUDIT_SERVICE` symbol export برای NestJS DI
- [ ] Integration test: `log()` یک row در `audit_logs` ایجاد می‌کند
- [ ] Unit test: سرویس با mock prisma کار می‌کند
- [ ] Actions مستندشده: `tenant.create`, `customer.create`, `staff.login`, `sale.create|cancel`, `payment.confirm|reject`, `installment.waive`, `settings.change`, `entity.soft_delete`, `entity.restore`, `staff.*`, `role.*`

---

## مشخصات فنی

### AuditService Port

```typescript
// packages/application/src/ports/audit.port.ts
export type ActorType = 'staff' | 'customer' | 'system' | 'platform';

export type AuditLogInput = {
  tenantId?: string;         // null for platform-level events
  actorType: ActorType;
  actorId: string;           // staffId | customerId | 'system'
  action: string;            // e.g. 'sale.create', 'tenant.create'
  entityType: string;        // e.g. 'tenant', 'sale', 'tenant_customer'
  entityId: string;
  oldValue?: unknown;        // before state (JSON-serializable)
  newValue?: unknown;        // after state
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

export type AuditLogRecord = AuditLogInput & {
  id: string;
  createdAt: Date;
};

export type AuditFindQuery = {
  tenantId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  limit?: number; // max 100, default 50
};

export interface AuditService {
  log(entry: AuditLogInput): Promise<void>;
  find(query: AuditFindQuery): Promise<AuditLogRecord[]>;
}

export const AUDIT_SERVICE = Symbol('AUDIT_SERVICE');
```

### PrismaAuditService

```typescript
// packages/infrastructure/src/audit/prisma-audit.service.ts
@Injectable()
export class PrismaAuditService implements AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditLogInput): Promise<void> {
    await this.prisma.auditLog.create({ data: { ...entry } });
    // Append-only — no update, no delete, no soft delete
  }

  async find(query: AuditFindQuery): Promise<AuditLogRecord[]> {
    // orderBy createdAt desc, limit capped at 100
  }
}
```

### قوانین AuditLog

- **Append-only**: هرگز `update`, `delete`, `softDelete` روی AuditLog نیست
- **Non-blocking**: در use case بعد از commit اصلی صدا زده می‌شود (ولی guaranteed write)
- **Idempotent**: هر call یک row می‌سازد — یک redo در idempotency context = دو row (قابل قبول)
- **PII**: فقط IDs در log — نه شماره تلفن plain text در message

### Actions حساس (اجباری audit)

| Action | Entity |
|--------|--------|
| `tenant.create` | tenant |
| `customer.create` | tenant_customer |
| `staff.login` | staff |
| `sale.create` | sale |
| `sale.cancel` | sale |
| `payment.confirm` | payment |
| `payment.reject` | payment |
| `installment.waive` | installment |
| `settings.change` | setting |
| `entity.soft_delete` | any |
| `entity.restore` | any |
| `staff.*` | staff |
| `role.*` | role |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create/Update | `packages/application/src/ports/audit.port.ts` |
| Create/Update | `packages/infrastructure/src/audit/prisma-audit.service.ts` |
| Create/Update | `packages/infrastructure/src/audit/prisma-audit.service.spec.ts` |
| Create/Update | `packages/infrastructure/src/audit/prisma-audit.service.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. تعریف `AuditLogInput`, `AuditLogRecord`, `AuditFindQuery`, `AuditService` interface، `AUDIT_SERVICE` symbol در port
2. پیاده‌سازی `PrismaAuditService.log()` با `prisma.auditLog.create()`
3. پیاده‌سازی `PrismaAuditService.find()` با `findMany` + limit capped
4. Unit test با mock prisma
5. Integration test با database واقعی
6. Register در NestJS module با `AUDIT_SERVICE` token

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| `tenantId` null | — | مجاز — platform-level event |
| `prisma.auditLog.create` throw | — | log خطا — use case باید continue کند (fire-and-forget acceptable) |
| `find` limit > 100 | — | clamp به 100 |
| AuditLog delete attempt | 403 HARD_DELETE_FORBIDDEN | Prisma extension block می‌کند |

---

## تست

- [ ] Unit: `log()` → `prisma.auditLog.create()` با دقیقاً همان data صدا زده می‌شود
- [ ] Unit: `find()` → query با limit clamp
- [ ] Integration: `log()` یک row در DB می‌سازد، `find()` آن را برمی‌گرداند
- [ ] Integration: هیچ `delete`/`update` روی AuditLog وجود ندارد

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §3 (use case completeness)
- [ ] SOFT-DELETE-POLICY: AuditLog استثنا — append-only، هرگز delete
- [ ] ADR-013: soft delete فقط برای business entities — AuditLog مستثنا

---

## مراجع

- `docs/06-operations/security-and-audit.md`
- `docs/09-development/SOFT-DELETE-POLICY.md` §2 (exceptions)
- `docs/08-decisions/adr-log.md` — ADR-013

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | Priority, Depends, Blocks, Estimated همه موجود |
| Completeness | 25/25 | Interface کامل، Files table، Steps، Edge cases |
| Policy | 25/25 | Append-only rule، SOFT-DELETE exception، ADR-013 |
| Executability | 25/25 | Dev می‌تواند بدون سؤال پیاده کند — مثال کد، Actions table |
| Alignment | 14/15 | sync با audit.port.ts و security-and-audit.md |
| **جمع** | **99/100** | ≥95 ✅ |
