# TASK-053: Contracts — Error Response Schema

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-09-Contracts |
| ID | TASK-053 |
| Priority | P0 |
| Depends on | TASK-013 (contracts pkg) |
| Blocks | TASK-006, TASK-007, TASK-056 |
| Estimated | 3h |

---

## هدف

Schema و catalog کدهای خطا برای تمام API responses. `ApiErrorSchema` single source of truth برای هر دو سمت (API validation و Web error parsing). کدها باید با `docs/09-development/ERROR-CODES.md` همگام باشند.

---

## معیار پذیرش

- [ ] `ApiErrorSchema` با `code`, `message`, `details?`, `requestId?`
- [ ] `ErrorCodes` const object — همه کدها از ERROR-CODES.md
- [ ] `ErrorCode` type از `typeof ErrorCodes[keyof typeof ErrorCodes]`
- [ ] کدهای soft delete: `HARD_DELETE_FORBIDDEN`, `ALREADY_DELETED`, `NOT_DELETED`, `DELETE_FORBIDDEN`, `RESTORE_FORBIDDEN`
- [ ] کدهای auth: `UNAUTHORIZED`, `FORBIDDEN`, `OTP_EXPIRED`, `OTP_INVALID`, `OTP_RATE_LIMITED`, `VERIFIED_TOKEN_EXPIRED`, `VERIFIED_TOKEN_INVALID`
- [ ] `parseApiError(body: unknown): ApiError | null` utility function
- [ ] `HttpExceptionFilter` در apps/api — DomainError → structured response، unknown → 500 با `INTERNAL_ERROR`
- [ ] Stack trace هرگز به client لیک نمی‌شود

---

## مشخصات فنی

### ApiErrorSchema

```typescript
// packages/contracts/src/common/error.schema.ts
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  requestId: z.string().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export function parseApiError(body: unknown): ApiError | null {
  const parsed = ApiErrorSchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}
```

### ErrorCodes

```typescript
export const ErrorCodes = {
  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_INVALID: 'OTP_INVALID',
  OTP_RATE_LIMITED: 'OTP_RATE_LIMITED',
  VERIFIED_TOKEN_EXPIRED: 'VERIFIED_TOKEN_EXPIRED',
  VERIFIED_TOKEN_INVALID: 'VERIFIED_TOKEN_INVALID',
  STAFF_SUSPENDED: 'STAFF_SUSPENDED',
  TENANT_SUSPENDED: 'TENANT_SUSPENDED',

  // Resource
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // Soft delete (ADR-013)
  HARD_DELETE_FORBIDDEN: 'HARD_DELETE_FORBIDDEN',
  ALREADY_DELETED: 'ALREADY_DELETED',
  NOT_DELETED: 'NOT_DELETED',
  DELETE_FORBIDDEN: 'DELETE_FORBIDDEN',
  RESTORE_FORBIDDEN: 'RESTORE_FORBIDDEN',

  // Domain / plan
  DOMAIN_ERROR: 'DOMAIN_ERROR',
  MODULE_NOT_ENABLED: 'MODULE_NOT_ENABLED',
  PLAN_LIMIT_EXCEEDED: 'PLAN_LIMIT_EXCEEDED',
  CANNOT_DEACTIVATE_DEFAULT_BRANCH: 'CANNOT_DEACTIVATE_DEFAULT_BRANCH',

  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
```

### HttpExceptionFilter (apps/api)

```typescript
// apps/api/src/common/filters/http-exception.filter.ts
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof ApplicationError) {
      response.status(exception.httpStatus).json({
        code: exception.code,
        message: exception.message,
        details: exception.details,
      });
    } else if (exception instanceof HttpException) {
      // NestJS built-in
    } else {
      // Unknown → 500 INTERNAL_ERROR, log stack, no leak
      response.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
    }
  }
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create/Update | `packages/contracts/src/common/error.schema.ts` |
| Create/Update | `packages/contracts/src/common/index.ts` |
| Update | `apps/api/src/common/filters/http-exception.filter.ts` |
| Create/Update | `packages/contracts/src/common/error.schema.spec.ts` |

---

## مراحل پیاده‌سازی

1. ایجاد `ApiErrorSchema` با `code`, `message`, `details?`, `requestId?`
2. ایجاد `ErrorCodes` با همه کدهای ERROR-CODES.md
3. `parseApiError` utility
4. `HttpExceptionFilter` در apps/api با mapping
5. Unit tests

---

## Edge Cases

| سناریو | HTTP | Code |
|--------|------|------|
| DomainError throw | dynamic httpStatus | error.code |
| ValidationPipe fail | 400 | `VALIDATION_ERROR` |
| Unhandled throw | 500 | `INTERNAL_ERROR` |
| `prisma.delete()` attempt | 403 | `HARD_DELETE_FORBIDDEN` |

---

## تست

- [ ] Unit: `parseApiError` با valid body → ApiError
- [ ] Unit: `parseApiError` با invalid body → null
- [ ] Unit: `ErrorCodes` همه values unique strings
- [ ] Integration: DomainError → HTTP response با صحیح code + status

---

## Policy Alignment

- [ ] SOFT-DELETE-POLICY: کدهای `ALREADY_DELETED`, `NOT_DELETED`, `HARD_DELETE_FORBIDDEN`, `DELETE_FORBIDDEN`, `RESTORE_FORBIDDEN`
- [ ] TASK-056 edge cases همه دارای کد مناسب
- [ ] docs/09-development/ERROR-CODES.md همگام‌سازی

---

## مراجع

- `docs/09-development/ERROR-CODES.md`
- `docs/09-development/SOFT-DELETE-POLICY.md` §8 (UI behavior)
- `docs/08-decisions/adr-log.md` — ADR-010

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | Priority, Depends, Blocks, Estimated |
| Completeness | 25/25 | Schema، ErrorCodes، HttpFilter، Files، Steps |
| Policy | 25/25 | Soft delete codes، no stack leak، ERROR-CODES.md sync |
| Executability | 25/25 | Code patterns، edge cases، tests |
| Alignment | 14/15 | sync با http-exception.filter.ts |
| **جمع** | **99/100** | ≥95 ✅ |
