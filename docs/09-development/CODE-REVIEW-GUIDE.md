# Code Review Guide — Hivork

> **Status:** Approved — v1.0  
> **Version:** 1.0 — 1405/04/08  
> **Audience:** All developers  
> **Related:** [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md) · [BRANCHING-STRATEGY.md](./BRANCHING-STRATEGY.md) · [EXCELLENCE-STANDARDS.md](./EXCELLENCE-STANDARDS.md)

---

## 1. Philosophy

Code review at Hivork is a **quality gate**, not a blame session. Every review should:

- Protect financial data integrity
- Ensure multi-tenant isolation
- Maintain architectural invariants
- Catch security issues before production
- Share knowledge across the team

**Rule:** The reviewer is responsible for approving quality code — not just reading it.

---

## 2. PR Size Guidelines

| PR Type | Max Lines Changed | Notes |
|---------|-------------------|-------|
| Feature (new) | 500 | Split by layer if larger |
| Bug fix | 200 | Include regression test |
| Refactor | 300 | No behavior change |
| Migration | 150 | Schema only, no logic |
| Docs | No limit | — |

**One concern per PR** — no drive-by refactoring.

---

## 3. PR Author Checklist (before requesting review)

```markdown
## Self-review Checklist

### Architecture
- [ ] No business logic in Controller / Bot Handler / React component
- [ ] Domain logic only in `packages/domain/`
- [ ] Use Cases only in `packages/application/`
- [ ] Repository: every tenant-scoped query has `tenantId` filter
- [ ] No direct entity import from Module A into Module B

### Security
- [ ] `tenantId` from JWT only — never from client body
- [ ] Permission guard on every sensitive endpoint
- [ ] No PII in log messages
- [ ] No secrets committed (check with `git diff` for env values)

### Data Integrity
- [ ] No `prisma.*.delete()` on business entities — soft delete only
- [ ] Financial amounts: `bigint` Rial — no `number` or `float`
- [ ] Soft delete: `deletedAt` + `deletedById` updated together
- [ ] `AuditLog` written for every sensitive action

### Testing
- [ ] Domain rule change → unit test added
- [ ] Use case change → integration test added
- [ ] New permission endpoint → RBAC test (allow + deny + cross-tenant)
- [ ] Bug fix → regression test written BEFORE fix
- [ ] Coverage thresholds still pass: `pnpm test:coverage`

### Code Quality
- [ ] TypeScript `strict: true` — no `any` (use `unknown` + narrow)
- [ ] No `console.log` in production code paths
- [ ] Zod schemas updated in `packages/contracts` if API changed
- [ ] Prisma schema aligned with EXCELLENCE-STANDARDS §2 (base fields)
- [ ] `deletedAt: null` in all default Prisma queries

### Documentation
- [ ] EXCELLENCE-STANDARDS.md §9 checklist completed
- [ ] New doc → linked in `docs/README.md`
- [ ] ADR written if architecture decision made
- [ ] `.env.example` updated for new environment variables

### CI
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test:unit` passes
- [ ] `pnpm test:integration` passes
```

---

## 4. Reviewer Checklist

### 4.1 Architecture & Invariants

```markdown
□ Domain logic only in packages/domain/ — not in controller or bot
□ Use case orchestrates — does not contain business rules
□ Repository appends tenantId to every query
□ No module boundary violation (module A importing module B entities)
□ Events for cross-module side effects — not direct method calls
□ Settings vs Invariants distinction: invariants in domain code only
```

### 4.2 Security & Multi-Tenancy

```markdown
□ tenantId source: JWT claim only — not client-supplied
□ Every sensitive endpoint has: @RequireAuth + @RequirePermission + @ApplyDataScope
□ cross-tenant returns 404 (not 403) to prevent leakage
□ Branch access: staff's effectiveBranchIds checked for sale/installment operations
□ Customer token cannot access staff endpoints (separate actors)
□ No PII in structured logs (phone numbers, names in plain text)
```

### 4.3 Financial Logic

```markdown
□ All money: BigInt (Rial) — reject any number/float for financial fields
□ Installment sum invariant: sum(installments) + downPayment === totalAmount
□ Remainder distribution: to first installments, not arbitrary
□ No float arithmetic at any point in financial calculation
□ Atomic transactions: payment confirm = { attempt.confirmed + installment.paid + auditLog + outboxEvent }
```

### 4.4 Data Integrity

```markdown
□ No prisma.*.delete() on business entities — grep the diff
□ Soft delete: deletedAt AND deletedById updated atomically
□ AuditLog: written for sale.create, sale.cancel, payment.confirm, payment.reject, installment.waive
□ OutboxEvent: written atomically with business entity change
□ OutboxEvent handlers: idempotent (safe to re-run on failure)
□ Terminal states (paid, waived): verified no further transitions exist
```

### 4.5 Testing

```markdown
□ Unit test for every new domain rule (packages/domain tests)
□ Integration test for every use case change (Testcontainers)
□ RBAC test: at least allow + deny + cross-tenant for new endpoints
□ Financial bug regression test written BEFORE fix
□ Test factories used (not hardcoded data in test files)
□ Test coverage thresholds maintained
```

### 4.6 API Contract

```markdown
□ Zod schemas in packages/contracts updated
□ OpenAPI spec regenerated (if applicable)
□ Breaking change → new version path /v2/... (ADR-016)
□ No breaking change without deprecation notice in ADR
□ Response shape consistent with existing patterns
□ Cursor pagination for all list endpoints
```

---

## 5. Red Flags — Block the PR

These are **automatic blocks** — must be fixed before merge:

| Red Flag | Why |
|----------|-----|
| `prisma.*.delete()` on Sale, Installment, PaymentAttempt, Customer, Staff | Data loss — no exceptions |
| `number` or `float` for financial amount | Precision loss — use `bigint` |
| Missing `tenantId` in a query that joins tenant data | Data leakage between tenants |
| Business logic in NestJS Controller | Violates clean architecture |
| Permission guard missing on staff endpoint | Security vulnerability |
| `console.log` in production code | Structured logging required |
| Hardcoded secrets or credentials | Security violation |
| `any` type without `// eslint-disable` comment + justification | TypeScript strict violation |
| Missing test for financial bug fix | Quality gate |
| ADR missing for new architecture decision | Documentation requirement |

---

## 6. Yellow Flags — Request Changes

These require discussion or justification:

| Yellow Flag | Discussion |
|------------|-----------|
| >500 lines in a single PR | Consider splitting |
| Use case >50 lines | Consider extracting domain service |
| Test file without assertion on negative case | Add deny/error case |
| `metadata: Json` field used for business logic | Should it be a proper column? |
| Memoized component with financial calculation | Move logic to hook/service |
| `@ts-ignore` | Understand root cause |
| Missing loading/error/empty states in UI | EXCELLENCE-STANDARDS requirement |

---

## 7. Review Process

### Timeline

| Stage | Time |
|-------|------|
| First review response | Within 24h (business days) |
| Re-review after changes | Within 12h |
| Merge after approval | Author's responsibility |

### Approval Requirements

| PR Type | Required Approvals |
|---------|-------------------|
| Domain / financial logic | 2 approvals (1 must be senior) |
| Use case | 1 approval |
| Infrastructure / DB migration | 2 approvals |
| Frontend (UI only) | 1 approval |
| Docs only | 1 approval |
| Emergency hotfix | 1 approval + post-review |

---

## 8. Constructive Feedback Format

### Comment Prefixes

Use these prefixes to communicate priority:

```
[BLOCK] This must be fixed before merge — financial data risk
[CHANGE] This needs to be changed — important
[SUGGEST] This could be improved — optional
[QUESTION] I don't understand this — please explain
[NITPICK] Very minor — style preference
[PRAISE] Good job — acknowledge good work
```

### Examples

```
[BLOCK] prisma.sale.delete() is called here — this is a hard delete on business data.
Replace with: await this.prisma.sale.update({ where: { id }, data: { deletedAt: new Date(), deletedById: staffId } })

[CHANGE] tenantId is read from req.body here — it must come from JWT (ctx.tenantId).
Security issue: malicious client could supply a different tenantId.

[SUGGEST] Consider extracting installment calculation into a domain service for reusability.

[QUESTION] Why is this using setTimeout instead of BullMQ delayed job?
Our standard for async operations is the Outbox pattern.

[NITPICK] Variable name `d` could be more descriptive — `dueDate` would be clearer.
```

---

## 9. Domain-Specific Review Patterns

### Reviewing a New Use Case

```typescript
// ✅ Good use case pattern
export class CreateSaleUseCase {
  async execute(cmd: CreateSaleCommand, ctx: TenantContext): Promise<CreateSaleResult> {
    // 1. validate inputs (Zod already done at controller level)
    // 2. check access (branch belongs to tenant, staff has access)
    const branch = await this.branchRepo.findById(cmd.branchId, ctx.tenantId);
    if (!branch || !ctx.assignedBranchIds.includes(cmd.branchId)) {
      throw new DomainError('BRANCH_ACCESS_DENIED');
    }

    // 3. find/validate related entities
    const customer = await this.customerRepo.findById(cmd.tenantCustomerId, ctx.tenantId);
    if (!customer) throw new DomainError('CUSTOMER_NOT_FOUND');

    // 4. call domain entity (business logic lives HERE)
    const { sale, installments } = Sale.create(cmd);

    // 5. persist atomically (entity + audit + outbox)
    await this.saleRepo.saveWithAudit(sale, installments, ctx);

    return { saleId: sale.id };
  }
}

// ❌ Bad — business logic in use case
export class CreateSaleUseCaseBad {
  async execute(cmd: CreateSaleCommand) {
    if (cmd.totalAmountRial <= 0) throw new Error('invalid'); // domain rule!
    const base = cmd.totalAmountRial / BigInt(cmd.installmentCount); // calculation!
    // ...
  }
}
```

### Reviewing a Repository

```typescript
// ✅ Good — always filter by tenantId
async findBySaleId(saleId: string, tenantId: string) {
  return this.prisma.installment.findMany({
    where: { saleId, tenantId, deletedAt: null },
    orderBy: { sequenceNumber: 'asc' },
  });
}

// ❌ Bad — missing tenantId
async findBySaleId(saleId: string) {
  return this.prisma.installment.findMany({
    where: { saleId }, // tenant data leakage risk!
  });
}
```

---

## 10. Common Mistakes by Layer

| Layer | Common Mistake | Correct |
|-------|---------------|---------|
| Controller | Business logic inline | Move to domain entity |
| Use Case | Domain rules inline | Move to domain entity |
| Domain | DB query | Inject via repository interface |
| Repository | Missing `tenantId` | Always append from context |
| Repository | Hard delete | Soft delete only |
| API | Financial `number` | `bigint` Rial |
| API | `tenantId` from body | From JWT |
| Tests | No negative case | Add deny + cross-tenant test |
| Tests | No regression test for bug | Write test first |

---

*Version 1.0 — 1405/04/08*
