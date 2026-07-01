# Epic-02 — Installments Database

## هدف Epic

تعریف Prisma schema برای `Sale`، `Installment`، `PaymentAttempt` با base fields کامل، indexes، FK Restrict، و migration واحد — پایه persistence برای domain و use cases.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| TASK-061 | [TASK-061-prisma-sale.md](./TASK-061-prisma-sale.md) | Prisma Schema — Sale | TASK-060 | P0 |
| TASK-062 | [TASK-062-prisma-installment.md](./TASK-062-prisma-installment.md) | Prisma Schema — Installment | TASK-061 | P0 |
| TASK-063 | [TASK-063-prisma-payment-attempt.md](./TASK-063-prisma-payment-attempt.md) | Prisma Schema — PaymentAttempt | TASK-062 | P0 |
| TASK-064 | [TASK-064-prisma-installments-migration.md](./TASK-064-prisma-installments-migration.md) | Installments Migration & Validate | TASK-063 | P0 |

---

## Dependency داخلی Epic

```
TASK-060
    │
    ▼
TASK-061 (Sale)
    │
    ▼
TASK-062 (Installment)
    │
    ▼
TASK-063 (PaymentAttempt)
    │
    ▼
TASK-064 (migration)
    │
    ▼
Epic-03 Domain
```

---

## Policy notes

- **EXCELLENCE §2.1** — base fields روی Sale و PaymentAttempt
- **Installment:** فیلدهای soft delete در schema (استاندارد) — **اما domain/use case هرگز delete نمی‌کند** (BR-016، ADR-013)
- **Sale:** لغو = `status=CANCELLED`؛ soft delete فقط اگر **هیچ** قسط `paid` نباشد (SOFT-DELETE-POLICY §5)
- `onDelete: Restrict` — **نه Cascade**
- `BigInt` برای تمام مبالغ ریال (ADR-007)
- `branchId NOT NULL` روی Sale (ADR-015)

---

## Migration (TASK-064)

| فیلد | مقدار |
|------|--------|
| نام | `20260629213000_installments_module` |
| جداول | `sales`, `installments`, `payment_attempts` |
| Enums | `sale_status`, `installment_status`, `reported_by_type`, `payment_attempt_status` |

```bash
pnpm db:validate
pnpm db:migrate:deploy   # fresh DB / CI
pnpm db:migrate          # local dev
pnpm exec prisma db seed # optional smoke: demo sale + 3 installments
```

### Rollback (manual — Prisma has no down migrations)

Dev only — **never** in staging/production without ADR:

```bash
# Drop installments module objects (reverse order)
psql $DATABASE_URL -c 'DROP TABLE IF EXISTS "payment_attempts" CASCADE;'
psql $DATABASE_URL -c 'DROP TABLE IF EXISTS "installments" CASCADE;'
psql $DATABASE_URL -c 'DROP TABLE IF EXISTS "sales" CASCADE;'
psql $DATABASE_URL -c 'DROP TYPE IF EXISTS "payment_attempt_status";'
psql $DATABASE_URL -c 'DROP TYPE IF EXISTS "reported_by_type";'
psql $DATABASE_URL -c 'DROP TYPE IF EXISTS "installment_status";'
psql $DATABASE_URL -c 'DROP TYPE IF EXISTS "sale_status";'
# Remove migration row from _prisma_migrations
psql $DATABASE_URL -c "DELETE FROM _prisma_migrations WHERE migration_name = '20260629213000_installments_module';"
```

---

## مراجع

- `docs/03-modules/installments/domain.md`
- `docs/09-development/EXCELLENCE-STANDARDS.md` §2, §8
- `docs/09-development/SOFT-DELETE-POLICY.md` §5
