# TASK-013: Package Skeleton — packages/contracts

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-03-Packages-Skeleton |
| ID | TASK-013 |
| Priority | P0 |
| Depends on | TASK-003 |
| Blocks | TASK-051–053, TASK-035, TASK-007 |
| Estimated | 2h |
| Status | ✅ Done |

---

## هدف

Package `@hivork/contracts` — single source of truth برای API request/response types با Zod. هر DTO در اینجا تعریف می‌شود؛ هیچ تکرار در `apps/api` یا `apps/web`. مبالغ مالی به عنوان string (bigint serialized) document می‌شوند.

---

## معیار پذیرش

- [x] `@hivork/contracts` exports Zod schemas + inferred TypeScript types
- [x] وابستگی فقط به `zod` (نه هیچ framework دیگری)
- [x] `phoneSchema` — regex `/^09\d{9}$/`
- [x] `normalizePhone(input: string): string` utility
- [x] `paginationSchema` برای cursor pagination
- [x] `errorResponseSchema` — `{ code, message, details? }`
- [x] `auth/` schemas: request-otp، verify-otp
- [x] `tenant/` schemas: tenant info
- [x] Build با `tsc`

---

## مشخصات فنی

### ساختار پوشه

```
packages/contracts/
├── src/
│   ├── index.ts
│   ├── common/
│   │   ├── phone.schema.ts        # phoneSchema + normalizePhone
│   │   ├── pagination.schema.ts   # cursor pagination
│   │   └── error.schema.ts        # error response format
│   ├── auth/
│   │   ├── request-otp.schema.ts
│   │   ├── verify-otp.schema.ts
│   │   └── index.ts
│   └── tenant/
│       └── index.ts
├── package.json
└── tsconfig.json
```

### Phone schema + normalizer

```typescript
export const phoneSchema = z.string().regex(/^09\d{9}$/, 'شماره موبایل باید با 09 شروع شود');

export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('989') && digits.length === 12) return '0' + digits.slice(2);
  if (digits.startsWith('9') && digits.length === 10) return '0' + digits;
  return digits;
}
```

### Pagination schema (cursor-based)

```typescript
export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationInput = z.infer<typeof paginationSchema>;

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  });
```

### Error response schema

```typescript
export const errorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.array(z.object({
    field: z.string().optional(),
    message: z.string(),
  })).optional(),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
```

### Money convention

```typescript
// مبالغ مالی: bigint در backend → string در JSON → bigint در frontend
// هرگز number/float استفاده نشود
export const moneySchema = z.string().regex(/^\d+$/, 'مبلغ باید عدد صحیح ریال باشد');
// UI: z.coerce.bigint() برای parse کردن string به bigint
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/contracts/src/common/phone.schema.ts` |
| Create | `packages/contracts/src/common/pagination.schema.ts` |
| Create | `packages/contracts/src/common/error.schema.ts` |
| Create | `packages/contracts/src/auth/**` |
| Create | `packages/contracts/src/tenant/**` |
| Create | `packages/contracts/src/index.ts` |
| Create | `packages/contracts/package.json` |
| Create | `packages/contracts/tsconfig.json` |

---

## مراحل پیاده‌سازی

1. `package.json` با فقط `zod` به عنوان dependency
2. `phone.schema.ts` با regex و normalizer
3. `pagination.schema.ts` برای cursor pagination
4. `error.schema.ts` — match با exception filter در `apps/api`
5. `auth/` schemas
6. Build و type exports را verify کن

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| `phone: "09123456789"` | ✅ Valid |
| `phone: "9123456789"` | ❌ Zod error — regex fail |
| `phone: "+989123456789"` | normalizePhone → `"09123456789"` |
| `limit: 0` | Zod `.min(1)` error |
| `limit: 200` | Zod `.max(100)` error |
| `amount: 1.5` | moneySchema fail — فقط integer string |
| `amount: "0"` | ✅ Valid — صفر ریال مجاز |
| Duplicate schema در apps/api | ممنوع — از `@hivork/contracts` import کن |

---

## تست

```typescript
// phone.schema.spec.ts
expect(phoneSchema.parse('09123456789')).toBe('09123456789');
expect(() => phoneSchema.parse('9123456789')).toThrow();
expect(normalizePhone('+989123456789')).toBe('09123456789');
```

---

## ممنوعیت‌ها

- Duplicate DTOs در `apps/api` یا `apps/web`
- `number` برای مبالغ (فقط `bigint` یا `string` representation)
- Framework imports (فقط `zod`)

---

## Policy Alignment

- [x] DEVELOPMENT_RULES.md — "Shared types: packages/contracts only"
- [x] DEVELOPMENT_RULES.md — "`number`/`float` برای پول — فقط `bigint` ریال"
- [x] `.cursor/rules/07-contracts-zod.mdc` — phone از shared
- [x] SOFT-DELETE-POLICY — N/A

---

## مراجع

- `.cursor/rules/07-contracts-zod.mdc`
- `docs/09-development/DEVELOPMENT_RULES.md`

---

## Self-Review Score

| محور | /امتیاز | یادداشت |
|------|---------|---------|
| Metadata (10) | 10/10 | همه فیلدها |
| Completeness (25) | 25/25 | AC، schemas، money convention |
| Policy (25) | 25/25 | bigint، no duplicate DTOs، phone schema |
| Executability (25) | 25/25 | Edge cases، specs، tests |
| Alignment (15) | 15/15 | Sync با contracts-zod rule |
| **جمع** | **100/100** | ✅ Ready |
