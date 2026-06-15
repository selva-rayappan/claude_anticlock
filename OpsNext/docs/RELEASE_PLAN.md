# OpsNext CRM — Release Plan

**Document Version:** 1.0  
**Status:** Draft  
**Date:** 2026-06-11

---

## Release Strategy

OpsNext uses **progressive delivery**: dev → staging → canary (5% of traffic) → production.

All releases go through:
1. PR merged to `main` → automatic staging deploy
2. Manual approval gate before production promote
3. Canary release at 5% traffic for 24 hours
4. Full production rollout if no error rate increase

---

## Version Policy

OpsNext follows [Semantic Versioning](https://semver.org/):

- **Major (X.0.0):** Breaking API changes. 6-month deprecation window with `Sunset` headers.
- **Minor (X.Y.0):** New features, backwards-compatible. No deprecation required.
- **Patch (X.Y.Z):** Bug fixes, security patches. Can be deployed any time.

---

## Milestone Releases

### v0.1.0 — Internal Alpha (Target: Phase 1 complete)

**Goal:** Working local dev environment, CI/CD pipeline, staging infrastructure.

Deliverables:
- Monorepo builds cleanly (`pnpm build`)
- Docker Compose spins up all local services
- CI pipeline runs lint + typecheck + tests on every PR
- Staging environment deployed on EKS
- Health endpoints responding

Gate: Lead Architect sign-off on localhost review.

---

### v0.2.0 — Closed Beta: Foundation (Target: Phase 3 complete)

**Goal:** Authentication and multi-tenancy proven end-to-end.

Deliverables:
- Tenant self-service registration (< 5 minutes)
- User registration, login, JWT refresh, logout
- MFA (TOTP) enrolment and enforcement
- RBAC with 5 built-in roles enforced
- Tenant schema provisioning on registration
- Tenant admin panel (user management, branding, custom fields)

Gate: Security lead sign-off. Pen test against auth endpoints.

---

### v0.3.0 — Closed Beta: Core CRM (Target: Phase 7 complete)

**Goal:** Usable CRM for early design partners.

Deliverables:
- Contact & Account CRUD with custom fields
- Lead management and lead-to-opportunity conversion
- Opportunity pipeline with Kanban board
- Activity logging and timeline view
- Task management
- Global search (Typesense)
- Duplicate detection and merge

Design partners: 5 selected SMB customers, closed beta.

Gate: 2 design partners actively using the product for 2 weeks.

---

### v0.4.0 — Beta: Automation & Notifications (Target: Phase 10 complete)

**Goal:** No-code automation and real-time notifications.

Deliverables:
- Workflow automation engine (trigger-condition-action)
- In-app notification centre (SSE real-time)
- Email notifications (Resend)
- Outbound webhooks

Gate: Design partner workflow automation in production use.

---

### v0.5.0 — Beta: Reporting & Integrations (Target: Phase 13 complete)

**Goal:** Reporting suite and data import/export.

Deliverables:
- Pre-built dashboards (Sales Overview, Pipeline Summary, Lead Funnel, Activity Report, Win/Loss)
- Custom report builder
- CSV/Excel import wizard (async, with error report)
- Data export (CSV, XLSX, JSON)
- REST API hardening + OpenAPI spec published

---

### v1.0.0 — General Availability (Target: Phase 18 complete)

**Goal:** Production-ready for public launch.

Deliverables:
- All Phase 1–18 features complete
- External integrations: Excel Add-in, PowerApps Connector, Zoho sync, Salesforce sync
- SOC 2 Type II evidence package prepared
- GDPR right-to-erasure workflow
- Penetration test completed; all Critical/High findings resolved
- Documentation: user guides, API reference, integration guides
- Performance: all NFRs met (P95 ≤ 300ms, 99.9% uptime SLA)
- WCAG 2.1 AA audit passed

---

## Hotfix Process

For P0/P1 bugs in production:

1. Create `hotfix/YYYY-MM-DD-description` branch from the latest production tag.
2. Fix, test, PR to `main` — expedited review (1 reviewer minimum).
3. Tag as patch release (e.g., `v0.3.1`).
4. Deploy to production immediately (skip canary for P0).
5. Back-merge to `main` if not already there.

---

## Environment Summary

| Environment | URL | Deploy Trigger | Data |
|-------------|-----|---------------|------|
| Development | localhost | Manual | Seeded synthetic |
| Staging | staging.opsnext.io | Auto on merge to `main` | Anonymised production copy |
| Canary | canary.opsnext.io | Manual approval (5% traffic) | Real (opted-in tenants) |
| Production | app.opsnext.io | Manual approval | Real |
