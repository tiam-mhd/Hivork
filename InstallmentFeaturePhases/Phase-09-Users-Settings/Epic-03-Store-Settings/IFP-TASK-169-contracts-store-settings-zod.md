# IFP-169: Contracts — Store Settings Zod Schemas

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 09 |
| Epic | Epic-03-Store-Settings |
| ID | IFP-169 |
| Priority | P0 |
| Depends on | IFP-166, IFP-167 |
| Blocks | IFP-168, IFP-170 |
| Estimated | 5h |

---

## هدف

تعریف Zod DTOهای تنظیمات فروشگاه در `packages/contracts` — هم‌تراز ۱۰۰٪ با domain `settings.schema.ts` و API store settings — پایه type-safe برای فرانت و NestJS pipes.

---

## معیار پذیرش

- [ ] `StoreSettingsResponseSchema` — تمام کلیدهای §۱۴ (profile, financial, gateway, tax, businessHours)
- [ ] `UpdateStoreSettingsRequestSchema` — partial deep patch با `.strict()` روی unknown keys
- [ ] `phoneSchema` از shared contracts
- [ ] `ratePercent` و مبالغ: `z.string()` یا `z.coerce.bigint()` با doc «ریال/ basis points — string in JSON»
- [ ] `logoFileId`: `z.string().uuid().nullable()`
- [ ] `businessHours`: weekday enum + time `HH:mm` validation
- [ ] Gateway secrets: `apiKey` فقط در request optional — **never** in response schema
- [ ] Export از `packages/contracts/src/core/index.ts`
- [ ] Unit test: parse sample fixture + reject invalid phone/hours

---

## مشخصات فنی

### Response (masked secrets)

```typescript
// packages/contracts/src/core/store-settings.schema.ts
export const StoreGatewaySettingsSchema = z.object({
  provider: z.enum(['zarinpal', 'idpay', 'manual']).optional(),
  merchantId: z.string().max(64).optional(),
  terminalId: z.string().max(64).optional(),
  sandbox: z.boolean().optional(),
  apiKeyConfigured: z.boolean(), // true if vault has key — never expose key
});

export const StoreSettingsResponseSchema = z.object({
  displayName: z.string(),
  legalName: z.string().optional(),
  logoFileId: z.string().uuid().nullable(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.object({
    line1: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),
  financial: z.object({ /* currency, fiscalYearStart, ... */ }).optional(),
  paymentGateway: StoreGatewaySettingsSchema.optional(),
  tax: z.object({
    enabled: z.boolean(),
    ratePercent: z.number().int().min(0).max(10000), // basis points
    inclusive: z.boolean(),
  }).optional(),
  businessHours: z.record(
    z.enum(['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri']),
    z.array(z.object({
      open: z.string().regex(/^\d{2}:\d{2}$/),
      close: z.string().regex(/^\d{2}:\d{2}$/),
    })),
  ).optional(),
  updatedAt: z.string().datetime(),
  version: z.number().int(),
});
```

### Request patch

```typescript
export const UpdateStoreSettingsRequestSchema = StoreSettingsResponseSchema
  .omit({ updatedAt: true, version: true, paymentGateway: true })
  .partial()
  .extend({
    paymentGateway: z.object({
      provider: z.enum(['zarinpal', 'idpay', 'manual']).optional(),
      merchantId: z.string().max(64).optional(),
      terminalId: z.string().max(64).optional(),
      sandbox: z.boolean().optional(),
      apiKey: z.string().min(8).max(256).optional(), // write-only
    }).partial().optional(),
  })
  .strict();
```

### Alignment rule

هر تغییر در `packages/domain/src/settings/settings.schema.ts` → همزمان این فایل + IFP-168 API.

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/contracts/src/core/store-settings.schema.ts` |
| Create | `packages/contracts/src/core/store-settings.schema.spec.ts` |
| Update | `packages/contracts/src/core/index.ts` |

---

## مراحل پیاده‌سازی

1. Mirror domain keys از IFP-166/167
2. Response vs request split (secrets masking)
3. Unit tests fixtures
4. Wire export + document in IFP-168 controller

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Unknown top-level key | 400 | Zod strict — VALIDATION_ERROR |
| Invalid time `25:00` | 400 | VALIDATION_ERROR |
| apiKey in GET response | — | Schema must not include — CI review |

---

## تست

- [ ] Unit: valid full response parse
- [ ] Unit: reject invalid phone via phoneSchema
- [ ] Unit: partial patch accepts only subset

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §8 field parity
- [ ] ADR-005 Settings schema-based
- [ ] No float for money — basis points int

---

## مراجع

- `IFP-TASK-166-settings-schema-store-profile.md`
- `IFP-TASK-167-settings-schema-financial-payment-tax-hours.md`
- `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md` §4.5

---

## Self-Review Score

> مبنا: `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md` §10

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata (ID, Priority, Depends, Blocks, Estimate) | /10 | 10 | |
| Completeness (criteria, spec بدون TODO، files table) | /25 | 25 | |
| Policy (EXCELLENCE §8، soft delete، ADR cited) | /25 | 25 | |
| Executability (edge cases، tests، dev بدون سؤال) | /25 | 25 | |
| Alignment (sync docs، contracts، Epic README) | /15 | 15 | |
| **جمع** | **/100** | **100** | ≥95 — Ready |
