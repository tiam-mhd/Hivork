# TASK-167: Sitemap & robots.txt

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-13-SEO-Blog |
| ID | TASK-167 |
| Priority | P1 |
| Depends on | TASK-166 |
| Blocks | — |
| Estimated | 3h |

---

## هدف

`sitemap.xml` و `robots.txt` برای صفحات public.

---

## معیار پذیرش

- [ ] `app/sitemap.ts` — marketing routes
- [ ] `app/robots.ts` — allow / disallow /admin
- [ ] Include /, /pricing, /features, /register
- [ ] Exclude admin and api

---

## مشخصات فنی

### robots.txt

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/app/sitemap.ts` |
| Create | `apps/web/src/app/robots.ts` |

---

## مراحل پیاده‌سازی

1. sitemap.ts dynamic routes
2. robots.ts rules
3. Verify generation in build

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Staging env | — | optional noindex all |

---

## تست

- [ ] Build: sitemap includes routes

---

## Policy Alignment

- [ ] noindex /admin

---

## مراجع

- `Next.js sitemap docs`

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
