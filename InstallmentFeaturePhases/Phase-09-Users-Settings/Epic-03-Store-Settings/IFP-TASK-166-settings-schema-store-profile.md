# IFP-166: Settings Schema — Store Profile (seller, logo, contact)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 09 |
| Epic | Epic-03-Store-Settings |
| ID | IFP-166 |
| Priority | P0 |
| Depends on | Phase-0 TASK-048, ADR-005 |
| Blocks | IFP-168, IFP-170 |
| Estimated | 6h |

---

## هدف

کلیدهای settings برای §۱۴: نام فروشگاه، لوگو، اطلاعات فروشنده، شماره تماس، آدرس — با validation Zod.

---

## معیار پذیرش

- [ ] Keys: `store.displayName`, `store.legalName`, `store.logoFileId`, `store.phone`, `store.email`, `store.address`
- [ ] Zod schema in settings.schema.ts with defaults
- [ ] Logo references FileAsset (IFP-172) — nullable until Phase 10
- [ ] Phone normalize 09xxxxxxxxx
- [ ] Registry entry + migration seed defaults on tenant create

---

## مشخصات فنی

### Schema excerpt
```typescript
store: z.object({
  displayName: z.string().min(2).max(120),
  legalName: z.string().max(200).optional(),
  logoFileId: z.string().uuid().nullable(),
  phone: phoneSchema.optional(),
  email: z.string().email().optional(),
  address: z.object({ line1, city, province, postalCode }).partial(),
})
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `packages/domain/src/settings/settings.schema.ts` |
| Create | `packages/contracts/src/core/store-settings.schema.ts` |

---

## مراحل پیاده‌سازی

1. Define keys
2. Defaults in seed
3. Unit test validation

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Invalid phone | 400 | VALIDATION_ERROR |
| Logo file other tenant | 404 | FILE_NOT_FOUND |

---

## تست

- [ ] Unit: schema parse
- [ ] Default merge on get

---

## Policy Alignment

- [ ] ADR-005 Settings schema
- [ ] EXCELLENCE §8

---

## مراجع

- `docs/08-decisions/adr-log.md ADR-005`

---

## Self-Review Score

> مبنا: `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md` §10

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata (ID, Priority, Depends, Blocks, Estimate) | /10 | 10 | |
| Completeness (criteria, spec بدون TODO، files table) | /25 | 25 | |
| Policy (EXCELLENCE §8، soft delete، ADR cited) | /25 | 25 | |
| Executability (edge cases، tests، dev بدون سؤال) | /25 | 24 | |
| Alignment (sync docs، contracts، Epic README) | /15 | 15 | |
| **جمع** | **/100** | **99** | ≥95 — Ready |
