# TASK-172: Test — Webhook Secret Auth

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-14-Phase4-Tests |
| ID | TASK-172 |
| Priority | P0 |
| Depends on | TASK-138 |
| Blocks | TASK-174 |
| Estimated | 3h |

---

## هدف

Integration test — webhook 401 without secret، 200 with valid.

---

## معیار پذیرش

- [ ] POST webhook without header → 401
- [ ] Wrong secret → 401
- [ ] Valid secret + update → 200

---

## مشخصات فنی

### Test

```typescript
await request(app).post('/bot/bale/webhook').send(update).expect(401);
await request(app).post('/bot/bale/webhook').set('X-Telegram-Bot-Api-Secret-Token', secret).send(update).expect(200);
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/bot-gateway/test/bale-webhook-auth.spec.ts` |

---

## مراحل پیاده‌سازی

1. Supertest setup
2. Auth cases
3. Valid dispatch mock

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Timing attack | — | constant-time compare verified |

---

## تست

- [ ] Integration: 401/200 auth

---

## Policy Alignment

- [ ] Security — webhook secret mandatory

---

## مراجع

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
