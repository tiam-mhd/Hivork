# TASK-006: App Skeleton — apps/api (NestJS)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-02-Apps-Skeleton |
| ID | TASK-006 |
| Priority | P0 |
| Depends on | TASK-001, TASK-003, TASK-005 |
| Blocks | TASK-017, TASK-035, TASK-041, TASK-047 |
| Estimated | 4h |
| Status | ✅ Done |

---

## هدف

NestJS HTTP API با ساختار Clean Architecture، global prefix `/api`، route-level `v1/`، health check endpoint، Pino logger، exception filter، و ConfigModule با Zod validation — پایه تمام endpoints Phase 0.

---

## معیار پذیرش

- [x] `pnpm --filter @hivork/api dev` → listen port `4000`
- [x] `GET /health` → `{ status: 'ok', db: 'ok', redis: 'ok' }` (exclude از global prefix)
- [x] `GET /api/v1/health` → همان پاسخ
- [x] Global prefix: `api` (route-level `v1/` prefix برای versioning)
- [x] ValidationPipe global (whitelist، transform، forbidNonWhitelisted)
- [x] Exception filter → `{ code, message, details? }`
- [x] ConfigModule validates env با Zod schema
- [x] Pino logger via `nestjs-pino`
- [x] Cookie parser for httpOnly cookies (auth)
- [x] CORS configured با `CORS_ORIGIN` env
- [x] Workspace packages `@hivork/domain`, `@hivork/application`, `@hivork/infrastructure`, `@hivork/contracts` importable
- [x] `modules/core` (`CoreModule`) import شده در `app.module.ts`

---

## مشخصات فنی

### ساختار پوشه

```
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/
│   │   ├── app-config.module.ts
│   │   ├── app-config.service.ts
│   │   └── env.schema.ts          # Zod validation
│   ├── health/
│   │   ├── health.controller.ts   # GET /health + GET /api/v1/health
│   │   ├── health.module.ts
│   │   └── health.service.ts      # DB ping + Redis ping
│   ├── auth/
│   │   ├── auth.controller.ts     # @Controller('v1/auth')
│   │   └── auth.module.ts
│   └── common/
│       ├── filters/http-exception.filter.ts
│       ├── guards/
│       ├── interceptors/logging.interceptor.ts
│       ├── decorators/
│       └── context/
├── package.json                   # name: @hivork/api
├── tsconfig.json                  # extends @hivork/config/tsconfig.nestjs.json
└── nest-cli.json
```

### `main.ts` essentials

```typescript
app.setGlobalPrefix('api', {
  exclude: [{ path: 'health', method: RequestMethod.GET }],
});
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
app.useGlobalFilters(new HttpExceptionFilter());
app.enableCors({ origin: appConfig.corsOrigin, credentials: true });
app.use(cookieParser());
```

### `package.json` dependencies

```json
{
  "name": "@hivork/api",
  "@nestjs/common": "^10",
  "@nestjs/core": "^10",
  "@nestjs/config": "^3",
  "nestjs-pino": "^4",
  "pino-http": "^10",
  "cookie-parser": "^1.4",
  "zod": "^3",
  "@hivork/domain": "workspace:*",
  "@hivork/application": "workspace:*",
  "@hivork/infrastructure": "workspace:*",
  "@hivork/contracts": "workspace:*",
  "@hivork/module-core": "workspace:*"
}
```

### Error response format

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": [{ "field": "phone", "message": "invalid format" }]
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/api/src/main.ts` |
| Create | `apps/api/src/app.module.ts` |
| Create | `apps/api/src/config/*` |
| Create | `apps/api/src/health/*` |
| Create | `apps/api/src/common/**` |
| Create | `apps/api/package.json` |
| Create | `apps/api/tsconfig.json` |
| Create | `apps/api/nest-cli.json` |

---

## مراحل پیاده‌سازی

1. `nest new api` در پوشه `apps/` یا scaffold دستی
2. `package.json` با workspace deps
3. `tsconfig.json` که extends `@hivork/config/tsconfig.nestjs.json`
4. ConfigModule با Zod env schema
5. HealthModule با DB ping stub (تا TASK-017)
6. Exception filter با `{ code, message, details? }` format
7. ValidationPipe و cookie-parser در `main.ts`
8. `pnpm --filter @hivork/api dev` → listen 4000

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| ValidationPipe fail | 400 VALIDATION_ERROR | details array با field errors |
| NestJS unhandled exception | 500 INTERNAL_ERROR | exception filter catch |
| DB unreachable (health) | 503 SERVICE_UNAVAILABLE | `{ status: 'degraded', db: 'error' }` |
| Redis unreachable (health) | 503 | `{ status: 'degraded', redis: 'error' }` |
| Unknown route | 404 NOT_FOUND | exception filter format |
| CORS origin mismatch | 403 (browser) | origin not in CORS_ORIGIN |
| Missing required env var | App startup crash | ConfigModule validation error |

---

## تست

```bash
curl http://localhost:4000/health
# → {"status":"ok","db":"ok","redis":"ok"}

curl http://localhost:4000/api/v1/health
# → همان

curl -X POST http://localhost:4000/api/v1/auth/request-otp -H "Content-Type: application/json" -d '{"phone":"invalid"}'
# → {"code":"VALIDATION_ERROR","message":"...","details":[...]}
```

---

## ممنوعیت‌ها

- Business logic در controller (فقط use case delegation)
- Prisma مستقیم در controller (فقط از طریق infrastructure)
- `console.log` — فقط Pino logger

---

## Policy Alignment

- [x] ADR-002 — معماری: Controller = thin, Use Case = logic
- [x] DEVELOPMENT_RULES.md §3 — Clean Architecture layers
- [x] `.cursor/rules/03-backend-nestjs.mdc` — Controller/Handler = Thin
- [x] SOFT-DELETE-POLICY — N/A (skeleton)
- [x] EXCELLENCE-STANDARDS §9 — Global pipe، filter، CORS، health

---

## مراجع

- `docs/04-technology/monorepo-structure.md`
- `docs/02-architecture/overview.md`
- `.cursor/rules/03-backend-nestjs.mdc`

---

## Self-Review Score

| محور | /امتیاز | یادداشت |
|------|---------|---------|
| Metadata (10) | 10/10 | همه فیلدها |
| Completeness (25) | 25/25 | AC، structure، deps، error format |
| Policy (25) | 25/25 | ADR-002، backend rules explicit |
| Executability (25) | 25/25 | Edge cases، steps، curl tests |
| Alignment (15) | 15/15 | Sync با overview.md + rules |
| **جمع** | **100/100** | ✅ Ready |
