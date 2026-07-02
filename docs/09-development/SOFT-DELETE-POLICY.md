# سیاست Soft Delete — Hivork

> **وضعیت:** اجباری — **بدون استثنا** برای داده‌های business  
> **ADR:** ADR-013  
> **اصل:** هیچ داده‌ای از بین نمی‌رود — حذف = پنهان‌سازی + قابل بازیابی

---

## ۱. قانون مطلق

```
❌ HARD DELETE  — ممنوع در کل application (Prisma delete / SQL DELETE)
✅ SOFT DELETE  — تنها روش «حذف» — set deletedAt + deletedById
✅ RESTORE      — بازگردانی با clear deletedAt (با permission)
```

| | Hard Delete | Soft Delete |
|---|-------------|-------------|
| داده در DB | از بین می‌رود | باقی می‌ماند |
| کاربر عادی | — | **نمی‌بیند** |
| Admin/Owner | — | می‌تواند restore کند |
| Audit | غیرقابل ردیابی | deletedBy + audit log |

---

## ۲. چه چیزهایی Soft Delete می‌شوند

**همه** entityهای business — شامل ولی نه محدود به:

- Tenant, Branch, **User**, Staff, Role (custom)
- GlobalCustomer, TenantCustomer, BotIdentity
- Sale, Installment, PaymentAttempt, PersonalInstallment
- Settings, Subscription records
- PlatformUser
- فایل‌ها / attachments (soft delete + orphan cleanup job — نه delete از storage بدون archive)

### استثنا — فقط داده ephemeral (نه business)

| نوع | روش | دلیل |
|-----|-----|------|
| OTP codes (Redis) | TTL expire | امنیت — نه archive |
| Rate limit counters | TTL | موقت |
| JWT blacklist (optional) | TTL | موقت |

**AuditLog، OutboxEvent، ContractVersion:** append-only — **هرگز delete** (نه soft نه hard). `ContractVersion` = تاریخچه immutable snapshot قرارداد (IFP-056).

---

## ۳. فیلدهای اجباری (هر جدول business)

```prisma
deletedAt   DateTime? @map("deleted_at") @db.Timestamptz
deletedById String?   @map("deleted_by_id") @db.Uuid
```

اختیاری برای trace:

```prisma
deleteReason String? @map("delete_reason")  // why soft-deleted
```

---

## ۴. Query — پیش‌فرض پنهان

### Rule

**هر** read query باید implicit filter داشته باشد:

```typescript
where: { deletedAt: null, ... }
```

### Prisma Extension (اجباری)

`packages/infrastructure/src/prisma/prisma-soft-delete.extension.ts`

```typescript
// findMany, findFirst, count → inject deletedAt: null
// delete, deleteMany → FORBIDDEN — throw or redirect to softDelete()
// update on deleted row → 404 unless restore flow
```

### Repository pattern

```typescript
async softDelete(id: string, ctx: ActorContext, reason?: string): Promise<void> {
  await prisma.entity.update({
    where: { id, deletedAt: null },
    data: {
      deletedAt: new Date(),
      deletedById: ctx.actorId,
      deleteReason: reason,
      updatedById: ctx.actorId,
    },
  });
  await audit.log({ action: 'entity.soft_delete', ... });
}
```

**ممنوع:** `prisma.*.delete()` در codebase — ESLint rule یا grep CI check.

---

## ۵. روابط (Cascade)

**ممنوع:** `onDelete: Cascade` که hard delete child

| سناریو | رفتار |
|--------|--------|
| Soft delete TenantCustomer | record پنهان — Sales/Installments **باقی** (financial history) |
| Soft delete Staff | staff پنهان — created records **باقی** با createdById |
| Soft delete Sale (cancelled) | status=cancelled — **نه delete**؛ اگر «حذف» خواست → soft delete + audit |
| Soft delete Branch | soft delete — reassign or block if active sales |

**Installment paid/waived:** حتی soft delete **توصیه نمی‌شود** — فقط status terminal. اگر policy اجبار soft delete → فقط platform admin + audit.

---

## ۶. بازیابی (Restore)

### Permission

| Actor | Scope |
|-------|--------|
| `platform:super_admin` | همه tenants |
| `tenant:owner` | tenant خود |
| `core.data.restore` | permission اختصاصی (optional) |

### API Pattern

```
POST /api/v1/admin/restore/{entityType}/{id}   # platform
POST /api/v1/{resource}/{id}/restore           # tenant-scoped
```

### Restore logic

```typescript
data: { deletedAt: null, deletedById: null, deleteReason: null, updatedById: ctx.actorId }
// + audit: entity.restore
```

### UI

- **کاربر عادی:** هیچ trace از deleted items
- **Admin panel (phase 2+):** «سطل بازیافت» — list soft-deleted + restore button
- **Tenant owner:** recycle bin for customers (optional module setting)

---

## ۷. حریم خصوصی (GDPR-like)

درخواست «حذف کامل» مشتری:

```
❌ DELETE FROM users / global_customers
✅ soft delete + pseudonymize:
   User.phone → hash/deleted_{uuid}
   GlobalCustomer.name → «حذف‌شده»
   bot identities → soft delete
   داده مالی tenant → باقی (legal obligation)
```

---

## ۸. UI / UX

| Context | Behavior |
|---------|----------|
| List pages | فقط `deletedAt: null` |
| Search | deleted excluded |
| API 404 | id exists but soft-deleted → 404 (نه leak existence) |
| Delete button | confirm dialog + reason optional |
| Success message | «حذف شد» (user thinks deleted — actually hidden) |

---

## ۹. تست (اجباری)

```
[ ] softDelete → not in list API
[ ] softDelete → get by id → 404 for staff
[ ] restore → visible again
[ ] prisma.delete in code → CI fails / extension throws
[ ] cross-tenant cannot restore other's data
[ ] audit log entry on delete and restore
```

---

## ۱۰. CI / Code Review

```bash
# CI grep — fail if found in apps/ packages/ modules/
rg "\.delete\(" --glob "*.ts" --glob "!*.spec.ts"
# Allowlist: only test files or explicit // soft-delete-allow comment (none by default)
```

Review checklist:

- [ ] No `delete()` on Prisma models
- [ ] Extension registered on PrismaClient
- [ ] New table has deletedAt + deletedById

---

## ۱۱. مراجع

- `docs/09-development/EXCELLENCE-STANDARDS.md` §2
- `docs/09-development/DEVELOPMENT_RULES.md` §3.5
- `docs/06-operations/security-and-audit.md`
- ADR-013

---

*نسخه 1.0 — 1405/04/08*
