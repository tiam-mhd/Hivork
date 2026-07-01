# IFP-TASK-141: Templates & Scheduling

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 08 � Notifications & Automation |
| Epic | Epic-01-Notification-Core |
| ID | IFP-TASK-141 |
| Priority | P0 |
| Depends on | IFP-TASK-139 |
| Blocks | IFP-TASK-142, IFP-TASK-153 |
| Estimated | 8h |

---

## هدف

قالب‌های اعلان چندکاناله و زمان‌بندی ارسال.

---

## معیار پذیرش

- [ ] NotificationTemplate model — channel, body, variables[], locale
- [ ] Handlebars/Mustache variable substitution
- [ ] Schedule: scheduledAt + BullMQ delayed job
- [ ] CRUD API with soft delete + restore

---

## مشخصات فنی

### Template Variables

`{{customerName}}`, `{{installmentAmount}}`, `{{dueDate}}` — validated against whitelist

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/infrastructure/persistence/prisma/schema/notification-template.prisma` |
| Create | `packages/application/notifications/manage-templates.use-case.ts` |

---

## مراحل پیاده‌سازی

1. Template model
2. Render engine
3. Scheduler job
4. CRUD API

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Missing variable | 400 | TEMPLATE_RENDER_ERROR |
| Schedule in past | 400 | INVALID_SCHEDULE |

---

## تست

- [ ] Unit: template render
- [ ] Integration: schedule send

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §8 base fields روی entityهای business
- [ ] SOFT-DELETE-POLICY — soft delete فقط؛ بدون `prisma.*.delete()`
- [ ] Audit on template change

---

## مراجع

- `docs/01-product/installment-module-features.md §8`

---

## Self-Review Score

> مبنا: `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md` §10

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata (ID, Priority, Depends, Blocks, Estimate) | /10 | 10 | Complete |
| Completeness (criteria, spec بدون TODO، files table) | /25 | 25 | Measurable AC |
| Policy (EXCELLENCE §8، soft delete، ADR cited) | /25 | 25 | Policies cited |
| Executability (edge cases، tests، dev بدون سؤال) | /25 | 24 | Edge cases + tests |
| Alignment (sync docs، contracts، Epic README) | /15 | 14 | Epic sync |
| **جمع** | **/100** | **98** | ≥95 required برای Ready |
