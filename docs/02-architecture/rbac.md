# سیستم RBAC — Hivork

> **وضعیت:** Approved — v1.0  
> **نسخه:** 1.0 — 1405/04/08  
> **ADR مرتبط:** ADR-004, ADR-015  
> Role-Permission-Access از روز ۱. Roleهای سیستمی + Role سفارشی tenant. Permission روی Role **و** override روی User.

---

## Permission Naming Convention

```
{module}.{resource}.{action}
```

### Core Permissions

```
core.branch.view
core.branch.create
core.branch.update
core.branch.delete

core.staff.view
core.staff.create
core.staff.update
core.staff.delete

core.role.view
core.role.create
core.role.update
core.role.delete

core.settings.view
core.settings.edit
```

### Installments Module Permissions

```
installments.sale.view
installments.sale.create
installments.sale.update
installments.sale.edit
installments.sale.cancel
installments.sale.extend
installments.sale.copy
installments.sale.terminate
installments.sale.close
installments.sale.archive
installments.sale.change_status
installments.sale.waive_remaining

installments.sale.guarantor.view
installments.sale.guarantor.create
installments.sale.guarantor.update
installments.sale.guarantor.delete

installments.sale.collateral.view
installments.sale.collateral.create
installments.sale.collateral.update
installments.sale.collateral.delete
installments.sale.collateral.release
installments.sale.collateral.forfeit

installments.sale.edit_financials

installments.installment.view
installments.installment.waive

installments.payment.view
installments.payment.confirm
installments.payment.reject
installments.payment.report

installments.customer.view
installments.customer.create
installments.customer.update
installments.customer.import

installments.reminder.configure
installments.reminder.view_log

installments.report.dashboard
installments.report.overdue
installments.report.export
```

> **قانون:** از permission مبهم تنها مثل `manage` پرهیز — برای audit دقیق.

---

## Role Scopes

| Scope | مثال | tenant_id | قابل حذف |
|-------|------|-----------|----------|
| **platform** | `super_admin`, `support` | null | خیر |
| **tenant_system** | `owner`, `manager`, `cashier` | required | خیر |
| **tenant_custom** | `accountant`, `branch_supervisor` | required | بله (توسط owner) |

### Role Structure

```typescript
Role {
  id: UUID
  scope: 'platform' | 'tenant'
  tenant_id?: UUID
  code: string              // 'owner' | custom slug
  name: string              // display name (fa)
  is_system: boolean
  permissions: Permission[]
  data_scope: 'all' | 'branch' | 'own'
  module_id?: string        // null for core roles
}
```

---

## Roleهای پیش‌فرض Tenant (System)

| Role | data_scope | خلاصه دسترسی |
|------|------------|--------------|
| **owner** | all | همه — شامل role.manage، settings.edit، billing |
| **manager** | all | فروش، مشتری، گزارش، staff.view — بدون role.manage |
| **cashier** | branch یا own | sale.create/view، payment.confirm — محدود |
| **viewer** | branch یا all | فقط view — گزارش‌خوان |

> Role سفارشی: **فقط `owner`** می‌سازد.

---

## User Permission Override

```typescript
UserPermissionOverride {
  id: UUID
  staff_id: UUID
  permission_id: UUID
  effect: 'grant' | 'deny'
  reason?: string           // audit
  expires_at?: DateTime      // دسترسی موقت
  created_by: UUID
}
```

### Precedence (اولویت — حیاتی)

```
Effective Permission =
  (Role Permissions ∪ User GRANTs)
  − User DENYs

اولویت:
1. DENY صریح روی User     → همیشه می‌برد
2. GRANT صریح روی User
3. اجتماع Permissionهای همه Roleهای User
4. Default = DENY (deny by default)
```

**اشتباه رایج:** کپی کل permissionها روی User.  
**درست:** User فقط **استثنا** (یک permission اضافه یا یکی کم).

---

## Permission Matrix — Roleهای پیش‌فرض

| Permission | owner | manager | cashier | viewer |
|------------|:-----:|:-------:|:-------:|:------:|
| core.settings.edit | ✅ | ❌ | ❌ | ❌ |
| core.role.manage | ✅ | ❌ | ❌ | ❌ |
| core.staff.create | ✅ | ❌ | ❌ | ❌ |
| installments.sale.create | ✅ | ✅ | ✅ | ❌ |
| installments.sale.view | ✅ | ✅ | ✅ | ✅ |
| installments.payment.confirm | ✅ | ✅ | ✅ | ❌ |
| installments.report.export | ✅ | ✅ | ❌ | ✅ |
| installments.customer.import | ✅ | ✅ | ❌ | ❌ |
| installments.reminder.configure | ✅ | ✅ | ❌ | ❌ |

*(matrix کامل هنگام implementation freeze می‌شود — per module version)*

---

## Customer Portal Permissions

Customer actor **جدا** — نه RBAC staff:

| Action | مجاز |
|--------|------|
| مشاهده اقساط خود (tenant + personal) | ✅ |
| report payment | ✅ (if tenant setting) |
| مشاهده tenant دیگر | ❌ |
| staff endpoints | ❌ |

---

## Implementation Guards

```
NestJS:
  @RequirePermission('installments.sale.create')
  @ApplyDataScope()
  @RequireModule('installments')
```

**Active branch:** staff routes read `X-Branch-Id` or session; intersect with `assignedBranchIds` before query filter (ADR-015).

```
Repository layer:
  always append tenant_id + data_scope filter (+ branch_id when scoped)
```

---

## Permission Versioning

- Permission list **per module version**
- Breaking change = migration + deprecation period
- API `/v1` و `/v2` parallel برای clientهای قدیمی (۶+ ماه)
- مرجع: [`docs/02-architecture/api-contracts.md`](./api-contracts.md) §10

---

*نسخه 1.0 — 1405/04/08*
