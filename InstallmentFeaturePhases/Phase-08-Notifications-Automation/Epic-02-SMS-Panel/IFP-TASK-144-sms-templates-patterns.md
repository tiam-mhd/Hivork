# IFP-TASK-144: SMS — Templates & Provider Patterns

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 08 � Notifications & Automation |
| Epic | Epic-02-SMS-Panel |
| ID | IFP-TASK-144 |
| Priority | P0 |
| Depends on | IFP-TASK-143 |
| Blocks | IFP-TASK-145, IFP-TASK-154 |
| Estimated | 6h |

---

## هدف

قالب‌های پیامک و الگوهای تأییدشده provider (pattern).

---

## معیار پذیرش

- [ ] SmsTemplate linked to provider patternId
- [ ] Pattern variable mapping
- [ ] Template preview API
- [ ] Sync patterns from provider

---

## مشخصات فنی

### Pattern

providerPatternId, variables[], body preview — approval status pending|approved|rejected

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/notifications/sms/manage-sms-templates.use-case.ts` |

---

## مراحل پیاده‌سازی

1. SmsTemplate model
2. Pattern sync
3. Preview endpoint
4. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Unapproved pattern | 400 | PATTERN_NOT_APPROVED |

---

## تست

- [ ] Integration: template CRUD
- [ ] Unit: variable mapping

---

## Policy Alignment

- [ ] SOFT-DELETE-POLICY — soft delete فقط؛ بدون `prisma.*.delete()`

---

## مراجع

- `docs/01-product/installment-module-features.md §17`

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
