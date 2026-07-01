# IFP-159: Prisma — StaffLoginLog (append-only)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 09 |
| Epic | Epic-01-User-Management-Extended |
| ID | IFP-159 |
| Priority | P0 |
| Depends on | IFP-001, Phase-0 TASK-019a |
| Blocks | IFP-160, IFP-165 |
| Estimated | 4h |

---

## هدف

ثبت immutable لاگ ورود Staff — IP، دستگاه، نتیجه، زمان — برای §۱۳ «ورودها / Log» و امنیت.

---

## معیار پذیرش

- [ ] Model `StaffLoginLog` append-only (no deletedAt)
- [ ] Fields: staffId, userId, tenantId, result, ip, userAgent, deviceFingerprint, failureReason
- [ ] Index `(tenantId, staffId, createdAt DESC)`
- [ ] Index `(tenantId, result, createdAt)`
- [ ] onDelete: Restrict
- [ ] Documented exception in SOFT-DELETE-POLICY

---

## مشخصات فنی

### Model (append-only — like AuditLog)

```prisma
model StaffLoginLog {
  id                String   @id @default(uuid()) @db.Uuid
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz
  tenantId          String   @map("tenant_id") @db.Uuid
  staffId           String?  @map("staff_id") @db.Uuid
  userId            String   @map("user_id") @db.Uuid
  result            String   // success | failed | blocked
  ip                String?
  userAgent         String?  @map("user_agent")
  deviceFingerprint String?  @map("device_fingerprint")
  failureReason     String?  @map("failure_reason")
  metadata          Json?    @db.JsonB

  @@index([tenantId, staffId, createdAt(sort: Desc)])
  @@index([tenantId, result, createdAt])
  @@map("staff_login_logs")
}
```

❌ delete/update on business meaning — insert only

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/infrastructure/persistence/prisma/schema/staff-login-log.prisma` |
| Update | `packages/infrastructure/persistence/prisma/prisma-extension.config.ts` |

---

## مراحل پیاده‌سازی

1. Add model
2. Hook auth success/failure to insert (IFP-160)
3. Migration

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| PII in logs | — | No plain phone in message — structured metadata only |
| Retention | — | Platform policy 90d archive job (P2) |

---

## تست

- [ ] Insert on login integration
- [ ] No soft-delete extension on model

---

## Policy Alignment

- [ ] SOFT-DELETE-POLICY append-only exception
- [ ] ADR-017 User identity

---

## مراجع

- `docs/06-operations/security-and-audit.md`
- `docs/01-product/installment-module-features.md §13`

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
