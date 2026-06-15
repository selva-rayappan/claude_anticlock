# Project Context

## What is OpsNext?

OpsNext is a **cloud-native, multi-tenant CRM SaaS platform** targeting SMB-to-mid-market organisations. It manages contacts, accounts, leads, opportunities, pipelines, and workflows across fully isolated customer tenants on shared infrastructure.

---

## Strategic Goals

| # | Goal | KPI |
|---|------|-----|
| G-01 | Accelerate sales pipeline visibility | Reduce deal review time by 40% |
| G-02 | Centralise customer interaction history | 100% interaction capture rate |
| G-03 | Enable no-code workflow automation | 60% of routine tasks automated |
| G-04 | Support multi-tenant SaaS model | Onboard new tenant < 10 minutes |
| G-05 | Interoperate with existing toolchains | Zero data re-entry across integrated tools |

---

## Stakeholders

| Role | Primary Concern |
|------|-----------------|
| Tenant Administrator | Isolation, configurability |
| Sales Representative | Usability, mobile access |
| Sales Manager | Visibility, forecasting |
| Marketing Team | Segmentation, integrations |
| IT / Platform Admin | Security, uptime, compliance |
| Finance / Billing | Usage metrics, invoicing |

---

## Tenancy Model

- **Schema-per-tenant** on a shared PostgreSQL cluster
- Platform schema (`public`): `Tenant`, `TenantConfig`, `TenantSubscription`, `TenantUsageMetrics`, `PlatformAdmin`
- Tenant schema (`tenant_{slug}`): all CRM data — `User`, `Contact`, `Account`, `Lead`, `Opportunity`, `Pipeline`, `Activity`, `Task`, `Workflow`, `AuditLog`, etc.
- Application middleware sets `search_path = tenant_{slug}` on every request from the JWT `tenantId` claim

---

## Subscription Tiers

| Tier | API Rate Limit | Target Customer |
|------|---------------|-----------------|
| Basic | 500 req/min | Startups, solo sellers |
| Professional | 2,000 req/min | SMB teams |
| Enterprise | 5,000 req/min | Mid-market orgs |

---

## Scale Targets

| Phase | Tenants | Records/Tenant | API req/sec |
|-------|---------|----------------|-------------|
| Phase 1 (0–6 months) | 500 | < 100K | 500 |
| Phase 2 (6–18 months) | 5,000 | < 1M | 5,000 |
| Phase 3 (18 months+) | 10,000+ | < 10M | 50,000+ |

---

## Current Execution Phase

**Phase 1 — Monorepo, CI/CD & Infrastructure Bootstrap** (in progress)

Phases completed: **Phase 0** (Technical Architecture & Foundation Documents)

Next phase gate: Phase 1 must be reviewed running on localhost before Phase 2 begins.

Full phase plan: [`docs/EXECUTION_PLAN.md`](../docs/EXECUTION_PLAN.md)

---

## External Integrations Roadmap

| Integration | Phase |
|-------------|-------|
| Microsoft Excel (import/export/Add-in) | Phase 2 |
| Microsoft PowerApps Connector | Phase 2 |
| Zoho CRM (migration + sync) | Phase 2 |
| Salesforce (migration + sync) | Phase 2 |
| Google Calendar / Gmail | Phase 2 |
| Microsoft 365 Calendar / Outlook | Phase 2 |
| Slack / Microsoft Teams alerts | Phase 3 |

---

## Compliance & Legal Constraints

- GDPR: EU tenant data must be stored in EU regions
- CCPA: California data handling compliance
- SOC 2 Type II: evidence collection required (access logs, change logs, user provisioning)
- WCAG 2.1 AA: frontend accessibility minimum
- OWASP Top 10: penetration test required before GA
