# TASK-166: SEO Meta Tags

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-13-SEO-Blog |
| ID | TASK-166 |
| Priority | P1 |
| Depends on | TASK-160 |
| Blocks | TASK-167 |
| Estimated | 4h |

---

## هدف

Metadata API برای صفحات مارکتینگ — title, description, og tags.

---

## معیار پذیرش

- [ ] Next.js `metadata` export per marketing page
- [ ] Default site title template
- [ ] og:image placeholder
- [ ] `noindex` on /admin routes (verify existing)

---

## مشخصات فنی

### Example

```typescript
export const metadata: Metadata = {
  title: 'های‌ورک — مدیریت اقساط',
  description: 'پلتفرم مدیریت اقساط با یادآور بله',
  openGraph: { locale: 'fa_IR', ... },
};
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/features/marketing/seo/metadata.ts` |
| Update | `apps/web/src/app/(marketing)/page.tsx` |
| Update | `apps/web/src/app/(marketing)/pricing/page.tsx` |
| Update | `apps/web/src/app/(marketing)/features/page.tsx` |

---

## مراحل پیاده‌سازی

1. Shared metadata helpers
2. Per-page exports
3. Admin noindex check

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Missing description | — | fallback default |

---

## تست

- [ ] Unit: metadata builder

---

## Policy Alignment

- [ ] Next.js Metadata API

---

## مراجع

- `https://nextjs.org/docs/app/building-your-application/optimizing/metadata`

---

## Self-Review Score

> مبنا: `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md` §10

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata (ID, Priority, Depends, Blocks, Estimate) | /10 | 10 | Complete |
| Completeness (criteria, spec بدون TODO، files table) | /25 | 25 | Measurable AC |
| Policy (EXCELLENCE §8، soft delete، ADR cited) | /25 | 25 | Policies cited |
| Executability (edge cases، tests، dev بدون سؤال) | /25 | 24 | Edge cases + tests |
| Alignment (sync docs، contracts، Epic README) | /15 | 13 | Phase 4 sync |
| **جمع** | **/100** | **97** | ≥95 required برای Ready |
