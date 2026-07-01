# TASK-102: Frontend — Admin Layout + Sidebar + Header

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-10-Frontend-Layout-Auth |
| ID | TASK-102 |
| Priority | P0 |
| Depends on | TASK-101, TASK-007, TASK-081, TASK-082 |
| Blocks | TASK-104, TASK-105 |
| Estimated | 10h |

---

## هدف

Layout مشترک پنل فروشنده در route group `(seller)/admin`: sidebar ناوبری، header با branch switcher و user menu، نمایش tenant context، و drawer موبایل — shell برای تمام صفحات TASK-105 تا TASK-113.

---

## معیار پذیرش

- [ ] Layout در `app/(seller)/admin/layout.tsx` — wrap همه `/admin/*`
- [ ] Sidebar ثابت دسکتاپ (≥1024px)؛ drawer همبرگری موبایل
- [ ] Header: نام tenant، branch switcher، avatar + نام staff، logout
- [ ] Branch switcher: `PATCH /staff/me/active-branch` + refresh data
- [ ] Breadcrumb slot برای child pages
- [ ] `StaffAuthProvider` در layout
- [ ] Skeleton layout هنگام loading staff/me
- [ ] Keyboard: Esc بستن drawer موبایل

---

## مشخصات فنی

### Route Group Structure

```
apps/web/app/(seller)/
└── admin/
    ├── layout.tsx          # AdminShell
    ├── page.tsx            # redirect → /admin/dashboard
    └── dashboard/
        └── page.tsx        # TASK-105
```

### Permission

Layout shell: هر staff authenticated. محتوای sidebar در TASK-104.

### API Endpoints

| Method | Path | کاربرد |
|--------|------|--------|
| GET | `/api/v1/staff/me` | profile + permissions + activeBranchId |
| GET | `/api/v1/tenants/me` | نام tenant، logo |
| GET | `/api/v1/branches` | branch switcher options |
| PATCH | `/api/v1/staff/me/active-branch` | تغییر شعبه |
| POST | `/api/v1/auth/logout` | خروج از user menu |

### Wireframe — Desktop

```
┌──────────┬──────────────────────────────────────────────────┐
│ [Logo]   │  فروشگاه موبایل علی    [شعبه ▼]    [👤 علی ▼]   │
│          ├──────────────────────────────────────────────────┤
│ داشبورد  │  {children — breadcrumb + page}                  │
│ مشتریان  │                                                  │
│ فروش‌ها  │                                                  │
│ گزارش‌ها │                                                  │
│          │                                                  │
│ ───────  │                                                  │
│ v1.0     │                                                  │
└──────────┴──────────────────────────────────────────────────┘
     240px                    flex-1
```

### Wireframe — Mobile

```
┌─────────────────────────────────────┐
│ [☰]  فروشگاه علی    [شعبه ▼] [👤]  │
├─────────────────────────────────────┤
│         {page content}              │
└─────────────────────────────────────┘

Drawer (overlay from start):
┌──────────┐
│ ✕        │
│ داشبورد  │
│ مشتریان  │
│ ...      │
└──────────┘
```

### Header Components

| Component | رفتار |
|-----------|--------|
| `TenantBadge` | نام tenant از `tenants/me`؛ logo اگر موجود |
| `BranchSwitcher` | Combobox شعب مجاز؛ onChange → PATCH + invalidate queries |
| `UserMenu` | نام staff، logout، لینک تنظیمات (disabled P2) |
| `MobileNavToggle` | باز کردن `Sheet` sidebar |

### Branch Switcher

- فقط شعب در `assignedBranchIds` یا همه اگر خالی (ADR-015)
- نمایش `branchName` فعال
- Loading state هنگام PATCH
- خطای `BRANCH_NOT_ALLOWED` → toast

### Layout States

| State | UI |
|-------|-----|
| Loading staff/me | Full-page skeleton (sidebar + header shape) |
| Error staff/me | Error card + retry + logout |
| Authenticated | Normal shell |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/app/(seller)/admin/layout.tsx` |
| Create | `apps/web/app/(seller)/admin/page.tsx` |
| Create | `apps/web/components/layout/admin-shell.tsx` |
| Create | `apps/web/components/layout/admin-sidebar.tsx` |
| Create | `apps/web/components/layout/admin-header.tsx` |
| Create | `apps/web/components/layout/branch-switcher.tsx` |
| Create | `apps/web/components/layout/user-menu.tsx` |
| Create | `apps/web/components/layout/mobile-nav-drawer.tsx` |
| Create | `apps/web/components/layout/page-breadcrumb.tsx` |
| Create | `apps/web/hooks/use-active-branch.ts` |

---

## مراحل پیاده‌سازی

1. `AdminShell` با CSS grid: sidebar + main
2. Fetch `staff/me` + `tenants/me` در layout (React Query)
3. Branch switcher با optimistic update
4. Mobile drawer با `@hivork/ui` Sheet
5. Breadcrumb component با `usePathname`
6. Redirect `/admin` → `/admin/dashboard`

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| staff/me 401 | redirect `/login` |
| staff/me 403 | No-permission full page |
| Branch PATCH fail | revert selection + toast |
| Tenant suspended | banner زرد در header (از tenant.status) |
| Resize desktop↔mobile | drawer بسته شود |

---

## تست

- [ ] Component: branch switcher calls PATCH
- [ ] E2E: mobile drawer open/close
- [ ] Visual: RTL sidebar on right side

---

## UX

- [x] Page §7: loading skeleton, error retry
- [x] RTL: sidebar `border-e` نه `border-r`
- [x] a11y: `nav` landmark، `aria-current="page"` on active item
- [x] Mobile: drawer focus trap

---

## Policy Alignment

- [x] EXCELLENCE-STANDARDS §7 Pages anatomy
- [x] ADR-015 — active branch in header
- [x] ADR-002 — presentation only

---

## مراجع

- `docs/02-architecture/tenancy-and-entities.md` — branch session
- `docs/02-architecture/api-contracts.md` — §8 Active Branch
- `Phases/Phase-0-Foundation/Epic-02-Apps-Skeleton/TASK-007-apps-web.md`

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | /10 | 10 |
| Completeness | /25 | 25 |
| Policy | /25 | 24 |
| Executability | /25 | 25 |
| Alignment | /15 | 15 |
| **جمع** | **/100** | **99** |
