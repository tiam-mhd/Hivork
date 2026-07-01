# ساختار Monorepo

## Directory Tree

```
hivork/
├── apps/
│   ├── api/                    # NestJS — HTTP API
│   ├── web/                    # Next.js — seller + customer + marketing
│   ├── bot-gateway/            # NestJS — Telegram/Bale webhooks
│   ├── scheduler/              # NestJS — cron + BullMQ workers
│   └── docs/                   # (optional) OpenAPI static
│
├── packages/
│   ├── domain/                 # Entities, VOs, Domain Events (pure TS)
│   ├── application/            # Use Cases
│   ├── infrastructure/         # Prisma repos, Redis, SMS, S3, Bot adapters
│   ├── contracts/              # Zod schemas + shared DTO types
│   ├── ui/                     # Design system (shadcn-based)
│   ├── config/                 # ESLint, TSConfig, Prettier
│   └── i18n/                   # fa-IR strings, formatters
│
├── modules/
│   ├── core/                   # Core platform module
│   └── installments/           # Installments module
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── Dockerfile.*
│
├── docs/                       # این مستندات
├── .github/workflows/
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

---

## apps/api

```
apps/api/src/
├── main.ts
├── app.module.ts
├── common/
│   ├── guards/          # Auth, Permission, Module, DataScope
│   ├── decorators/
│   ├── filters/
│   └── interceptors/    # Audit, TenantContext
├── core/                # re-export from modules/core
└── modules/
    └── installments/    # re-export from modules/installments
```

---

## apps/web

```
apps/web/
├── app/
│   ├── (marketing)/     # landing, pricing
│   ├── (auth)/          # OTP login
│   ├── (seller)/admin/  # پنل فروشنده
│   └── (customer)/my/   # پورتال مشتری
├── components/
├── lib/api/             # typed client from contracts
└── middleware.ts        # auth, tenant context
```

---

## packages/domain

```
packages/domain/
├── core/
│   ├── tenant/
│   ├── staff/
│   └── rbac/
└── installments/
    ├── sale.entity.ts
    ├── installment.entity.ts
    └── events/
```

**قانون:** zero import from NestJS/Prisma.

---

## packages/contracts

```
packages/contracts/
├── auth/
├── tenant/
├── installments/
└── index.ts             # Zod schemas → infer types
```

Frontend و Backend هر دو از این package import.

---

## Naming Conventions

| Item | Convention |
|------|------------|
| Files | kebab-case |
| Classes | PascalCase |
| DB tables | snake_case plural |
| API routes | kebab-case |
| Permissions | dot.notation |
| Events | PascalCase past tense |

---

## Environments

| Env |用途 |
|-----|-----|
| `local` | docker-compose dev |
| `staging` | pre-production |
| `production` | live |

**هرگز** test روی production DB.  
Secrets: env vars — نه git.

---

## Docker Compose (Dev)

```yaml
services:
  postgres:    # 16
  redis:       # 7
  api:
  web:
  bot-gateway:
  scheduler:
  mailhog:     # dev SMS mock
```

---

## Scripts (root)

```json
{
  "dev": "turbo dev",
  "build": "turbo build",
  "test": "turbo test",
  "lint": "turbo lint",
  "db:migrate": "prisma migrate dev",
  "db:seed": "tsx prisma/seed.ts"
}
```
