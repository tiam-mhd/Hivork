# TASK-008: App Skeleton — apps/bot-gateway (NestJS)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-02-Apps-Skeleton |
| ID | TASK-008 |
| Priority | P1 |
| Depends on | TASK-006 |
| Blocks | — (Phase 2 uses fully) |
| Estimated | 2h |
| Status | ✅ Done |

---

## هدف

NestJS worker app برای webhook تلگرام/بله — skeleton با health endpoint، webhook stub، و ساختار module. Bot handler هیچ business logic مستقیم ندارد — فقط facade به `@hivork/application` use cases.

---

## معیار پذیرش

- [x] App starts on port `4001` (configurable via `BOT_GATEWAY_PORT`)
- [x] `GET /health` → `{ status: 'ok' }`
- [x] `POST /webhooks/telegram` stub → 200 `{ ok: true }` + secret header check stub
- [x] `@hivork/application` use cases importable (no duplicate logic)
- [x] Pino logger + exception filter (pattern از `apps/api`)
- [x] ConfigModule با Zod env schema

---

## مشخصات فنی

### ساختار پوشه

```
apps/bot-gateway/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/
│   │   ├── app-config.module.ts
│   │   ├── app-config.service.ts
│   │   └── env.schema.ts
│   ├── health/
│   │   ├── health.controller.ts
│   │   └── health.module.ts
│   ├── webhooks/
│   │   ├── telegram.controller.ts   # POST /webhooks/telegram
│   │   └── webhooks.module.ts
│   └── common/
│       └── filters/http-exception.filter.ts
└── package.json                     # name: @hivork/bot-gateway
```

### `telegram.controller.ts` (stub)

```typescript
@Controller('webhooks')
export class TelegramController {
  @Post('telegram')
  handleTelegramUpdate(
    @Headers('X-Telegram-Bot-Api-Secret-Token') secret: string,
    @Body() body: unknown,
  ) {
    if (secret !== process.env['TELEGRAM_WEBHOOK_SECRET']) {
      throw new UnauthorizedException();
    }
    // Phase 2: route to use case
    return { ok: true };
  }
}
```

### Environment variables

```
BOT_GATEWAY_PORT=4001
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=dev
BALE_BOT_TOKEN=
BALE_WEBHOOK_SECRET=
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/bot-gateway/src/**` |
| Create | `apps/bot-gateway/package.json` |
| Create | `apps/bot-gateway/tsconfig.json` |
| Create | `apps/bot-gateway/nest-cli.json` |
| Create | `apps/bot-gateway/.env.example` |

---

## مراحل پیاده‌سازی

1. ساختار از `apps/api` کپی (minimal version)
2. Webhook controller stub با secret header check
3. Health module
4. Port را از `apps/api` جدا کن (4001)
5. Phase 2 activation را در README document کن

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Secret header اشتباه | 401 | `UnauthorizedException` |
| Telegram payload نامعتبر | 200 (stub) | Phase 2: validate و route |
| Port 4001 در حال استفاده | App crash | config port env را بررسی کن |
| Bot token منقضی شده | — (Phase 2) | در Phase 2 handle می‌شود |

---

## تست

```bash
pnpm --filter @hivork/bot-gateway dev
# باید: "Application listening on port 4001"

curl http://localhost:4001/health
# → {"status":"ok"}

curl -X POST http://localhost:4001/webhooks/telegram \
  -H "X-Telegram-Bot-Api-Secret-Token: dev" \
  -H "Content-Type: application/json" \
  -d '{}'
# → {"ok":true}

curl -X POST http://localhost:4001/webhooks/telegram
# → 401 Unauthorized (no secret header)
```

---

## ممنوعیت‌ها

- Prisma مستقیم در bot handlers (در Phase 0 stub — در Phase 2 از طریق use case)
- Business logic در controller
- Duplicate logic با `apps/api` (از `@hivork/application` use cases استفاده کن)

---

## Policy Alignment

- [x] ADR-002 — Bot handler فقط facade
- [x] DEVELOPMENT_RULES.md — "Bot handlers → same use cases as REST"
- [x] `.cursor/rules/03-backend-nestjs.mdc` — "Direct Prisma in apps/bot-gateway bypassing use cases" ممنوع
- [x] SOFT-DELETE-POLICY — N/A (Phase 0 stub)

---

## مراجع

- `docs/05-channels/channels-strategy.md`
- `.cursor/rules/03-backend-nestjs.mdc`

---

## Self-Review Score

| محور | /امتیاز | یادداشت |
|------|---------|---------|
| Metadata (10) | 10/10 | همه فیلدها |
| Completeness (25) | 25/25 | AC، structure، secret check pattern |
| Policy (25) | 25/25 | No business logic، use case only |
| Executability (25) | 24/25 | Edge cases، steps، tests — Phase 2 patterns TODO |
| Alignment (15) | 15/15 | Sync با channels-strategy |
| **جمع** | **99/100** | ✅ Ready |
