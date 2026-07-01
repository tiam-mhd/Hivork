# Epic-02-SMS-Panel — SMS Panel

> **Phase:** 08 — Notifications & Automation  
> **وضعیت:** Ready for implementation  
> **منبع محصول:** `docs/01-product/installment-module-features.md`

---

## هدف Epic

پنل پیامک: خطوط، قالب‌ها، اعتبار، تاریخچه، الگوها.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| 143 | [IFP-TASK-143-sms-lines-credit.md](./IFP-TASK-143-sms-lines-credit.md) | SMS — Lines & Credit Management | IFP-TASK-139 | P0 |
| 144 | [IFP-TASK-144-sms-templates-patterns.md](./IFP-TASK-144-sms-templates-patterns.md) | SMS — Templates & Provider Patterns | IFP-TASK-143 | P0 |
| 145 | [IFP-TASK-145-sms-panel-api-history.md](./IFP-TASK-145-sms-panel-api-history.md) | API — SMS Panel & Send History | IFP-TASK-143, IFP-TASK-144 | P0 |

---

## Dependency Graph

```mermaid
flowchart TD
  T143[IFP-143]
  T144[IFP-144]
  T145[IFP-145]
```

---

## Policy Notes

| موضوع | قانون |
|-------|--------|
| Credit | bigint balance — deduct per send |
| Provider | adapter pattern |

---

## مراجع

- `docs/01-product/installment-module-features.md §17`
