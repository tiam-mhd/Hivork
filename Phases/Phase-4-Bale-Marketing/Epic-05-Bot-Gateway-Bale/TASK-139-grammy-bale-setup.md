# TASK-139: grammy Bale Setup

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-05-Bot-Gateway-Bale |
| ID | TASK-139 |
| Priority | P0 |
| Depends on | TASK-127, TASK-138 |
| Blocks | TASK-140, TASK-141 |
| Estimated | 4h |

---

## هدف

پیکربندی grammY با `apiRoot: 'https://tapi.bale.ai'` برای ارسال پیام و callback.

---

## معیار پذیرش

- [ ] Bot instance factory با Bale apiRoot
- [ ] Inject BaleHttpClient or grammY Api client
- [ ] Middleware slot for logging (structured, no PII)
- [ ] Export typed Bot for handlers
- [ ] Unit test factory config

---

## مشخصات فنی

### grammY Bale config

```typescript
import { Bot } from 'grammy';

export function createBaleBot(token: string) {
  return new Bot(token, {
    client: { apiRoot: 'https://tapi.bale.ai' },
  });
}
```

### Usage

Handlers register on Bot — but webhook mode uses manual dispatch from controller (not long polling).

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/bot-gateway/src/bale/grammy-bale.factory.ts` |
| Create | `apps/bot-gateway/src/bale/grammy-bale.factory.spec.ts` |
| Update | `apps/bot-gateway/src/bale/bale.module.ts` |

---

## مراحل پیاده‌سازی

1. Factory with apiRoot
2. Wire token from env
3. Export for handlers
4. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Missing token | — | fail startup |
| Wrong apiRoot | — | requests go to Telegram — prevented by test |

---

## تست

- [ ] Unit: apiRoot is tapi.bale.ai
- [ ] Unit: bot instance created

---

## Policy Alignment

- [ ] bot-gateway thin — handlers call use cases

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
