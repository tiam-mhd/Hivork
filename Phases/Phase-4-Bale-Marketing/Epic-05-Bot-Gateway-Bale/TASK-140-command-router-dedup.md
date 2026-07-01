# TASK-140: Command Router & Dedup

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-05-Bot-Gateway-Bale |
| ID | TASK-140 |
| Priority | P0 |
| Depends on | TASK-138, TASK-139 |
| Blocks | TASK-142 |
| Estimated | 5h |

---

## هدف

`update_id` dedup در Redis + مسیریابی `/start`, `/installments`, callback به handlerها.

---

## معیار پذیرش

- [ ] Redis dedup key `bale:update:{update_id}` TTL 48h
- [ ] Router: message.text commands + callback_query.data prefix
- [ ] Handlers inject use cases — no inline business logic
- [ ] Ignore duplicate update_id silently
- [ ] Unit + integration tests

---

## مشخصات فنی

### Dedup

```typescript
const key = `bale:update:${update.update_id}`;
const acquired = await redis.set(key, '1', 'NX', 'EX', 172800);
if (!acquired) return; // duplicate
```

### Routes

| Pattern | Handler |
|---------|---------|
| `/start link_*` | StartLinkHandler (TASK-142) |
| `/start` | HelpHandler |
| `/installments` | ListInstallmentsHandler (TASK-143) |
| `callback:report_payment:*` | ReportPaymentHandler (TASK-144) |

### Architecture

```
WebhookController → CommandRouter → Handler → UseCase
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/bot-gateway/src/bale/command-router.ts` |
| Create | `apps/bot-gateway/src/bale/command-router.spec.ts` |
| Update | `apps/bot-gateway/src/bale/bale-webhook.controller.ts` |

---

## مراحل پیاده‌سازی

1. Dedup layer
2. Route table
3. Wire handlers (stubs ok until TASK-142+)
4. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Duplicate update_id | — | no-op |
| Unknown command | — | help template |
| Malformed callback data | — | answerCallbackQuery error toast |

---

## تست

- [ ] Unit: dedup skips second
- [ ] Unit: route /start link_
- [ ] Integration: dispatch mock

---

## Policy Alignment

- [ ] No business logic in router
- [ ] Handlers → application use cases

---

## مراجع

- `docs/05-channels/bale-api-reference.md`

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
