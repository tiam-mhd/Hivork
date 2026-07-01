# IFP-TASK-016: API Keys Management (Tenant Integration)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 01 — Auth & Security |
| Epic | Epic-05-Security-Settings-UI |
| ID | IFP-016 |
| Priority | P1 |
| Depends on | IFP-001, Phase 0 tenant/RBAC |
| Blocks | — |
| Estimated | 10h |

---

## هدف

مدیریت **کلید API** tenant برای یکپارچه‌سازی خارجی (webhook، import): ایجاد، لیست، لغو (soft delete)، scopes محدود — با نمایش secret فقط یک‌بار.

---

## معیار پذیرش

- [ ] Prisma `TenantApiKey` با base fields + `tenantId`
- [ ] `GET /api/v1/settings/api-keys` — cursor list (prefix only)
- [ ] `POST /api/v1/settings/api-keys` — create → return full key once
- [ ] `DELETE /api/v1/settings/api-keys/:id` — soft delete revoke
- [ ] Auth header: `Authorization: Bearer hivork_live_{key}` — separate guard
- [ ] Scopes: `installments.read`, `customers.read`, `webhooks.receive` (extensible)
- [ ] Permission: `core.security.apikey.view` / `create` / `revoke`
- [ ] Audit: `security.apikey.created` / `revoked` / `used`
- [ ] Rate limit per key: 1000 req/hour default

---

## مشخصات فنی

### Prisma Schema

```prisma
enum ApiKeyStatus {
  active
  revoked
  expired
}

model TenantApiKey {
  id           String       @id @default(uuid()) @db.Uuid
  tenantId     String       @map("tenant_id") @db.Uuid
  name         String       @db.VarChar(120)
  keyPrefix    String       @map("key_prefix") @db.VarChar(16)
  keyHash      String       @unique @map("key_hash") @db.VarChar(64)
  scopes       String[]     @default([])
  status       ApiKeyStatus @default(active)
  expiresAt    DateTime?    @map("expires_at") @db.Timestamptz
  lastUsedAt   DateTime?    @map("last_used_at") @db.Timestamptz
  lastUsedIp   String?      @map("last_used_ip") @db.VarChar(45)
  createdAt    DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime     @updatedAt @map("updated_at") @db.Timestamptz
  createdById  String       @map("created_by_id") @db.Uuid
  updatedById  String?      @map("updated_by_id") @db.Uuid
  deletedAt    DateTime?    @map("deleted_at") @db.Timestamptz
  deletedById  String?      @map("deleted_by_id") @db.Uuid
  deleteReason String?      @map("delete_reason")
  version      Int          @default(1)
  metadata     Json?        @db.JsonB

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)

  @@index([tenantId, status])
  @@index([keyPrefix])
  @@map("tenant_api_keys")
}
```

### Key Format

```
hivork_live_{32_random_base62}
Prefix stored: first 12 chars e.g. hivork_live_
Hash: SHA-256(full key)
```

### API Endpoints

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/v1/settings/api-keys` | `core.security.apikey.view` |
| POST | `/api/v1/settings/api-keys` | `core.security.apikey.create` |
| DELETE | `/api/v1/settings/api-keys/:id` | `core.security.apikey.revoke` |

#### POST Body

```typescript
{
  name: string;          // max 120
  scopes: string[];      // min 1
  expiresAt?: string;    // ISO optional
}
```

#### POST Response (once)

```json
{
  "id": "uuid",
  "name": "Integration ERP",
  "key": "hivork_live_xxxxxxxx",
  "keyPrefix": "hivork_live_",
  "scopes": ["installments.read"],
  "expiresAt": null,
  "createdAt": "..."
}
```

### ApiKey Auth Guard

```typescript
// Separate from staff JWT — for machine clients
@UseGuards(ApiKeyGuard)
// Sets tenantId from key — actor: 'api_key'
```

### Permissions (seed)

```typescript
'core.security.apikey.view',
'core.security.apikey.create',
'core.security.apikey.revoke',
```

Default: tenant owner role all three.

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `prisma/schema.prisma` — TenantApiKey |
| Create | `packages/application/src/security/*.use-case.ts` |
| Create | `apps/api/src/settings/api-keys.controller.ts` |
| Create | `apps/api/src/guards/api-key.guard.ts` |
| Create | `apps/web/app/(dashboard)/settings/security/api-keys/page.tsx` |
| Create | `packages/contracts/src/settings/api-key.schema.ts` |
| Update | `prisma/seed/permissions.ts` |

---

## مراحل پیاده‌سازی

1. Schema + migration
2. Create/list/revoke use cases
3. ApiKeyGuard + hash lookup
4. Settings API controller
5. UI list + create dialog + one-time secret modal
6. Audit + rate limiter
7. Integration tests

---

## Edge Cases & Errors

| سناریو | Code | رفتار |
|--------|------|--------|
| Invalid key | 401 `AUTH_API_KEY_INVALID` | |
| Revoked key | 401 `AUTH_API_KEY_REVOKED` | |
| Expired key | 401 `AUTH_API_KEY_EXPIRED` | |
| Scope insufficient | 403 `PERMISSION_DENIED` | |
| Max keys per tenant | 403 `TENANT_PLAN_LIMIT_EXCEEDED` | default 10 |
| Duplicate name | 409 `API_KEY_NAME_EXISTS` | |

---

## تست

- [ ] Integration: create → auth with key → success
- [ ] Integration: revoke → 401
- [ ] RBAC: deny create without permission
- [ ] Cross-tenant key → wrong tenant data blocked

---

## UX

- [ ] `/settings/security/api-keys` — table name, prefix, scopes, last used, status
- [ ] Create dialog — name, scopes multi-select, optional expiry
- [ ] One-time modal: «این کلید فقط یک‌بار نمایش داده می‌شود» + copy button
- [ ] Revoke confirm dialog
- [ ] Empty state: «هنوز کلید API ایجاد نکرده‌اید»
- [ ] Excellence §7

---

## Flow

```
Settings → Security → API Keys
  → Create → copy key → close modal
  → External system uses Bearer key
  → Revoke → key dead immediately
```

---

## Policy Alignment

- [ ] EXCELLENCE §8 — full base fields
- [ ] SOFT-DELETE — revoke = soft delete
- [ ] Never store plain key — hash only
- [ ] Audit create/revoke/use

---

## مراجع

- [installment-module-features.md §20](../../../docs/01-product/installment-module-features.md)
- [rbac.md](../../../docs/02-architecture/rbac.md)

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | /10 | 10 |
| Completeness | /25 | 25 |
| Policy | /25 | 25 |
| Executability | /25 | 24 |
| Alignment | /15 | 14 |
| **جمع** | **/100** | **98** |
