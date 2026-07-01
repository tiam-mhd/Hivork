# TASK-137: API — POST /bot/link-token

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-04-Bot-Link-API |
| ID | TASK-137 |
| Priority | P0 |
| Depends on | TASK-134, TASK-136, TASK-126 |
| Blocks | TASK-138, TASK-142, TASK-169, TASK-173 |
| Estimated | 4h |

---

## هدف

REST endpoint تولید لینک بازو — thin controller → `GenerateBotLinkTokenUseCase`.

---

## معیار پذیرش

- [ ] `POST /api/v1/bot/link-token`
- [ ] `@RequireAuth()` `@RequirePermission('installments.customer.link_bot')`
- [ ] Request/response Zod از contracts TASK-126
- [ ] Swagger/OpenAPI sync
- [ ] RBAC + cross-tenant integration tests

---

## مشخصات فنی

### Endpoint

```
POST /api/v1/bot/link-token
Authorization: Bearer (staff)
X-Branch-Id: {branchId}

Body: { tenantCustomerId: uuid, platform?: 'bale' }
Response 201: { token, deepLink, expiresAt }
```

### Controller (thin)

```typescript
@Post('link-token')
@RequirePermission('installments.customer.link_bot')
async createLinkToken(@Body() dto: GenerateBotLinkTokenRequestDto) {
  return this.generateBotLinkTokenUseCase.execute({ ...ctx, ...dto });
}
```

❌ No business logic in controller

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/api/src/modules/bot/bot-link.controller.ts` |
| Create | `apps/api/src/modules/bot/bot.module.ts` |
| Update | `apps/api/src/app.module.ts` |

---

## مراحل پیاده‌سازی

1. Controller + module
2. Wire use case
3. Contract validation pipe
4. RBAC tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Invalid UUID | 400 VALIDATION_ERROR | Zod |
| No permission | 403 FORBIDDEN | RBAC |
| Wrong tenant customer | 404 | no leak |

---

## تست

- [ ] Integration: 201 happy path
- [ ] Integration: RBAC deny
- [ ] Integration: cross-tenant fail

---

## Policy Alignment

- [ ] ADR-016 /api/v1
- [ ] RBAC guard mandatory
- [ ] Thin controller

---

## مراجع

- `packages/contracts/src/bot/link-token.schema.md`
- `docs/02-architecture/rbac.md`

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
