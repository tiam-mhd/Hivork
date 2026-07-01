# Data Flow — Hivork

> **وضعیت:** Approved — v1.0  
> **نسخه:** 1.0 — 1405/04/08  
> **ADR مرتبط:** ADR-003, ADR-008, ADR-010, ADR-015  
> **مراجع:**
> - [Architecture Overview](./overview.md)
> - [API Contracts](./api-contracts.md)
> - [RBAC](./rbac.md)

---

## ۱. جریان کلی درخواست HTTP — Staff

هر درخواست HTTP از کاربر (web panel) به API سرور از این pipeline عبور می‌کند:

```mermaid
sequenceDiagram
    autonumber
    participant C as Client (Web Panel)
    participant MW as NestJS Middleware
    participant G as Guards Pipeline
    participant UC as Use Case
    participant D as Domain Entity
    participant R as Repository
    participant DB as PostgreSQL
    participant OB as Outbox Worker

    C->>MW: HTTP Request + Cookie (hivork_staff)
    MW->>G: Extract JWT from cookie
    G->>G: AuthGuard: verify JWT signature + expiry
    G->>G: Extract: actor=staff, tenantId, staffId
    G->>G: TenantContextGuard: set tenant context
    G->>G: ModuleGuard: installments enabled for tenant?
    G->>G: BranchGuard: X-Branch-Id valid for staff?
    G->>G: PermissionGuard: check RBAC (role+override)
    G->>G: DataScopeInterceptor: build query filters
    G->>UC: execute(cmd, ctx)
    UC->>D: domain logic + invariant check
    D-->>UC: domain result or throw DomainError
    UC->>R: save(entity, tx)
    R->>DB: BEGIN TRANSACTION
    R->>DB: INSERT/UPDATE entity
    R->>DB: INSERT AuditLog
    R->>DB: INSERT OutboxEvent
    R->>DB: COMMIT
    DB-->>C: HTTP Response 200/201
    Note over OB,DB: async: worker polls OutboxEvent
    OB->>DB: SELECT unprocessed events
    OB->>OB: dispatch handlers (reminder, notify, stats)
    OB->>DB: mark event processed
```

---

## ۲. جریان ایجاد فروش — CreateSale

```mermaid
sequenceDiagram
    autonumber
    participant Staff as Staff (Web)
    participant API as NestJS API
    participant UC as CreateSaleUseCase
    participant Domain as SaleEntity
    participant DB as PostgreSQL
    participant Worker as Outbox Worker
    participant Bot as Telegram Bot

    Staff->>API: POST /api/v1/sales (totalAmount, installmentCount, ...)
    API->>API: Validate Zod DTO
    API->>UC: execute(CreateSaleCommand)
    UC->>UC: verify branch access (ADR-015)
    UC->>UC: verify customer exists in tenant
    UC->>Domain: Sale.create(params)
    Domain->>Domain: BR-001 to BR-009: validate
    Domain->>Domain: calculateInstallments() → BR-005
    Domain->>Domain: raise SaleCreated event
    Domain-->>UC: Sale + Installments[]
    UC->>DB: transaction {
    UC->>DB:   INSERT Sale
    UC->>DB:   INSERT Installment × N
    UC->>DB:   INSERT AuditLog (sale.create)
    UC->>DB:   INSERT OutboxEvent (SaleCreated)
    UC->>DB: }
    DB-->>API: committed
    API-->>Staff: 201 { saleId, installments }

    Note over Worker,Bot: async — within seconds
    Worker->>DB: poll OutboxEvent: SaleCreated
    Worker->>Bot: send welcome message to customer
    Worker->>DB: mark event processed
```

---

## ۳. جریان گزارش و تأیید پرداخت

```mermaid
sequenceDiagram
    autonumber
    participant Customer as مشتری (Bot/PWA)
    participant API as Hivork API
    participant Staff as فروشنده (Web)
    participant DB as PostgreSQL
    participant Worker as Outbox Worker
    participant BotGW as Bot Gateway

    Note over Customer,DB: مرحله ۱ — گزارش پرداخت توسط مشتری
    Customer->>BotGW: /pay یا دکمه پرداخت
    BotGW->>API: POST /api/v1/customer/installments/{id}/report-payment
    API->>API: verify customer token (actor=customer)
    API->>API: verify installment.tenantCustomerId === customer
    API->>DB: check: no pending PaymentAttempt (BR-021)
    API->>DB: INSERT PaymentAttempt {status: pending}
    API->>DB: INSERT OutboxEvent (PaymentReported)
    DB-->>Customer: 201 { attemptId }
    Worker->>DB: poll PaymentReported
    Worker->>Staff: notify seller (Telegram/web push)

    Note over Staff,DB: مرحله ۲ — تأیید پرداخت توسط فروشنده
    Staff->>API: POST /api/v1/payments/{attemptId}/confirm
    API->>API: verify staff permission (installments.payment.confirm)
    API->>DB: BEGIN TRANSACTION
    API->>DB: UPDATE PaymentAttempt {status: confirmed}
    API->>DB: UPDATE Installment {status: paid, paidAt, confirmedById}
    API->>DB: check all installments settled → UPDATE Sale {status: completed}?
    API->>DB: INSERT AuditLog (payment.confirm)
    API->>DB: INSERT OutboxEvent (PaymentConfirmed)
    API->>DB: COMMIT
    DB-->>Staff: 200 { installmentId, newStatus: paid }
    Worker->>DB: poll PaymentConfirmed
    Worker->>Customer: thank you message via bot
```

---

## ۴. جریان OTP Login

```mermaid
sequenceDiagram
    autonumber
    participant User as User (Staff یا Customer)
    participant API as Hivork API
    participant Redis as Redis Cache
    participant SMS as SMS Provider
    participant DB as PostgreSQL

    Note over User,SMS: مرحله ۱ — درخواست OTP
    User->>API: POST /api/v1/auth/otp/request { phone, actor }
    API->>API: normalize phone → 09xxxxxxxxx
    API->>Redis: check rate limit (3/min per phone)
    alt rate limit exceeded
        Redis-->>API: LIMIT_EXCEEDED
        API-->>User: 429 Too Many Requests
    else within limit
        API->>Redis: SET otp:{phone}:{actor} = {code, expiry=5min}
        API->>SMS: send OTP code
        API-->>User: 200 { message: "OTP sent" }
    end

    Note over User,DB: مرحله ۲ — تأیید OTP
    User->>API: POST /api/v1/auth/otp/verify { phone, otp, actor }
    API->>Redis: GET otp:{phone}:{actor}
    alt OTP invalid or expired
        API-->>User: 400 { code: OTP_INVALID_OR_EXPIRED }
    else OTP valid
        API->>Redis: DEL otp:{phone}:{actor}  ← یک‌بار مصرف
        API->>DB: resolve/create User → Staff or GlobalCustomer (ADR-017)
        API->>API: generate accessToken (15min) + refreshToken (30d)
        API->>Redis: SET refresh:{token} = {userId, actor, exp=30d}
        API-->>User: 200 { accessToken } + Set-Cookie: hivork_{actor}=refreshToken
    end
```

---

## ۵. جریان Outbox Pattern

جریان کامل event-driven با at-least-once delivery:

```mermaid
sequenceDiagram
    autonumber
    participant UC as Use Case
    participant DB as PostgreSQL
    participant Poller as Outbox Poller (BullMQ)
    participant Handler as Event Handlers
    participant External as External Services

    Note over UC,DB: در همان Transaction
    UC->>DB: BEGIN TX
    UC->>DB: INSERT business entity
    UC->>DB: INSERT OutboxEvent { eventType, payload, status: PENDING }
    UC->>DB: COMMIT

    Note over Poller,DB: worker — هر ۵ ثانیه
    loop every 5 seconds
        Poller->>DB: SELECT * FROM OutboxEvent WHERE status=PENDING LIMIT 100
        Poller->>DB: UPDATE status=PROCESSING (optimistic lock)
        Poller->>Handler: dispatch(eventType, payload)
        Handler->>External: SMS / Telegram / internal
        alt success
            Handler->>DB: UPDATE OutboxEvent SET status=PROCESSED, processedAt=NOW()
        else failure (retry)
            Handler->>DB: UPDATE OutboxEvent SET status=PENDING, retryCount++
            Note right of DB: exponential backoff: 1s, 5s, 30s, 5min, 30min
            Note right of DB: max retries=5 → status=DEAD_LETTER
        end
    end
```

### OutboxEvent Schema

```typescript
OutboxEvent {
  id: UUID
  eventType: string         // 'SaleCreated' | 'PaymentConfirmed' | ...
  payload: JSON             // { saleId, tenantId, ... }
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'DEAD_LETTER'
  retryCount: number        // 0-5
  processedAt: DateTime?
  deadAt: DateTime?
  createdAt: DateTime
  tenantId: UUID?           // for monitoring
}
```

### Event → Handler Mapping

| Event | Handlers |
|-------|---------|
| `SaleCreated` | SendWelcomeMessage, LogAudit |
| `InstallmentDueSoon` | SendReminder (BR-029) |
| `InstallmentOverdue` | SendOverdueReminder, NotifySeller |
| `PaymentReported` | NotifySeller |
| `PaymentConfirmed` | ThankCustomer, UpdateStats |
| `PaymentRejected` | NotifyCustomerRejection |
| `CustomerLinkedToBot` | EnableReminders, SendWelcome |
| `SaleCompleted` | NotifyCompletion, UpdateStats |

---

## ۶. جریان Bot Gateway

```mermaid
sequenceDiagram
    autonumber
    participant TG as Telegram API
    participant BG as bot-gateway (grammY)
    participant API as apps/api
    participant UC as Use Case

    TG->>BG: webhook POST /webhook/telegram
    BG->>BG: parse update (message/callback)
    BG->>BG: resolve customer (chat_id → BotIdentity → GlobalCustomer)
    alt customer not linked
        BG->>TG: "لطفاً ابتدا لینک خود را فعال کنید"
    else customer linked
        BG->>BG: route command (/pay, /installments, /help)
        BG->>API: HTTP internal call (با bot service token)
        API->>UC: execute use case
        UC-->>API: result
        API-->>BG: response
        BG->>TG: sendMessage (Persian UI)
    end
```

---

## ۷. جریان Scheduler — Daily Overdue Job

```mermaid
sequenceDiagram
    autonumber
    participant CRON as BullMQ Cron
    participant Worker as OverdueWorker
    participant DB as PostgreSQL
    participant OB as Outbox

    Note over CRON: 00:30 Tehran Time (UTC+3:30)
    CRON->>Worker: trigger MarkOverdueJob
    Worker->>DB: SELECT installments WHERE status=PENDING AND dueDate < TODAY_TEHRAN
    loop batch of 500
        Worker->>DB: BEGIN TX
        Worker->>DB: UPDATE Installment SET status=OVERDUE WHERE id IN (...)
        Worker->>OB: INSERT OutboxEvent (InstallmentOverdue) × batch
        Worker->>DB: COMMIT
    end
    Worker->>CRON: job complete (count updated)
```

---

## ۸. جریان Reminder Scheduler

```mermaid
sequenceDiagram
    autonumber
    participant CRON as BullMQ Cron
    participant Worker as ReminderWorker
    participant DB as PostgreSQL
    participant NL as NotificationLog
    participant Bot as Telegram/Bale/SMS

    Note over CRON: هر ۱۵ دقیقه — بررسی reminder‌های pending
    CRON->>Worker: trigger SendRemindersJob
    Worker->>DB: find installments needing reminder today
    Note right of DB: due_date IN (today, tomorrow, +3d)
    loop per installment
        Worker->>NL: check unique (installment_id, reminder_type, channel)
        alt already sent (idempotent — BR-029)
            Worker->>Worker: skip
        else not sent
            Worker->>DB: INSERT NotificationLog {status: scheduled}
            Worker->>Bot: send message
            alt success
                Worker->>NL: UPDATE status=sent
            else fail
                Worker->>NL: UPDATE status=failed, retry++
            end
        end
    end
```

---

## ۹. لایه‌بندی داده و مسئولیت‌ها

```
┌──────────────────────────────────────────────────────────┐
│                  Presentation Layer                       │
│  NestJS Controllers, Zod Validation, Guards, Response DTO│
│  Bot Handlers (grammY), Scheduler Jobs                   │
└────────────────────────┬─────────────────────────────────┘
                         │ Commands / Queries
┌────────────────────────▼─────────────────────────────────┐
│                  Application Layer                        │
│  Use Cases: CreateSale, ConfirmPayment, WaiveInstallment │
│  DTOs, Event Dispatch, Orchestration (no business logic) │
└────────────────────────┬─────────────────────────────────┘
                         │ Entity Methods / Domain Events
┌────────────────────────▼─────────────────────────────────┐
│                    Domain Layer                           │
│  Entities: Sale, Installment, PaymentAttempt             │
│  Value Objects: Money (BigInt Rial), PhoneNumber         │
│  Domain Events: SaleCreated, PaymentConfirmed, ...       │
│  Domain Services: InstallmentCalculator                  │
│  Invariants: BR-001 → BR-047                             │
└────────────────────────┬─────────────────────────────────┘
                         │ Repository Interfaces
┌────────────────────────▼─────────────────────────────────┐
│                Infrastructure Layer                       │
│  Prisma Repository (PG): auto-append tenantId filter     │
│  Redis: OTP, sessions, rate limits, branch sessions      │
│  Notification: Telegram (grammY), Bale, SMS (Kavenegar) │
│  File Storage: Arvan S3 (evidence files)                 │
│  Outbox Poller (BullMQ)                                  │
└──────────────────────────────────────────────────────────┘
```

---

## ۱۰. Multi-Tenancy در Query Layer

هر repository call به صورت اتوماتیک `tenantId` filter اعمال می‌کند:

```typescript
// packages/infrastructure/persistence/sale.repository.ts
export class SaleRepository {
  async findById(id: string, tenantId: string): Promise<Sale | null> {
    const raw = await this.prisma.sale.findFirst({
      where: {
        id,
        tenantId,      // ← همیشه از JWT، هرگز از client
        deletedAt: null,
      },
    });
    return raw ? SaleMapper.toDomain(raw) : null;
  }

  async findAll(query: SaleQuery, ctx: TenantContext): Promise<Sale[]> {
    return this.prisma.sale.findMany({
      where: {
        tenantId: ctx.tenantId,            // mandatory
        ...(ctx.branchIds && {
          branchId: { in: ctx.branchIds }, // data scope
        }),
        deletedAt: null,
        ...(query.status && { status: query.status }),
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 20,
      cursor: query.cursor ? { id: query.cursor } : undefined,
    });
  }
}
```

---

*نسخه 1.0 — 1405/04/08*
