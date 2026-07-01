# TASK-127: Bale HTTP Client

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-02-Bale-Infrastructure |
| ID | TASK-127 |
| Priority | P0 |
| Depends on | TASK-126 |
| Blocks | TASK-128, TASK-129, TASK-138, TASK-139, TASK-141, TASK-153 |
| Estimated | 5h |

---

## هدف

کلاینت HTTP typed برای API بله — base URL `https://tapi.bale.ai/bot{token}/`، parse پاسخ `ok/result`، handle 429 با `retry_after`.

---

## معیار پذیرش

- [ ] کلاس `BaleHttpClient` در infrastructure
- [ ] متدهای `sendMessage`, `answerCallbackQuery`, `setWebhook`, `getWebhookInfo`
- [ ] 429 → `{ retryable: true, retryAfterSec }` از `parameters.retry_after`
- [ ] UTF-8 + JSON body support
- [ ] Unit test با mocked fetch
- [ ] `pnpm turbo typecheck` pass

---

## مشخصات فنی

### Base URL

```
https://tapi.bale.ai/bot{BALE_BOT_TOKEN}/<method>
```

### Response envelope

```typescript
type BaleApiResponse<T> =
  | { ok: true; result: T }
  | { ok: false; description: string; error_code: number; parameters?: { retry_after?: number } };
```

### sendMessage (reference)

```typescript
async sendMessage(params: {
  chat_id: string;  // User.id as string
  text: string;
  parse_mode?: 'Markdown' | 'HTML';
  reply_markup?: InlineKeyboardMarkup;
}): Promise<SendMessageResult>
```

### Rate limit handling

| HTTP / error_code | رفتار |
|-------------------|--------|
| 429 | `retryable=true`, `retryAfterSec=parameters.retry_after ?? 30` |
| 400 Bad Request | `retryable=false`, log structured |
| Network timeout | `retryable=true`, exponential backoff caller-side |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/infrastructure/notifications/bale-http.client.ts` |
| Create | `packages/infrastructure/notifications/bale-http.client.spec.ts` |
| Update | `packages/infrastructure/notifications/index.ts` |
| Update | `.env.example` |

---

## مراحل پیاده‌سازی

1. Implement fetch wrapper با token از env `BALE_BOT_TOKEN`
2. Parse envelope + map 429 retry_after
3. Implement core methods per bale-api-reference
4. Unit tests success/429/400
5. Export from infrastructure index

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Invalid token | 401 | retryable=false; alert ops |
| 429 rate limit | 429 | retryAfterSec from parameters |
| chat_id as number | — | coerce to string before send |

---

## تست

- [ ] Unit: parse ok response
- [ ] Unit: 429 retry_after mapping
- [ ] Unit: sendMessage payload

---

## Policy Alignment

- [ ] bale-api-reference.md
- [ ] Infrastructure layer — no business logic
- [ ] Structured logging — no PII

---

## مراجع

- `docs/05-channels/bale-api-reference.md`
- `docs/08-decisions/ADR-018-channel-abstraction.md`

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
