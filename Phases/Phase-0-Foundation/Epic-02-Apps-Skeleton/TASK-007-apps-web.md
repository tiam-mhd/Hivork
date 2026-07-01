# TASK-007: App Skeleton — apps/web (Next.js)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-02-Apps-Skeleton |
| ID | TASK-007 |
| Priority | P0 |
| Depends on | TASK-001, TASK-003, TASK-005 |
| Blocks | TASK-054 |
| Estimated | 3h |
| Status | ✅ Done |

---

## هدف

Next.js 15 App Router با route groups برای چهار ناحیه (marketing، auth، seller/admin، customer/my)، RTL layout با `lang="fa" dir="rtl"`، Tailwind CSS، و fetch wrapper به API — skeleton کامل برای Phase 0 UI.

---

## معیار پذیرش

- [x] `pnpm --filter @hivork/web dev` → listen `localhost:3000`
- [x] Route groups: `(marketing)`, `(auth)`, `(seller)/admin`, `(customer)/my`
- [x] Root layout: `<html lang="fa" dir="rtl">` — RTL از همان ابتدا
- [x] Tailwind CSS configured با RTL logical properties
- [x] `@hivork/contracts` importable
- [x] `middleware.ts` stub (auth redirect placeholder)
- [x] API fetch wrapper: `lib/api/client.ts` → `NEXT_PUBLIC_API_URL`
- [x] `next.config.ts` با `transpilePackages: ['@hivork/ui']`
- [x] TypeScript strict (از `@hivork/config/tsconfig.nextjs.json`)

---

## مشخصات فنی

### ساختار پوشه

```
apps/web/
├── app/
│   ├── layout.tsx           # <html lang="fa" dir="rtl">
│   ├── globals.css
│   ├── (marketing)/
│   │   └── page.tsx         # صفحه اصلی (landing)
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (seller)/
│   │   └── admin/page.tsx   # داشبورد فروشنده
│   └── (customer)/
│       └── my/page.tsx      # پنل مشتری
├── lib/
│   └── api/client.ts        # fetch wrapper
├── middleware.ts             # auth redirect stub
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
└── package.json             # name: @hivork/web
```

### Root layout

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
```

### `lib/api/client.ts`

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',  // httpOnly cookies
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ code: 'UNKNOWN_ERROR' }));
    throw error;
  }
  return res.json() as Promise<T>;
}
```

### Environment variables

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/app/layout.tsx` |
| Create | `apps/web/app/globals.css` |
| Create | `apps/web/app/(marketing)/page.tsx` |
| Create | `apps/web/app/(auth)/login/page.tsx` |
| Create | `apps/web/app/(auth)/register/page.tsx` |
| Create | `apps/web/app/(seller)/admin/page.tsx` |
| Create | `apps/web/app/(customer)/my/page.tsx` |
| Create | `apps/web/lib/api/client.ts` |
| Create | `apps/web/middleware.ts` |
| Create | `apps/web/next.config.ts` |
| Create | `apps/web/tailwind.config.ts` |
| Create | `apps/web/package.json` |
| Create | `apps/web/tsconfig.json` |

---

## مراحل پیاده‌سازی

1. `create-next-app` با App Router، TypeScript، Tailwind
2. `tsconfig.json` که از `@hivork/config/tsconfig.nextjs.json` extends کند
3. Route groups را ایجاد کن — placeholder pages
4. Root layout با `lang="fa" dir="rtl"`
5. Tailwind با RTL logical properties (`ms-`، `me-` نه `ml-`، `mr-`)
6. `lib/api/client.ts` برای API calls
7. `middleware.ts` stub — بعداً در TASK-042 کامل می‌شود
8. `next.config.ts` با `transpilePackages`

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| `NEXT_PUBLIC_API_URL` undefined | fallback به `localhost:4000/api/v1` |
| API response non-ok | Error thrown — page باید error boundary داشته باشد |
| RTL break در component | از `ms-/me-` استفاده کن — از `ml-/mr-` اجتناب کن |
| `@hivork/ui` import fail | `transpilePackages` در next.config لازم است |
| Server Component vs Client Component | fetch: Server؛ interactive: Client |
| 404 در route | Next.js default — بعداً `not-found.tsx` اضافه شود |

---

## UX

- [x] RTL layout (dir="rtl") از root — هیچ LTR hardcode نیست
- [x] Tailwind logical properties برای spacing/margin
- [x] Font Farsi: Vazirmatn یا IRANSans (بعداً در Phase 1)
- [x] Loading states: placeholder pages با skeleton (Phase 1)
- [x] Error boundary: (بعداً در Phase 1)

---

## تست

```bash
# Browser → localhost:3000
# بررسی کن: dir=rtl در html tag
# Route: /login, /admin, /my همه 200 برمی‌گردانند
```

---

## ممنوعیت‌ها

- Pages Router (فقط App Router)
- Business logic در page components
- `ml-/mr-` برای spacing (از RTL logical properties استفاده کن)

---

## Policy Alignment

- [x] ADR-002 — web فقط presentation
- [x] EXCELLENCE-STANDARDS §7 — route groups، RTL، empty states placeholder
- [x] `.cursor/rules/05-frontend-nextjs.mdc` — App Router، RTL، no business logic
- [x] SOFT-DELETE-POLICY — N/A (UI skeleton)

---

## مراجع

- `docs/05-channels/channels-strategy.md`
- `.cursor/rules/05-frontend-nextjs.mdc`
- `docs/04-technology/tech-stack.md` § Frontend

---

## Self-Review Score

| محور | /امتیاز | یادداشت |
|------|---------|---------|
| Metadata (10) | 10/10 | همه فیلدها |
| Completeness (25) | 25/25 | AC testable، structure کامل، code patterns |
| Policy (25) | 25/25 | RTL explicit، no business logic |
| Executability (25) | 25/25 | Edge cases، steps، UX |
| Alignment (15) | 15/15 | Sync با channels-strategy + rules |
| **جمع** | **100/100** | ✅ Ready |
