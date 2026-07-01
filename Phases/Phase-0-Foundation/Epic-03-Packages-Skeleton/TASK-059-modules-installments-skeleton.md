# TASK-059: Module Skeleton — modules/installments

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-03-Packages-Skeleton |
| ID | TASK-059 |
| Priority | P1 |
| Depends on | TASK-016 |
| Blocks | TASK-028, TASK-043, TASK-044 |
| Estimated | 4h |
| Status | ✅ Done |

---

## هدف

Register کردن `installments` module در `ModuleRegistryService` — با لیست کامل permissions از `docs/02-architecture/rbac.md`، API namespace خالی، و settings schema stub — تا seed و guards از Phase 0 کار کنند حتی قبل از اینکه domain entities پیاده‌سازی شوند.

---

## معیار پذیرش

- [x] `modules/installments/` package `@hivork/module-installments`
- [x] `InstallmentsModule` implements `HivorkModule` interface
- [x] همه permissions از `docs/02-architecture/rbac.md` § installments exported
- [x] Module در `ModuleRegistryService` از طریق `apps/api/app.module.ts` register می‌شود
- [x] `@RequireModule('installments')` روی stub route کار می‌کند
- [x] `settings.schema.ts` stub (بدون settings فعلاً)
- [x] هیچ domain entity (Phase 1)
- [x] TASK-028 می‌تواند همه `installments.*` permissions را از اینجا seed کند

---

## مشخصات فنی

### ساختار پوشه

```
modules/installments/
├── src/
│   ├── index.ts
│   ├── installments.module.ts      # implements HivorkModule
│   ├── installments.permissions.ts # همه permissions از rbac.md
│   └── settings.schema.ts          # stub — بعداً پر می‌شود
└── package.json                    # name: @hivork/module-installments
```

### `installments.permissions.ts`

```typescript
// از docs/02-architecture/rbac.md § installments
export const INSTALLMENTS_PERMISSIONS = [
  // Sales
  'installments.sale.create',
  'installments.sale.view',
  'installments.sale.list',
  'installments.sale.cancel',
  'installments.sale.void',
  // Installments
  'installments.installment.view',
  'installments.installment.list',
  'installments.installment.waive',
  // Payments
  'installments.payment.confirm',
  'installments.payment.reject',
  'installments.payment.view',
  // Customers (installments scope)
  'installments.customer.view',
  'installments.customer.create',
  'installments.customer.update',
  'installments.customer.import',
  // Reports
  'installments.report.view',
  'installments.report.export',
  // Settings
  'installments.settings.view',
  'installments.settings.update',
] as const;

export type InstallmentsPermission = (typeof INSTALLMENTS_PERMISSIONS)[number];
```

### `installments.module.ts`

```typescript
import { Module } from '@nestjs/common';
import type { HivorkModule } from '@hivork/module-core';
import { INSTALLMENTS_PERMISSIONS } from './installments.permissions';

export const installmentsModuleDef: HivorkModule = {
  code: 'installments',
  name: 'مدیریت اقساط',
  version: '0.1.0',
  permissions: INSTALLMENTS_PERMISSIONS.map(key => ({
    key,
    description: key,
  })),
  register(app) {
    // Phase 1: register routes, controllers, etc.
  },
};

@Module({})
export class InstallmentsModule {}
```

### Registration در `apps/api`

```typescript
// app.module.ts
import { InstallmentsModule, installmentsModuleDef } from '@hivork/module-installments';

@Module({
  imports: [
    CoreModule,
    InstallmentsModule,
    // ...
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly registry: ModuleRegistryService) {}

  onModuleInit() {
    this.registry.register(installmentsModuleDef);
  }
}
```

### Stub route برای test `@RequireModule`

```typescript
// در apps/api — test route
@Controller('v1/installments')
@RequireModule('installments')
@RequireAuth()
export class InstallmentsStubController {
  @Get()
  index() {
    return { module: 'installments', status: 'active' };
  }
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `modules/installments/src/index.ts` |
| Create | `modules/installments/src/installments.module.ts` |
| Create | `modules/installments/src/installments.permissions.ts` |
| Create | `modules/installments/src/settings.schema.ts` |
| Create | `modules/installments/package.json` |
| Create | `modules/installments/tsconfig.json` |
| Update | `apps/api/src/app.module.ts` — InstallmentsModule + register |

---

## مراحل پیاده‌سازی

1. `INSTALLMENTS_PERMISSIONS` array از rbac.md کامل بخوان
2. `HivorkModule` implement را ایجاد کن
3. `@hivork/module-core` را به عنوان dependency اضافه کن
4. `apps/api` در `app.module.ts` import و register کن
5. Stub controller برای `GET /api/v1/installments` — برای test guard
6. `@RequireModule('installments')` را روی route test کن
7. TASK-028 می‌تواند از `INSTALLMENTS_PERMISSIONS` برای seed استفاده کند

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Module register نشده | — | Registry guard: tenant نمی‌تواند module را فعال کند |
| Tenant بدون installments plan | 403 | `ModuleEntitlementService` deny |
| Request با `@RequireModule('installments')` | 403 | اگر tenant plan ندارد |
| Permission key اشتباه در seed | — | Runtime permission check fail |
| `installmentsModuleDef.register()` error | App crash در startup | error باید catch شود |

---

## تست

```bash
# Test @RequireModule guard:
curl -X GET http://localhost:4000/api/v1/installments \
  -H "Authorization: Bearer <valid-staff-token>"
# اگر tenant installments دارد: 200
# اگر ندارد: 403

# TASK-028 seed:
# باید INSTALLMENTS_PERMISSIONS.length permissions در DB باشد
```

---

## Policy Alignment

- [x] ADR-002 — `modules/installments/` ماژول ۱ — ساختار تعریف‌شده
- [x] DEVELOPMENT_RULES.md §2 — "هر endpoint ماژولی: @RequireModule('installments')"
- [x] `.cursor/rules/02-security-rbac-audit.mdc` — Module guard + permission guard
- [x] SOFT-DELETE-POLICY — N/A (skeleton — domain entities Phase 1)
- [x] PHASE_EPIC_TASK_AUTHORING_RULES §8 — "Module skeleton (حتی empty)" ✅

---

## مراجع

- `docs/02-architecture/modules.md`
- `docs/02-architecture/rbac.md` § installments permissions
- `.cursor/rules/02-security-rbac-audit.mdc`

---

## Self-Review Score

| محور | /امتیاز | یادداشت |
|------|---------|---------|
| Metadata (10) | 10/10 | همه فیلدها |
| Completeness (25) | 25/25 | AC، permissions کامل، stub route، registration |
| Policy (25) | 25/25 | ADR-002، @RequireModule، RBAC guard |
| Executability (25) | 24/25 | Edge cases — integration test با guard |
| Alignment (15) | 15/15 | Sync با rbac.md + modules.md |
| **جمع** | **99/100** | ✅ Ready |
