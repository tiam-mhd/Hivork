# TASK-138: Bale Webhook Controller

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-05-Bot-Gateway-Bale |
| ID | TASK-138 |
| Priority | P0 |
| Depends on | TASK-127, TASK-128, TASK-129, TASK-126 |
| Blocks | TASK-139, TASK-140, TASK-172 |
| Estimated | 5h |

---

## هدف

Controller دریافت webhook بله — verify secret header، parse update، HTTP 200 سریع.

---

## معیار پذیرش

- [ ] `POST /bot/bale/webhook` در bot-gateway
- [ ] Verify `X-Telegram-Bot-Api-Secret-Token` === `BALE_WEBHOOK_SECRET`
- [ ] Parse body با baleUpdateSchema
- [ ] Return 200 immediately — queue/delegate async if needed
- [ ] ❌ No business logic — delegate to router (TASK-140)

---

## مشخصات فنی

### Route

```
POST /bot/bale/webhook
Header: X-Telegram-Bot-Api-Secret-Token: {secret}
Body: Bale Update JSON
```

### Auth failure

```
401 Unauthorized — constant-time compare
```

### Processing

```typescript
@Post('webhook')
async handleWebhook(@Headers('x-telegram-bot-api-secret-token') secret: string, @Body() body: unknown) {
  this.verifySecret(secret);
  const update = parseBaleUpdate(body);
  if (!update) return { ok: true };
  await this.commandRouter.dispatch(update);  // TASK-140
  return { ok: true };
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/bot-gateway/src/bale/bale-webhook.controller.ts` |
| Create | `apps/bot-gateway/src/bale/bale-webhook.controller.spec.ts` |
| Update | `apps/bot-gateway/src/bale/bale.module.ts` |

---

## مراحل پیاده‌سازی

1. Controller + secret verification
2. Parse + delegate
3. 401/200 tests
4. No business logic

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Missing secret | 401 | reject |
| Invalid JSON | 400 | reject |
| Valid update | 200 | dispatch router |

---

## تست

- [ ] Unit: secret verification
- [ ] Integration: 200 on valid update
- [ ] Integration: 401 wrong secret

---

## Policy Alignment

- [ ] No business logic in controller
- [ ] Use @hivork/application use cases via router

---

## مراجع

- `docs/05-channels/bale-api-reference.md`
- `docs/06-operations/security-and-audit.md`

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
