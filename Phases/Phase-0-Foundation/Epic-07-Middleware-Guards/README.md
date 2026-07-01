# Epic-07 — Middleware & Guards

## Tasks

| ID | فایل | Priority | Depends | Blocks |
|----|------|----------|---------|--------|
| 041 | TASK-041-guard-tenant-context | P0 | 038, 020 | 042, 046, 054 |
| 042 | TASK-042-guard-auth | P0 | 038 | 043 |
| 043 | TASK-043-guard-permission | P0 | 034, 042, 021 | 054 |
| 044 | TASK-044-guard-module-entitlement | P0 | 029, 047, 059 | — |
| 045 | TASK-045-guard-data-scope | P0 | 031, 043 | 046 |
| 046 | TASK-046-prisma-tenant-extension | P0 | 041, 012 | 054, 056 |

## Policy
- TASK-046: tenant extension + soft-delete extension (ADR-013)
