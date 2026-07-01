# IFP-TASK-046: Customer Timeline

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | IFP-03 Customer Enterprise |
| Epic | Epic-05-Customer-History |
| ID | IFP-046 |
| Priority | P0 |
| Depends on | IFP-040, IFP-047, Phase 4 TASK-130 (NotificationLog) |
| Blocks | IFP-053 |
| Estimated | 8h |

---

## هدف

**Timeline یکپارچه** مشتری — aggregate رویدادها: پرداخت‌ها، قراردادها (Sales)، SMS/اعلان (NotificationLog)، یادداشت‌ها (CustomerNote)، تماس (stub/metadata)، audit مرتبط — §۳ تاریخچه و سوابق پیامک/اعلان/تماس.

---

## معیار پذیرش

- [ ] GET `/api/v1/customers/:id/timeline?cursor=&limit=&types[]=`
- [ ] Event types: payment, contract, sms, notification, note, call, audit
- [ ] Unified shape: `{ id, type, occurredAt, title, summary, actor?, entityRef?, metadata? }`
- [ ] Cursor pagination chronological desc
- [ ] Filter by type[] and date range
- [ ] Sources: Payment, Sale, NotificationLog (tenant+customer), CustomerNote, CallLog stub optional
- [ ] Permission: `installments.customer.read`
- [ ] Data scope enforced
- [ ] Performance: max 50 events per page; indexed queries per source

---

## مشخصات فنی

### Aggregation strategy

Phase 1: SQL UNION ALL subqueries with normalized columns  
Phase 2 optional: materialized CustomerActivity table  

### Notification mapping

Join NotificationLog via installment → sale → customer  
Or recipientRef = customer phone hash  

### Call log stub

If no telephony module: read from `metadata.callLog[]` on TenantCustomer or empty — document extension point

### Timeline item examples

| type | title fa |
|------|----------|
| payment | پرداخت تأیید شد |
| contract | قرارداد جدید ثبت شد |
| sms | پیامک یادآور ارسال شد |
| notification | اعلان بله |
| note | یادداشت داخلی |
| call | تماس تلفنی (manual log) |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/customers/get-customer-timeline.use-case.ts` |
| Create | `packages/infrastructure/persistence/queries/customer-timeline.query.ts` |
| Update | `apps/api/src/customers/customers.controller.ts` |
| Create | contracts timeline response schema |

---

## مراحل پیاده‌سازی

1. Define TimelineEvent DTO + Zod
2. Query each source with customerId filter
3. Merge sort by occurredAt
4. Cursor encode last timestamp+id
5. Integration test with seeded payment+sale+notification
6. Document call stub

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Customer not in scope | 404 | CUSTOMER_NOT_FOUND |
| Invalid type filter | 422 | VALIDATION_ERROR |
| Empty timeline | 200 | items: [] |
| Duplicate event ids | — | prefix type in composite id |

---

## تست

- [ ] Integration: timeline includes payment after confirm
- [ ] Integration: notification from TASK-130 appears
- [ ] Integration: note from IFP-047 appears
- [ ] RBAC cross-tenant timeline → 404

---

## UX (اگر UI دارد)

- [ ] Vertical timeline component — IFP-053 tab
- [ ] Filter chips by type
- [ ] Load more cursor
- [ ] Skeleton loading

---

## Flow

```
Entry: detail → timeline tab
Fetch first page
Scroll load more
Filter type → reset cursor
Click event → navigate to payment/contract detail if entityRef
Empty → «هنوز فعالیتی ثبت نشده»
```

---

## Policy Alignment

- [ ] Read-only aggregate
- [ ] Staff-only — not customer PWA
- [ ] NotificationLog append-only read

---

## مراجع

- `Phases/Phase-4-Bale-Marketing/Epic-03-Notification-Database/TASK-130-prisma-notification-log.md`
- `docs/01-product/installment-module-features.md` §۳

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | 10 | 10 |
| Completeness | 25 | 25 |
| Policy | 25 | 25 |
| Executability | 25 | 24 |
| Alignment | 15 | 15 |
| **جمع** | **100** | **99** |
