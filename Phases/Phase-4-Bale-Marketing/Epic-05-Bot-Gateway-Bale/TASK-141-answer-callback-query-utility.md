# TASK-141: answerCallbackQuery Utility

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-05-Bot-Gateway-Bale |
| ID | TASK-141 |
| Priority | P0 |
| Depends on | TASK-127, TASK-139 |
| Blocks | TASK-144, TASK-145 |
| Estimated | 3h |

---

## هدف

Utility اجباری `answerCallbackQuery` روی همه callbackها — toast یا alert.

---

## معیار پذیرش

- [ ] `answerCallbackQuery` wrapper با BaleHttpClient
- [ ] همه callback handlers باید await answer — lint/review gate
- [ ] Legacy: callback_query.id starts with `1` → use sendMessage fallback
- [ ] Unit tests

---

## مشخصات فنی

### Wrapper

```typescript
export async function answerBotCallback(
  client: BaleHttpClient,
  query: BaleCallbackQuery,
  options: { text?: string; show_alert?: boolean },
): Promise<void> {
  if (query.id.startsWith('1')) {
    await client.sendMessage({ chat_id: query.from.id, text: options.text ?? '✓' });
    return;
  }
  await client.answerCallbackQuery({ callback_query_id: query.id, ...options });
}
```

### Rule

Every callback handler — `try/finally` answer within 30s (Bale timeout).

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/bot-gateway/src/bale/answer-callback.util.ts` |
| Create | `apps/bot-gateway/src/bale/answer-callback.util.spec.ts` |

---

## مراحل پیاده‌سازی

1. Implement wrapper + legacy fallback
2. Export
3. Document mandatory usage
4. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Missing answer | — | CI/review blocked |
| Legacy id prefix 1 | — | sendMessage fallback |
| show_alert true | — | modal alert |

---

## تست

- [ ] Unit: normal answer
- [ ] Unit: legacy fallback

---

## Policy Alignment

- [ ] bale-api-reference callback rules

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
