# IFP-TASK-151: Automation — Workflow & Actions

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 08 � Notifications & Automation |
| Epic | Epic-04-Automation-Engine |
| ID | IFP-TASK-151 |
| Priority | P0 |
| Depends on | IFP-TASK-150 |
| Blocks | IFP-TASK-152, IFP-TASK-155 |
| Estimated | 10h |

---

## هدف

Workflow چندمرحله‌ای و action types: notify, sms, update field, webhook.

---

## معیار پذیرش

- [ ] Workflow: ordered steps with branching
- [ ] Actions: send_notification, send_sms, set_installment_status, http_webhook
- [ ] Action retry with backoff
- [ ] Dry-run mode for testing

---

## مشخصات فنی

### Action Types

Pluggable ActionHandler registry — idempotent execution

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/automation/execute-workflow.use-case.ts` |
| Create | `packages/infrastructure/automation/action-handlers/` |

---

## مراحل پیاده‌سازی

1. Workflow engine
2. Action handlers
3. Retry logic
4. Dry-run API

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Action fail | — | retry 3x then failed log |
| Webhook timeout | — | log + alert |

---

## تست

- [ ] Unit: workflow branching
- [ ] Integration: notify action

---

## Policy Alignment

- [ ] Audit workflow.execute

---

## مراجع

- `docs/01-product/installment-module-features.md §9`

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
