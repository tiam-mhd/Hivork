# IFP-TASK-095: API — چاپ و ارسال رسید

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 05 — Installments Advanced |
| Epic | Epic-03-Payment-Confirmation |
| ID | IFP-TASK-095 |
| Priority | P0 |
| Depends on | IFP-TASK-092 |
| Blocks | IFP-TASK-099, IFP-TASK-100 |
| Estimated | 6h |

---

## هدف

**رسید پرداخت** — تولید PDF برای چاپ و ارسال از طریق SMS/Bale پس از تأیید پرداخت — با شماره رسید یکتا، branding tenant و audit `receipt.send`.

---

## معیار پذیرش

- [ ] `GeneratePaymentReceiptUseCase` — PDF buffer/stream
- [ ] `SendPaymentReceiptUseCase` — SMS + Bale channels
- [ ] API `GET /api/v1/payment-attempts/:attemptId/receipt/pdf`
- [ ] API `POST /api/v1/payment-attempts/:attemptId/receipt/send`
- [ ] Permission GET: `installments.payment.read`; POST: `installments.payment.receipt.send`
- [ ] Only `confirmed` attempts (not voided)
- [ ] Receipt number: `{tenantCode}-{YYYYMM}-{seq}` unique
- [ ] Body send: `channels: ['sms'|'bale']`, optional `phone` override
- [ ] Audit: `receipt.send`
- [ ] Idempotent send per `(attemptId, channel)` within 1h

---

## مشخصات فنی

### PDF API

```
GET /api/v1/payment-attempts/:attemptId/receipt/pdf
Permission: installments.payment.read
Response: application/pdf, Content-Disposition: attachment
```

### Send API

```
POST /api/v1/payment-attempts/:attemptId/receipt/send
Permission: installments.payment.receipt.send
```

### Send Request

```json
{
  "channels": ["sms", "bale"],
  "recipientPhone": "09121234567"
}
```

### Send Response `202`

```json
{
  "receiptNumber": "HV-140504-00042",
  "dispatched": [
    { "channel": "sms", "status": "queued", "notificationLogId": "uuid" }
  ]
}
```

### PDF content (RTL)

- Tenant logo + name
- Receipt number + date (Jalali)
- Customer name + phone (masked)
- Contract/sale reference
- Installment sequence + amount
- Payment method details
- Confirmed by staff name
- QR code linking to verify URL (optional)

### Receipt record (optional table)

```prisma
model PaymentReceipt {
  id               String   @id @default(uuid()) @db.Uuid
  tenantId         String   @map("tenant_id") @db.Uuid
  paymentAttemptId String   @unique @map("payment_attempt_id") @db.Uuid
  receiptNumber    String   @map("receipt_number")
  pdfFileId        String?  @map("pdf_file_id") @db.Uuid
  sentAt           DateTime? @map("sent_at") @db.Timestamptz
  // base fields...
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/installments/generate-payment-receipt.use-case.ts` |
| Create | `packages/application/installments/send-payment-receipt.use-case.ts` |
| Create | `packages/infrastructure/pdf/payment-receipt.template.tsx` |
| Create | `apps/api/src/modules/installments/payment-receipt.controller.ts` |
| Update | `prisma/schema.prisma` — PaymentReceipt (optional)
| Create | `packages/application/installments/payment-receipt.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Receipt number generator (per tenant sequence)
2. PDF template RTL (reuse IFP export print patterns)
3. GET endpoint streaming PDF
4. Send use case → NotificationLog queue
5. Audit + idempotency
6. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Attempt not confirmed | 409 | `PAYMENT_NOT_CONFIRMED` |
| Voided payment | 409 | `PAYMENT_VOIDED` |
| Customer no phone | 400 | `RECIPIENT_UNAVAILABLE` |
| Channel disabled in settings | 400 | `CHANNEL_DISABLED` |
| Duplicate send < 1h | 200 | idempotent skip |

---

## تست

- [ ] Integration: PDF generates for confirmed payment
- [ ] Integration: send queues notification
- [ ] Integration: pending payment → 409
- [ ] RBAC deny send

---

## UX

- [ ] دکمه «چاپ رسید» و «ارسال رسید» در جزئیات پرداخت تأییدشده
- [ ] Modal انتخاب کانال (SMS/Bale)
- [ ] Loading + success toast
- [ ] Error: channel disabled message فارسی

---

## Flow

```
پرداخت confirmed → چاپ رسید → دانلود PDF
پرداخت confirmed → ارسال → انتخاب کانال → queue → toast «ارسال شد»
```

---

## Policy Alignment

- [ ] EXCELLENCE §7 — loading/error states in UI
- [ ] No PII in logs — mask phone
- [ ] Audit receipt.send
- [ ] SOFT-DELETE on PaymentReceipt if table added

---

## مراجع

- `docs/01-product/installment-module-features.md` §۵ — چاپ رسید، ارسال رسید
- IFP-TASK-025/026 export patterns

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | PDF + send |
| Policy | 25 | 25 | |
| Executability | 25 | 25 | |
| Alignment | 15 | 15 | |
| **جمع** | **100** | **100** | ≥95 ✅ |
