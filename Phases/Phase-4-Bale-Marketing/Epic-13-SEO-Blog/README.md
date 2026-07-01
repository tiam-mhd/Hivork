# Epic-13 — SEO & Blog Shell

## هدف Epic

Meta tags، sitemap/robots، و shell بلاگ (P1).

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| TASK-166 | [TASK-166-seo-meta.md](./TASK-166-seo-meta.md) | SEO Meta Tags | TASK-160 | P1 |
| TASK-167 | [TASK-167-sitemap-robots.md](./TASK-167-sitemap-robots.md) | Sitemap & robots.txt | TASK-166 | P1 |
| TASK-168 | [TASK-168-blog-shell.md](./TASK-168-blog-shell.md) | Blog Shell (empty) | TASK-159 | P1 |

---

## Dependency داخلی Epic

```
TASK-160
    │
    ▼
TASK-166 (meta)
    │
    ▼
TASK-167 (sitemap)

TASK-159 → TASK-168 (blog shell)
```

---

## Policy notes

- Next.js Metadata API
- `noindex` on `/admin`
- Blog posts deferred — shell only

---

## مراجع

- `Phases/Phase-4-Bale-Marketing/README.md`
- `docs/05-channels/bale-api-reference.md`
- `docs/05-channels/notifications.md`
- `docs/05-channels/channels-strategy.md`
- `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md`
