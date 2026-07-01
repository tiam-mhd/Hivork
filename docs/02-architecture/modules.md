# معماری ماژولار

## تعریف ماژول

ماژول فقط پوشه جدا **نیست**. هر ماژول Hivork باید داشته باشد:

```
Module
├── permissions[]           → ثبت در registry
├── settings.schema[]       → تنظیمات tenant
├── domain/                 → entities, value objects, events
├── application/            → use cases
├── api/                    → routes, controllers
├── web-routes/             → menu entries برای Next.js
├── events/                 → domain events + handlers
├── jobs/                   → scheduler jobs
└── migrations/             → (optional) module-specific
```

---

## Core Module (همیشه فعال)

```
core/
├── tenant
├── branch
├── staff / auth
├── rbac (role, permission, override)
├── settings
├── audit
├── notification (infrastructure — adapter layer)
├── module-registry
└── subscription / plan
```

---

## Installments Module (ماژول ۱)

```
modules/installments/
├── domain/
│     ├── Sale
│     ├── Installment
│     ├── PaymentAttempt
│     ├── PersonalInstallment
│     └── ReminderPolicy (derived from settings)
├── permissions.ts
├── settings.schema.ts
├── application/
│     ├── CreateSale
│     ├── ConfirmPayment
│     ├── ReportPayment
│     ├── MarkOverdue
│     └── ...
├── api/
├── events/
│     ├── SaleCreated
│     ├── InstallmentDueSoon
│     ├── InstallmentOverdue
│     ├── PaymentReported
│     └── PaymentConfirmed
├── jobs/
│     ├── ScheduleRemindersJob
│     ├── MarkOverdueJob
│     └── SendReminderJob
├── bot-handlers/
└── web-routes/
```

---

## Module Registry Interface

```typescript
interface HivorkModule {
  code: string                    // 'installments'
  name: string                    // 'مدیریت اقساط'
  version: string                 // semver
  permissions: PermissionDefinition[]
  settingsSchema: SettingsSchema
  register(app: INestApplication): void
  getMenuItems(): MenuItem[]
  getBotCommands?(): BotCommand[]
}
```

### Bootstrap

```typescript
// apps/api/src/main.ts
const modules = [CoreModule, InstallmentsModule];
for (const mod of modules) {
  mod.register(app);
}
```

---

## Module Entitlement Check

```
Request → Tenant.hasModule('installments')?
  NO  → 403 MODULE_NOT_ENABLED
  YES → continue permission check
```

UI: menu item فقط اگر module enabled + permission دارد.

---

## ماژول‌های آینده (Placeholder)

| Code | نام | وابستگی |
|------|-----|---------|
| `installments` | مدیریت اقساط | core |
| `digital-menu` | منوی دیجیتال | core |
| `pos` | صندوق | core, installments? |
| `crm` | CRM | core |
| `analytics` | گزارش پیشرفته | core |
| `payment-gateway` | درگاه پرداخت | core, installments |

---

## Communication بین ماژول‌ها

| مجاز | غیرمجاز |
|------|---------|
| Domain Events (async) | import مستقیم entity ماژول دیگر |
| Core services (audit, notification) | circular dependency |
| Shared packages/contracts | shared mutable state |

```
Installments --[SaleCreated event]--> Analytics (future)
Installments --[uses]--> core.notification
```

---

## Versioning ماژول

- هر ماژول semver مستقل
- Permission breaking change → bump minor/major + migration guide
- Tenant می‌تواند module version pin شود (enterprise — آینده)
