# Epic-08 — Core Services

## Tasks

| ID | فایل | Priority | Depends | Blocks |
|----|------|----------|---------|--------|
| 047 | TASK-047-service-audit-log | P0 | 024, 012 | 054, 056 |
| 048 | TASK-048-service-settings | P0 | 025, 016 | — |
| 049 | TASK-049-service-module-registry | P0 | 016, 059 | 044 |
| 050 | TASK-050-service-outbox | P0 | 026, 009 | — |
| 056 | TASK-056-soft-delete-restore-use-cases | P0 | 046, 047 | 054 |
| 057 | TASK-057-register-tenant-use-case | P0 | 029, 030, 031, 028, 055 | 054 |
| 058 | TASK-058-create-tenant-customer-use-case | P0 | 032, 033, 046 | 054 |

## Policy
- TASK-056: actions audit `entity.soft_delete`, `entity.restore`
