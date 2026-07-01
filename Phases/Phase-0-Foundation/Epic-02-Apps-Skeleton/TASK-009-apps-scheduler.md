# TASK-009: App Skeleton — apps/scheduler (NestJS + BullMQ)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-02-Apps-Skeleton |
| ID | TASK-009 |
| Priority | P1 |
| Depends on | TASK-006, TASK-002 |
| Blocks | TASK-050 |
| Estimated | 3h |
| Status | ✅ Done |

---

## هدف

NestJS worker app برای cron jobs و BullMQ processor workers — skeleton با Redis connection، queue registration، و sample processor. بعداً در Phase 1 outbox processor و reminder jobs اضافه می‌شوند.

---

## معیار پذیرش

- [x] Connects to Redis (`REDIS_URL`) با ioredis
- [x] BullMQ queue `hivork-jobs` registered
- [x] Sample job `health-check` processor اجرا و log می‌کند
- [x] `GET /health` شامل queue status
- [x] No HTTP business API — worker-only + optional admin health port
- [x] Port از `SCHEDULER_PORT` env (4002)

---

## مشخصات فنی

### ساختار پوشه

```
apps/scheduler/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/
│   │   ├── app-config.module.ts
│   │   ├── app-config.service.ts
│   │   └── env.schema.ts
│   ├── health/
│   │   ├── health.controller.ts
│   │   ├── health.module.ts
│   │   └── health.service.ts
│   └── jobs/
│       ├── queue.module.ts           # BullMQ QueueModule
│       ├── health-check.processor.ts # Sample processor
│       ├── outbox.processor.ts       # Outbox event dispatcher (Phase 1)
│       └── startup-jobs.service.ts   # Enqueue on bootstrap
└── package.json                      # name: @hivork/scheduler
```

### `queue.module.ts`

```typescript
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [AppConfigModule],
      useFactory: (config: AppConfigService) => ({
        connection: { url: config.redisUrl },
      }),
      inject: [AppConfigService],
    }),
    BullModule.registerQueue({ name: 'hivork-jobs' }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
```

### `health-check.processor.ts`

```typescript
@Processor('hivork-jobs')
export class HealthCheckProcessor extends WorkerHost {
  private readonly logger = new Logger(HealthCheckProcessor.name);

  async process(job: Job): Promise<{ ok: boolean; at: string }> {
    this.logger.log(`Processing job ${job.id} type=${job.name}`);
    return { ok: true, at: new Date().toISOString() };
  }
}
```

### Dependencies

```json
{
  "@nestjs/bullmq": "^10",
  "bullmq": "^5",
  "ioredis": "^5"
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/scheduler/src/**` |
| Create | `apps/scheduler/package.json` |
| Create | `apps/scheduler/tsconfig.json` |
| Create | `apps/scheduler/nest-cli.json` |
| Create | `apps/scheduler/.env.example` |

---

## مراحل پیاده‌سازی

1. NestJS app scaffold (minimal، بدون HTTP router جدا)
2. `queue.module.ts` با BullMQ و Redis connection
3. `HealthCheckProcessor` به عنوان sample
4. Health endpoint که queue stats را نشان دهد
5. Startup service که یک health-check job enqueue کند
6. `pnpm --filter @hivork/scheduler dev` را تأیید کن

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| Redis unreachable | BullMQ connection error — app crash در startup |
| Job processing fail | BullMQ auto-retry با backoff (config کن) |
| Queue full | Jobs queue — workers پردازش می‌کنند |
| Duplicate job ID | BullMQ deduplication اگر job ID مشخص شود |
| Processor crash | BullMQ job را به failed state منتقل می‌کند |
| Graceful shutdown | `app.close()` در process signal → queue drains |

---

## تست

```bash
pnpm --filter @hivork/scheduler dev
# باید: "Application listening on port 4002"
# باید: "Processing job ... type=health-check"

curl http://localhost:4002/health
# → {"status":"ok","queue":"..."}
```

---

## ممنوعیت‌ها

- HTTP business API (scheduler فقط worker)
- Naive cron بدون BullMQ (ADR-016 reference)
- Direct DB call بدون use case در processor

---

## Policy Alignment

- [x] DEVELOPMENT_RULES.md — BullMQ برای job scheduling
- [x] EXCELLENCE-STANDARDS §9 — error handling در processor
- [x] SOFT-DELETE-POLICY — N/A (skeleton)
- [x] ADR-002 — Scheduler از `@hivork/application` use cases استفاده می‌کند

---

## مراجع

- `docs/05-channels/channels-strategy.md`
- `docs/04-technology/tech-stack.md` § BullMQ

---

## Self-Review Score

| محور | /امتیاز | یادداشت |
|------|---------|---------|
| Metadata (10) | 10/10 | همه فیلدها |
| Completeness (25) | 25/25 | AC، structure، code patterns کامل |
| Policy (25) | 24/25 | BullMQ explicit — ADR ref کامل نیست |
| Executability (25) | 25/25 | Edge cases، steps، tests |
| Alignment (15) | 15/15 | Sync با tech-stack BullMQ |
| **جمع** | **99/100** | ✅ Ready |
