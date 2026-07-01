# TASK-155: Settings Schema — Channels

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-09-Channel-Settings |
| ID | TASK-155 |
| Priority | P0 |
| Depends on | TASK-154, TASK-048 |
| Blocks | TASK-156 |
| Estimated | 4h |

---

## هدف

کلیدهای settings برای ترجیحات کانال و یادآور — schema-based only.

---

## معیار پذیرش

- [ ] Keys in `settings.schema.ts`: channels.bale.enabled, reminders.*, dailySummary.enabled
- [ ] Zod validation per EXCELLENCE
- [ ] Default values for new tenants
- [ ] Migration/seed defaults
- [ ] Document in settings docs

---

## مشخصات فنی

### Schema keys

```typescript
channels: {
  bale: { enabled: z.boolean().default(true) },
  sms: { enabled: z.boolean().default(false) },
},
reminders: {
  beforeDueDays: z.array(z.number()).default([3, 1]),
  onDueEnabled: z.boolean().default(true),
  overdueEnabled: z.boolean().default(true),
},
dailySummary: { enabled: z.boolean().default(false) },
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `packages/domain/core/settings/settings.schema.ts` |
| Update | `docs/02-architecture/settings.md` |

---

## مراحل پیاده‌سازی

1. Add channel keys
2. Defaults
3. Validation tests
4. Docs

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Invalid key in API | 400 | reject |
| Free-form JSON | — | forbidden |

---

## تست

- [ ] Unit: schema validation
- [ ] Unit: defaults

---

## Policy Alignment

- [ ] Settings schema only — no free-form
- [ ] EXCELLENCE §8

---

## مراجع

- `docs/02-architecture/settings.md`

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
