# TASK-104: Frontend — Permission-Based Sidebar Menu

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-10-Frontend-Layout-Auth |
| ID | TASK-104 |
| Priority | P0 |
| Depends on | TASK-102, TASK-103, TASK-081 |
| Blocks | TASK-105, TASK-106, TASK-109, TASK-112 |
| Estimated | 5h |

---

## هدف

ساختار sidebar و quick actions مبتنی بر effective permissions کارمند — آیتم‌های منو فقط اگر permission مربوطه وجود دارد نمایش داده شوند. منبع permissions: `GET /staff/me`.

---

## معیار پذیرش

- [ ] Hook `usePermission(code)` و `useAnyPermission(codes[])`
- [ ] Sidebar items از config array — نه hardcode پراکنده
- [ ] آیتم بدون permission: hidden (نه disabled)
- [ ] Nested menu: گزارش‌ها، مشتریان
- [ ] Active route highlight با `usePathname`
- [ ] صفحه بدون permission: `NoPermissionPage` component (403 UI)
- [ ] DENY override respected (از API effective permissions)

---

## مشخصات فنی

### Permission Source

```
GET /api/v1/staff/me
Response.permissions: string[]  // effective after DENY/GRANT
```

### Menu Config

```typescript
// lib/navigation/admin-menu.ts
export const ADMIN_MENU: NavItem[] = [
  {
    id: 'dashboard',
    label: 'داشبورد',
    href: '/admin/dashboard',
    icon: 'LayoutDashboard',
    permission: 'installments.report.dashboard',
  },
  {
    id: 'customers',
    label: 'مشتریان',
    permission: 'installments.customer.view',
    children: [
      { label: 'لیست مشتریان', href: '/admin/customers', permission: 'installments.customer.view' },
      { label: 'مشتری جدید', href: '/admin/customers/new', permission: 'installments.customer.create' },
      { label: 'ورود از Excel', href: '/admin/customers/import', permission: 'installments.customer.import' },
    ],
  },
  {
    id: 'sales',
    label: 'فروش‌ها',
    permission: 'installments.sale.view',
    children: [
      { label: 'لیست فروش‌ها', href: '/admin/sales', permission: 'installments.sale.view' },
      { label: 'فروش جدید', href: '/admin/sales/new', permission: 'installments.sale.create' },
    ],
  },
  {
    id: 'reports',
    label: 'گزارش‌ها',
    permission: null, // show if any child visible
    children: [
      { label: 'معوقات', href: '/admin/reports/overdue', permission: 'installments.report.overdue' },
      { label: 'سررسید امروز', href: '/admin/reports/today-due', permission: 'installments.report.dashboard' },
    ],
  },
];
```

### Permission Matrix (منو)

| Menu Item | Permission Required |
|-----------|---------------------|
| داشبورد | `installments.report.dashboard` |
| لیست مشتریان | `installments.customer.view` |
| مشتری جدید | `installments.customer.create` |
| Import Excel | `installments.customer.import` |
| لیست فروش‌ها | `installments.sale.view` |
| فروش جدید | `installments.sale.create` |
| گزارش معوقات | `installments.report.overdue` |
| سررسید امروز | `installments.report.dashboard` |

### Wireframe — Filtered Menu (cashier example)

```
داشبورد          ✅
مشتریان          ❌ hidden
فروش‌ها
  ├ لیست         ✅
  └ فروش جدید    ✅
گزارش‌ها
  ├ معوقات       ✅
  └ سررسید امروز ✅
```

### NoPermissionPage (403 UI)

```
┌─────────────────────────────────────┐
│         🔒 دسترسی محدود              │
│  شما مجوز مشاهده این صفحه را ندارید. │
│  نقش فعلی: صندوقدار                  │
│  مجوز لازم: installments.customer.view │
│  [بازگشت به داشبورد]                 │
└─────────────────────────────────────┘
```

### Page Guard HOC

```typescript
// components/auth/require-permission.tsx
<RequirePermission permission="installments.customer.view" fallback={<NoPermissionPage required="..." />}>
  {children}
</RequirePermission>
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/lib/navigation/admin-menu.ts` |
| Create | `apps/web/hooks/use-permission.ts` |
| Create | `apps/web/components/auth/require-permission.tsx` |
| Create | `apps/web/components/layout/no-permission-page.tsx` |
| Update | `apps/web/components/layout/admin-sidebar.tsx` — consume menu config |

---

## مراحل پیاده‌سازی

1. Parse permissions از StaffAuthContext
2. `filterMenuByPermissions()` recursive
3. `usePermission` hook
4. `RequirePermission` wrapper برای pages
5. Hide parent if all children hidden
6. Unit test permission filter logic

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| permissions empty array | only dashboard if any — else NoPermission home |
| User DENY on sale.create | menu item hidden even if role has it |
| Direct URL without permission | NoPermissionPage 403 UI |
| Module installments disabled | middleware redirect plan page (P2) |

---

## تست

- [ ] Unit: filterMenu — cashier sees sales not customers
- [ ] Unit: DENY removes item
- [ ] E2E: viewer cannot access `/admin/customers/new`

---

## UX

- [x] Page §7: no-permission state with role name + required permission
- [x] a11y: hidden items not in tab order

---

## Policy Alignment

- [x] `docs/02-architecture/rbac.md` — permission matrix
- [x] UI-only check — backend guard mandatory
- [x] DENY > GRANT precedence

---

## مراجع

- `docs/02-architecture/rbac.md`
- `docs/03-modules/installments/STAFF-FLOWS.md` — access table SF-010

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | /10 | 10 |
| Completeness | /25 | 25 |
| Policy | /25 | 25 |
| Executability | /25 | 25 |
| Alignment | /15 | 15 |
| **جمع** | **/100** | **100** |
