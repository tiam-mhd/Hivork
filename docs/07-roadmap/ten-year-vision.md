# چشم‌انداز ۱۰ ساله

## مسیر تکامل پلتفرم

```
سال ۱–۲                سال ۳–۵                 سال ۵–۱۰
─────────              ─────────               ──────────
Modular Monolith   →   Platform + APIs     →   Fintech-adjacent
Installments MVP       Payment gateway         Regional expansion
Telegram + Bale        POS integration         ML credit scoring
Web + PWA              White-label             Open banking (if available)
10–500 tenants         500–5000 tenants        5000+ tenants
```

---

## سال ۱–۲: Product-Market Fit

### Product

- ماژول اقساط production-ready
- RBAC + multi-branch
- Telegram + Bale + PWA
- Import Excel، گزارش معوقات
- Subscription billing (manual → درگاه)

### Business

- ۱۰ pilot → ۵۰ paying tenants
- ۲–۳ vertical focus (موبایل، پوشاک، لوازم خانگی)
- Case studies + word of mouth

### Technical

- Modular Monolith stable
- 99.5% uptime target
- Backup/restore tested monthly
- Sentry + structured logs

### Team (when needed)

- 1–2 fullstack (you + AI)
- 1 support part-time (when > 30 tenants)

---

## سال ۲–۳: Monetization Scale

### Product Additions

| Feature | Value |
|---------|-------|
| Payment gateway | پرداخت آنلاین قسط |
| SMS fallback | reliability |
| POS API | sync فروش |
| Branch analytics | multi-store |
| Credit profile v2 | risk scoring basic |
| Export PDF/Excel advanced | enterprise |

### New Module (optional)

- **Digital Menu** — if team capacity (original project #2)

### Technical Evolution

- Extract **notification service** (if queue > 100k/day)
- PostgreSQL read replica
- Feature flags (Unleash)
- API `/v2` if breaking changes

### Business

- 500 paying tenants
- Partner channel (POS vendors, accountants)
- Pro + Enterprise tiers

---

## سال ۳–۵: Platform

### Product

- **White-label** for brands/chains
- **Public API** for integrators
- **Marketplace** (optional): credit data B2B (with consent)
- Module: CRM, Analytics
- Mobile seller app (if not done)

### Technical

- Event bus (Redis Streams → Kafka if needed)
- Data warehouse (analytics)
- Meilisearch
- Multi-region within Iran (if Arvan regions)

### Business

- 5000 tenants
- Revenue: subscription + transaction fee (payment)
- Small sales team (3–5)

---

## سال ۵–۱۰: Infrastructure Layer

### Vision

Hivork becomes **trust & liquidity infrastructure** for Iranian retail:

- Credit scoring across tenants (with customer consent)
- Embedded finance partnerships
- Regional: Afghanistan, Iraq (similar installment culture)
- Open API ecosystem

### Technical

- Microservices where proven necessary
- ML models for default prediction
- Compliance framework (if regulations evolve)

---

## Architecture Evolution Map

| Component | Year 1 | Year 3 | Year 5+ |
|-----------|--------|--------|---------|
| API | Monolith | Monolith + extracted workers | Selected services |
| DB | Single PG | PG + replica | Sharded? (if massive) |
| Queue | BullMQ/Redis | Redis cluster | Kafka? |
| Search | PG FTS | Meilisearch | Elastic? |
| Mobile | PWA | PWA + Flutter seller | Full if needed |
| Auth | OTP + JWT | + 2FA admin | SSO enterprise |

---

## Risks Over 10 Years

| Risk | Mitigation |
|------|------------|
| Telegram policy change | Multi-channel from day 1 |
| Competitor copy | Depth (RBAC, audit, reports) + support |
| Regulation (fintech) | Stay «management tool» until legal clear |
| Economic collapse | Low price tier, essential tool positioning |
| Technical debt | Clean Architecture, module boundaries |
| Key person dependency | Docs (this!), modular code |

---

## Success Metrics

### Year 1

| Metric | Target |
|--------|--------|
| Paying tenants | 30+ |
| MRR | sustainable |
| Churn monthly | < 5% |
| Reminders delivered | > 98% |
| NPS ( sellers ) | > 40 |

### Year 3

| Metric | Target |
|--------|--------|
| Paying tenants | 500+ |
| Modules active | 2+ |
| API partners | 5+ |

---

## What NOT to Build (Discipline)

Even with 10-year vision, avoid premature:

- Microservices before 50k req/day
- Kubernetes before ops team
- Blockchain anything
- Generic workflow engine
- Custom ERP
- AI features without data

**Focus:** depth in installments → expand module by module.
