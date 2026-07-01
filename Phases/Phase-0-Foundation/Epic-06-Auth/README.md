# Epic-06 — Auth

## Tasks

| ID | فایل | Priority | Depends | Blocks |
|----|------|----------|---------|--------|
| 035 | TASK-035-auth-otp-request | P0 | 006, 012, 013, 051 | 036 |
| 036 | TASK-036-auth-otp-verify | P0 | 035, 037, 055, 051 | 054 |
| 037 | TASK-037-auth-jwt-tokens | P0 | 005, 006 | 036, 038 |
| 038 | TASK-038-auth-actor-separation | P0 | 037 | 041, 054 |
| 039 | TASK-039-auth-phone-normalize | P0 | 013 | 035, 033 |
| 040 | TASK-040-auth-otp-rate-limit | P0 | 002, 035 | — |
| 055 | TASK-055-onboarding-auth-flow | P0 | 035–038 | 054, 057 |

## Policy
- TASK-055: flow واحد — بدون تناقض register/verify (مراجع اصلی flow)
