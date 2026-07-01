# IFP-TASK-089: Use Case + API — ثبت آنلاین

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 05 — Installments Advanced |
| Epic | Epic-02-Payment-Recording |
| ID | IFP-TASK-089 |
| Priority | P0 |
| Depends on | IFP-TASK-086 |
| Blocks | IFP-TASK-092, IFP-TASK-093, IFP-TASK-094, IFP-TASK-095 |
| Estimated | 8h |

---

## هدف

**شروع پرداخت آنلاین** (درگاه) و **callback/webhook** ثبت `PaymentAttempt` — initiate از staff panel یا customer PWA؛ verify signature gateway؛ status همیشه `pending` تا staff confirm (مگر tenant setting `autoConfirmOnline`).

---

## معیار پذیرش

- [ ] `InitOnlinePaymentUseCase` + `HandleOnlinePaymentCallbackUseCase`
- [ ] API `POST /api/v1/installments/:installmentId/payments/online/init`
- [ ] API `POST /api/v1/webhooks/payment-gateway` (public + signature)
- [ ] Permission init: `installments.payment.report` (staff) یا customer actor own installment
- [ ] Return `redirectUrl` + `paymentAttemptId` + `gatewayToken`
- [ ] Callback: verify HMAC، idempotent on `gatewayTransactionId`
- [ ] metadata: `{ method: 'online', gateway, transactionId, cardMask }`
- [ ] Audit: `payment.report` on successful callback

---

## مشخصات فنی

### Init API (Staff)

```
POST /api/v1/installments/:installmentId/payments/online/init
Permission: installments.payment.report
```

### Init Request

```json
{
  "amountRial": "5000000",
  "returnUrl": "https://panel.example.com/installments/uuid?payment=done"
}
```

### Init Response `201`

```json
{
  "paymentAttemptId": "uuid",
  "redirectUrl": "https://gateway.ir/pay/...",
  "expiresAt": "2025-06-30T12:15:00.000Z"
}
```

### Webhook (gateway → Hivork)

```
POST /api/v1/webhooks/payment-gateway/:provider
Header: X-Gateway-Signature
Body: { transactionId, status: 'success'|'failed', amountRial, referenceId }
```

### Callback flow

```
Gateway success → verify signature → find attempt by referenceId
→ update metadata → status stays PENDING (default)
→ if autoConfirmOnline setting → chain to ConfirmPaymentUseCase (IFP-092)
→ audit payment.report
```

### Gateway abstraction

```typescript
interface PaymentGatewayPort {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyWebhook(headers: Record<string,string>, body: unknown): VerifiedWebhookPayload;
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/installments/init-online-payment.use-case.ts` |
| Create | `packages/application/installments/handle-online-payment-callback.use-case.ts` |
| Create | `packages/infrastructure/payment/mock-payment.gateway.ts` |
| Create | `apps/api/src/modules/installments/online-payment.controller.ts` |
| Create | `apps/api/src/modules/webhooks/payment-gateway.webhook.controller.ts` |
| Create | `packages/application/installments/online-payment.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Gateway port + mock implementation for tests
2. Init use case — create pending attempt with `referenceId`
3. Webhook controller with signature verify
4. Callback use case — idempotent
5. Optional auto-confirm branch
6. Integration tests with mock gateway

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Invalid webhook signature | 401 | reject |
| Amount mismatch callback | 409 | `AMOUNT_MISMATCH` — alert ops |
| Duplicate transactionId | 200 | idempotent OK |
| Gateway timeout on init | 502 | `GATEWAY_UNAVAILABLE` |
| Expired init session | 410 | `PAYMENT_SESSION_EXPIRED` |

---

## تست

- [ ] Integration: init → redirect URL
- [ ] Integration: webhook success → attempt updated pending
- [ ] Integration: duplicate webhook idempotent
- [ ] Unit: signature verification fail

---

## UX

N/A — دکمه «پرداخت آنلاین» redirect در IFP-099 / customer PWA.

---

## Flow

```
Staff/Customer → پرداخت آنلاین → redirect درگاه → پرداخت → callback
→ بازگشت به returnUrl → نمایش «در انتظار تأیید»
```

---

## Policy Alignment

- [ ] ADR-008 — default pending after gateway success
- [ ] ADR-007 bigint
- [ ] No secrets in git — gateway keys in env
- [ ] Idempotency on webhook

---

## مراجع

- `docs/01-product/installment-module-features.md` §۵ — ثبت آنلاین
- `docs/06-operations/security-and-audit.md`

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | init + webhook |
| Policy | 25 | 25 | |
| Executability | 25 | 25 | gateway port |
| Alignment | 15 | 15 | |
| **جمع** | **100** | **100** | ≥95 ✅ |
