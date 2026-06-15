# OpsNext CRM — Business Requirements Document (BRD)

**Document Version:** 1.0  
**Status:** Approved  
**Date:** 2026-06-11  
**Classification:** Internal — Confidential

---

## 1. Executive Summary

OpsNext is a cloud-native, multi-tenant CRM SaaS platform designed to streamline sales operations, customer engagement, and pipeline management for organisations of all sizes.

The platform serves multiple tenants (organisations) from shared infrastructure while maintaining strict data isolation, configurable workflows, and tenant-specific customisation — delivering enterprise-grade CRM capability as a self-service SaaS product.

---

## 2. Business Problem

Organisations managing customer relationships across dispersed teams lack a unified, affordable, and extensible CRM that:

- Supports multi-organisation deployment without data leakage
- Integrates natively with existing Microsoft and third-party ecosystems (Excel, PowerApps, Zoho, Salesforce)
- Scales from startup (tens of contacts) to enterprise (millions of records) without re-platforming
- Provides no-code workflow automation accessible to non-technical tenant administrators

---

## 3. Business Goals

| ID | Goal | KPI | Target |
|----|------|-----|--------|
| G-01 | Accelerate sales pipeline visibility | Deal review time | Reduce by 40% |
| G-02 | Centralise customer interaction history | Interaction capture rate | 100% |
| G-03 | Enable no-code workflow automation | Routine tasks automated | 60% |
| G-04 | Support multi-tenant SaaS model | Tenant onboarding time | < 10 minutes |
| G-05 | Interoperate with existing toolchains | Data re-entry across integrated tools | Zero |

---

## 4. Target Market

### Primary Segment: SMB / Mid-Market

- Organisations with 10–500 employees
- Active sales teams (5–50 reps) managing B2B pipelines
- Currently using spreadsheets, basic CRM tools, or a competitor they want to migrate away from

### Secondary Segment: Enterprise

- Organisations with 500+ employees requiring multi-department deployments
- Need SSO (SAML / OIDC), SOC 2 compliance, dedicated infrastructure
- Currently using Salesforce or Dynamics 365; seeking lower TCO

---

## 5. Competitive Positioning

| Dimension | OpsNext | Salesforce | HubSpot | Zoho CRM |
|-----------|---------|-----------|---------|---------|
| Multi-tenancy | Schema-per-tenant | Row-level | Row-level | Row-level |
| Open source | Planned | No | No | No |
| Self-hosted option | Phase 3 | No | No | Limited |
| Integration with Salesforce/Zoho | Import + sync | N/A | Limited | N/A |
| AI-assisted features | Phase 2 (Claude API) | Yes (Einstein) | Yes | Limited |

---

## 6. Revenue Model

| Plan | Price (target) | Included Users | Contacts | API Calls/min |
|------|---------------|----------------|----------|---------------|
| Basic | $29/month | 3 | 10,000 | 500 |
| Professional | $79/month | 10 | 100,000 | 2,000 |
| Enterprise | Custom | Unlimited | Unlimited | 5,000+ |

Billing managed via Stripe. Metered add-ons: additional users, storage, API calls.

---

## 7. Key Stakeholders

| Role | Organisation | Responsibility |
|------|-------------|----------------|
| Product Owner | OpsNext | Feature prioritisation, phase gate approval |
| Lead Architect | OpsNext | Technical decisions, ADR sign-off |
| Security Lead | OpsNext | Security architecture, pen test oversight |
| Tenant Administrator | Customer org | Manages users, customisation within their tenant |
| Sales Representative | Customer org | Primary daily user of CRM features |
| Finance / Billing | OpsNext | Subscription management, Stripe integration |

---

## 8. Assumptions

| ID | Assumption |
|----|-----------|
| A-01 | Initial deployment targets AWS; multi-cloud (Azure, GCP) is Phase 2+ |
| A-02 | Billing/subscription management delegated to Stripe |
| A-03 | AI/ML features (lead scoring, deal probability) use Claude API in Phase 1 |
| A-04 | Mobile apps are thin clients sharing the API; offline-first is Phase 3 |
| A-05 | Salesforce and Zoho connectors are read-only in Phase 1; bi-directional in Phase 2 |

---

## 9. Constraints

| ID | Constraint |
|----|-----------|
| C-01 | EU tenant data MUST be stored in EU regions (GDPR data residency) |
| C-02 | Platform MUST meet WCAG 2.1 AA accessibility minimum |
| C-03 | API breaking changes MUST follow semantic versioning with 6-month deprecation windows |
| C-04 | Core database vendor lock-in MUST be minimised (Prisma abstracts ORM) |
| C-05 | SOC 2 Type II audit readiness required before enterprise sales |

---

## 10. Success Metrics (Phase 1 GA)

| Metric | Target |
|--------|--------|
| Time to onboard new tenant | < 10 minutes |
| API P95 response time | ≤ 300 ms |
| Platform uptime | 99.9% |
| Tenant data isolation | Zero cross-tenant incidents |
| Initial tenant capacity | 500 tenants |
| WCAG 2.1 AA compliance | 100% of core user journeys |
