# Branching Strategy — Hivork

> **Status:** Approved — v1.0  
> **Version:** 1.0 — 1405/04/08  
> **Related:** [CODE-REVIEW-GUIDE.md](./CODE-REVIEW-GUIDE.md) · [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md)

---

## 1. Branch Model

Hivork uses a **trunk-based development** model with short-lived feature branches.

```
main (production)
  ↑ merge via PR
feature/xxx   ← short-lived: < 3 days
fix/xxx       ← short-lived: < 1 day
chore/xxx     ← tooling, dependencies, docs
```

### Core Branches

| Branch | Description | Protected | Deploy |
|--------|-------------|-----------|--------|
| `main` | Production-ready code | ✅ | → production (manual) |
| `staging` | Pre-production (optional) | ✅ | → staging (auto) |

**No `develop` branch** — merge directly to `main` via PR when ready.

---

## 2. Branch Naming Convention

```
{type}/{scope}-{short-description}
```

### Types

| Type | When to Use | Example |
|------|-------------|---------|
| `feature` | New feature | `feature/installments-waive-api` |
| `fix` | Bug fix | `fix/installment-overdue-timezone` |
| `chore` | Tooling, deps, CI | `chore/upgrade-prisma-5` |
| `docs` | Documentation only | `docs/add-rbac-guide` |
| `refactor` | Code restructure (no behavior change) | `refactor/sale-repo-cursor-pagination` |
| `test` | Tests only | `test/cross-tenant-isolation` |
| `hotfix` | Emergency production fix | `hotfix/payment-confirm-race-condition` |

### Rules

- **Lowercase** — no capital letters
- **Hyphens** — not underscores or spaces
- **Max 50 characters** total
- **Include scope** — which module/area: `installments`, `auth`, `rbac`, `bot`

### Examples

```
feature/installments-create-sale
feature/auth-otp-rate-limit
fix/installments-sum-invariant-bigint
fix/rbac-deny-override-missing
chore/add-testcontainers-setup
docs/add-business-rules-document
refactor/sale-repository-multi-tenant
test/payment-flow-e2e
hotfix/overdue-job-tehran-timezone
```

---

## 3. Commit Message Format

Follow **Conventional Commits** standard:

```
{type}({scope}): {short description}

{optional body}

{optional footer}
```

### Types

| Type | When | Changelog |
|------|------|-----------|
| `feat` | New feature | ✅ MINOR |
| `fix` | Bug fix | ✅ PATCH |
| `chore` | Build, deps, CI | ❌ |
| `docs` | Documentation | ❌ |
| `refactor` | Restructure, no behavior change | ❌ |
| `test` | Test-only changes | ❌ |
| `perf` | Performance improvement | ✅ PATCH |
| `ci` | CI pipeline changes | ❌ |
| `style` | Formatting, no logic change | ❌ |

### Scopes

```
installments    ← installments module
auth            ← authentication
rbac            ← role/permission system
bot             ← telegram/bale bot
tenant          ← tenant management
customer        ← customer management
infra           ← infrastructure layer
api             ← API layer
web             ← frontend
scheduler       ← cron jobs/workers
```

### Examples

```bash
feat(installments): add waive installment use case with audit

fix(installments): correct BigInt remainder distribution in calculator
# Remainder was being added to the last installment instead of first

feat(auth): add OTP rate limiting (3 requests per minute per phone)

fix(rbac): user DENY override not overriding role GRANT permission
# Closes #123

chore(ci): add soft-delete grep check to CI pipeline

docs(installments): add complete business rules document
```

### Breaking Changes

```bash
feat(api)!: change sale create response to include installment array

BREAKING CHANGE: /api/v1/sales POST response now includes `installments[]`
instead of just `saleId`. Update clients accordingly.
```

---

## 4. PR Process

### Step-by-Step

```
1. Create branch from main
   git checkout main && git pull
   git checkout -b feature/installments-waive-api

2. Develop + commit frequently (small commits)
   git commit -m "feat(installments): add waive domain method"
   git commit -m "feat(installments): add waive use case"
   git commit -m "feat(installments): add waive integration test"
   git commit -m "feat(installments): add waive API endpoint"

3. Keep branch up-to-date
   git fetch origin && git rebase origin/main
   (rebase preferred over merge to keep history clean)

4. Push and open PR
   git push -u origin feature/installments-waive-api
   gh pr create --title "feat(installments): waive installment" --body "..."

5. CI checks must pass
   - lint, typecheck, unit tests, integration tests, coverage

6. Get required approvals (see CODE-REVIEW-GUIDE.md §7)

7. Squash and merge (default)
   - One clean commit per PR on main

8. Delete branch after merge
```

---

## 5. PR Template

```markdown
## Summary

What does this PR do? (2-3 sentences)

## Type

- [ ] Feature
- [ ] Bug Fix
- [ ] Refactor
- [ ] Docs
- [ ] Chore

## Related Issue / Task

TASK-XXX or #issue

## Changes

- List of key changes

## Test Plan

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] RBAC tests: allow + deny + cross-tenant
- [ ] Manual test steps: [describe]

## Self-Review Checklist

- [ ] No business logic in controller/handler
- [ ] tenantId from JWT only
- [ ] No prisma.*.delete() on business entities
- [ ] Financial amounts as bigint Rial
- [ ] AuditLog written for sensitive actions
- [ ] No console.log in production code
- [ ] No secrets committed
- [ ] EXCELLENCE-STANDARDS §9 checked
- [ ] pnpm lint && pnpm typecheck pass

## Breaking Changes

None / Describe breaking change

## Screenshots (UI changes)

[Add screenshots if applicable]
```

---

## 6. Hotfix Process

For urgent production fixes:

```
1. Branch from main (NOT from feature branch)
   git checkout main && git pull
   git checkout -b hotfix/payment-confirm-race

2. Make the minimal fix

3. Write regression test FIRST (financial bugs)
   git commit -m "test(installments): add regression for confirm race condition"
   git commit -m "fix(installments): prevent duplicate payment confirmation"

4. Open PR → expedited review (1 approval)

5. Merge to main

6. Deploy immediately (no manual approve gate for production hotfix)

7. Post-review: full review within 24h
```

---

## 7. Release Process

Hivork uses **continuous delivery** — every PR merged to `main` is potentially shippable.

```
main merge
    ↓ CI passes
    ↓ Docker image built + tagged (git SHA)
    ↓ Auto-deploy to staging
    ↓ Smoke tests (automated)
    ↓ Manual approve by lead (production gate)
    ↓ Deploy to production
    ↓ Monitor (15 minutes)
```

### Version Tags

```
v{MAJOR}.{MINOR}.{PATCH}
```

- MAJOR: breaking API change
- MINOR: new feature
- PATCH: bug fix

Tags are created on production deploys, not on every commit.

---

## 8. Git Configuration Requirements

```bash
# Required global config
git config --global pull.rebase true    # rebase instead of merge
git config --global push.default current

# Commit signing (recommended)
git config --global commit.gpgsign true
```

### .gitignore Must Include

```
.env
.env.local
.env.production
*.pem
*.key
node_modules/
dist/
.turbo/
```

---

## 9. Do's and Don'ts

### Do ✅
- One concern per PR
- Small, frequent commits with clear messages
- Rebase onto main before opening PR
- Delete branch after merge
- Write test before fixing a bug
- Write the regression test in the same PR as the fix

### Don't ❌
- Commit directly to `main` or `staging`
- Mix refactor + feature in same PR
- Leave branches open for >3 days without update
- Force-push to shared branches
- Commit `.env` files or secrets
- Use `git merge` (use `git rebase`)
- Leave `console.log` statements in committed code
- Merge without CI passing

---

*Version 1.0 — 1405/04/08*
