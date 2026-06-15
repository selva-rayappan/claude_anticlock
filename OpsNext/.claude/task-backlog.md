# Task Backlog

**Last Updated:** 2026-06-15  
**Reference:** [`docs/EXECUTION_PLAN.md`](../docs/EXECUTION_PLAN.md)  
**Active Sprint:** Phase 3 completion + Phase 5 start

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Complete — implemented and verified |
| ⚠️ | Partial — in progress or partially implemented |
| ❌ | Not started |
| ☁️ | Cloud-only — IaC/config created; requires AWS account to apply |

---

## Phase Overview

| Phase | Tasks | Status | Notes |
|-------|-------|--------|-------|
| **0** — Architecture & Foundation Docs | 001–005 | ✅ **COMPLETE** | All deliverable docs created |
| **1** — Monorepo, CI/CD & Infrastructure | 006–009 | ✅ **COMPLETE** | ☁️ items require live AWS account |
| **2** — Database & Multi-Tenancy Core | 010–013 | ⚠️ **PARTIAL** | DB + middleware done; Typesense not started |
| **3** — IAM — Authentication & RBAC | 014–019 | ⚠️ **PARTIAL** | Core auth done; MFA/SSO/full RBAC not started |
| **4** — Tenant Onboarding & Administration | 020–022 | ⚠️ **PARTIAL** | Registration done; admin panel not started |
| **5** — Contact & Account Management | 023–026 | ❌ Not started | Tables exist; controllers not built |
| **6** — Lead & Opportunity Management | 027–029 | ❌ Not started | |
| **7** — Activity & Interaction Tracking | 030–032 | ❌ Not started | |
| **8** — Pipeline & Deal Management (Kanban) | 033–034 | ❌ Not started | |
| **9** — Task & Workflow Automation | 035–037 | ❌ Not started | |
| **10** — Notifications & Alerts | 038–040 | ❌ Not started | |
| **11** — Reporting & Analytics | 041–042 | ❌ Not started | |
| **12** — Integration Framework | 043–044 | ❌ Not started | |
| **13** — Data Import / Export | 045 | ❌ Not started | |
| **14** — External Integrations | 046–049 | ❌ Not started | |
| **15** — Audit, Compliance & Data Governance | 050–052 | ❌ Not started | |
| **16** — Mobile Application | 053–054 | ❌ Not started | |
| **17** — Performance, Security & NFR Hardening | 055–057 | ❌ Not started | |
| **18** — UAT, Documentation & GA Launch | 058–061 | ❌ Not started | |

---

## PHASE 0 — Technical Architecture & Foundation Documents ✅

> **Completed: 2026-06-14**

| Task | Sub-task | Status | Deliverable |
|------|----------|--------|-------------|
| **TASK-001** | Technical Architecture Document (TAD) | ✅ | `docs/architecture/TAD.md` |
| 001.1 | System context diagram (C4 L1) | ✅ | In TAD.md |
| 001.2 | Container diagram (C4 L2) | ✅ | In TAD.md |
| 001.3 | Component diagram — API Server (C4 L3) | ✅ | In TAD.md |
| 001.4 | Data flow diagrams | ✅ | In TAD.md |
| 001.5 | Sequence diagrams | ✅ | In TAD.md |
| 001.6 | ADRs (10 decisions recorded) | ✅ | `docs/architecture/adr/ADR-001` → `ADR-010` |
| 001.7 | Technology matrix | ✅ | TAD.md §7 |
| 001.8 | API versioning strategy | ✅ | TAD.md §8 |
| 001.9 | Error handling standard | ✅ | TAD.md §9 |
| 001.10 | Logging & observability standard | ✅ | TAD.md §10 |
| **TASK-002** | Database Design Document (DDD) | ✅ | `docs/database/DATABASE_DESIGN.md` |
| 002.1–002.9 | All sub-tasks | ✅ | ERD, schema-per-tenant, custom fields, audit log, indexes, soft-delete, pooling, migrations, seed spec |
| **TASK-003** | API Design Document | ✅ | `docs/api/API_DESIGN.md`, `docs/api/openapi.yaml` |
| 003.1–003.8 | All sub-tasks | ✅ | Resource taxonomy, OpenAPI 3.1, pagination, bulk, filtering, webhooks, GraphQL, rate limits |
| **TASK-004** | Security Architecture Document | ✅ | `docs/security/SECURITY_ARCHITECTURE.md`, `docs/security/THREAT_MODEL.md` |
| 004.1–004.7 | All sub-tasks | ✅ | STRIDE threat model, auth flows, secrets management, encryption, OWASP, GDPR, pen test plan |
| **TASK-005** | DevOps & Infrastructure Design Document | ✅ | `docs/devops/INFRASTRUCTURE_DESIGN.md`, `docs/devops/DR_RUNBOOK.md` |
| 005.1–005.7 | All sub-tasks | ✅ | Monorepo design, CI/CD, K8s, Terraform, environment parity, observability, DR |

---

## PHASE 1 — Monorepo, CI/CD & Infrastructure Bootstrap ✅

> **Completed: 2026-06-14** — ☁️ cloud items require live AWS account

| Task | Sub-task | Status | Notes |
|------|----------|--------|-------|
| **TASK-006** | Monorepo Initialisation | ✅ | |
| 006.1 | Turborepo workspace init | ✅ | `turbo.json`, `pnpm-workspace.yaml` |
| 006.2 | Create workspace packages | ✅ | `frontend/`, `backend/`, `apps/worker`, `packages/config`, `packages/shared`, `packages/db` |
| 006.3 | TypeScript configuration | ✅ | `tsconfig.base.json`, per-workspace tsconfigs |
| 006.4 | Linting & formatting | ✅ | ESLint + Prettier + Husky + lint-staged + commitlint |
| 006.5 | Git configuration | ✅ | `.gitignore`, branch protection rules documented |
| 006.6 | Environment variable management | ✅ | `packages/config/src/env.ts`, `.env.example` files |
| 006.7 | Docker Compose (dev) | ✅ | `infra/docker/docker-compose.yml` (Postgres, Redis, Typesense, MinIO) |
| **TASK-007** | CI/CD Pipeline Setup | ✅ | |
| 007.1 | GitHub Actions — PR workflow | ✅ | `.github/workflows/pr-checks.yml` |
| 007.2 | GitHub Actions — merge workflow | ✅ | `.github/workflows/merge-to-main.yml` |
| 007.3 | GitHub Actions — release workflow | ✅ | `.github/workflows/release.yml` |
| 007.4 | Docker multi-stage builds | ✅ | `backend/Dockerfile`, `frontend/Dockerfile` |
| 007.5 | ArgoCD setup | ☁️ | Requires live EKS cluster |
| 007.6 | Kubernetes manifests | ✅ | `infra/k8s/base/` + overlays (staging, prod) |
| 007.7 | Secrets injection (ESO) | ☁️ | Requires AWS Secrets Manager + EKS |
| 007.8 | Smoke test job | ✅ | Embedded in merge + release workflows |
| **TASK-008** | Terraform Infrastructure Provisioning | ☁️ | All IaC files created; apply requires AWS |
| 008.1–008.9 | All sub-tasks | ☁️ | State backend, VPC, EKS, RDS, ElastiCache, S3, Secrets Manager, Cloudflare, outputs |
| **TASK-009** | Observability Stack Setup | ☁️ | Manifests created; apply requires EKS |
| 009.1–009.6 | All sub-tasks | ☁️ | OTel Collector, Prometheus+Grafana, Loki, Tempo, Sentry, alerting rules |

---

## PHASE 2 — Database Design & Multi-Tenancy Core ⚠️

> DB + middleware done; Typesense not started

| Task | Sub-task | Status | Notes |
|------|----------|--------|-------|
| **TASK-010** | Platform (Public) Schema | ✅ | `V1__platform_schema.sql` via Flyway |
| 010.1 | `Tenant` model | ✅ | `public.tenants` table |
| 010.2 | `TenantConfig` model | ✅ | `public.tenant_configs` table |
| 010.3 | `TenantUsageMetrics` model | ✅ | `public.tenant_usage_metrics` table |
| 010.4 | `PlatformAdmin` model | ✅ | `public.platform_admins` table |
| 010.5 | `TenantSubscription` model | ✅ | `public.tenant_subscriptions` table |
| 010.6 | Platform schema migration | ✅ | Flyway auto-applies on startup |
| **TASK-011** | Tenant Schema (Core Entities) | ✅ | `backend/src/main/resources/db/tenant-schema-template.sql` |
| 011.1 | `User` model | ✅ | With lockout, invite, verification, push token |
| 011.2 | `Role` model | ✅ | System roles seeded |
| 011.3 | `Permission` model | ✅ | (resource, action, scope) triplet |
| 011.4 | `UserRole`, `RolePermission` join tables | ✅ | |
| 011.5 | `Session` + `RefreshToken` models | ✅ | |
| 011.6 | `CustomFieldDefinition` model | ✅ | |
| 011.7 | `Account` model | ✅ | GIN indexes, soft delete |
| 011.8 | `Contact` model | ✅ | Consent fields, email opt-out |
| 011.9 | `Lead` model | ✅ | With conversion FKs |
| 011.10 | `Pipeline` model | ✅ | |
| 011.11 | `PipelineStage` model | ✅ | |
| 011.12 | `Opportunity` model | ✅ | |
| 011.13 | `OpportunityStageHistory` model | ✅ | |
| 011.14 | `Activity` model | ✅ | Polymorphic |
| 011.15 | `Task` model | ✅ | |
| 011.16 | `Workflow` model | ✅ | |
| 011.17 | `WorkflowExecution` model | ✅ | With idempotency constraint |
| 011.18 | `Notification` model | ✅ | |
| 011.19 | `AuditLog` model | ✅ | Partitioned by `created_at` |
| 011.20 | `ImportJob` model | ✅ | |
| 011.21 | Seed data script | ✅ | `Segment`, `ApiKey`, `WebhookSubscription`, `EmailSequence`, `OpportunityValueHistory` also added |
| **TASK-012** | Multi-Tenancy Middleware | ⚠️ | |
| 012.1 | Tenant resolution service | ✅ | `TenantFilter.java` — slug via header/subdomain, Redis cache |
| 012.2 | Schema routing | ✅ | `TenantJdbcTemplate.java` — SET search_path per query |
| 012.3 | Fastify tenant plugin | ✅ | `TenantFilter` registered in `SecurityConfig` |
| 012.4 | Tenant isolation unit tests | ❌ | **Not written** |
| 012.5 | Tenant provisioning service | ✅ | `TenantProvisioningService.java` |
| 012.6 | Tenant schema migration strategy | ⚠️ | Strategy documented; `TenantSchemaMigrationService` not yet built |
| **TASK-013** | Search Engine Integration (Typesense) | ❌ | **Not started** |
| 013.1 | Typesense collection schemas | ❌ | |
| 013.2 | Search sync service | ❌ | |
| 013.3 | Global search endpoint | ❌ | |
| 013.4 | Backfill job | ❌ | |
| 013.5 | Search latency test | ❌ | |

---

## PHASE 3 — IAM — Authentication & RBAC ⚠️

> Core auth done; MFA, SSO, full RBAC not started

| Task | Sub-task | Status | Notes |
|------|----------|--------|-------|
| **TASK-014** | User Registration & Email Verification | ⚠️ | |
| 014.1 | `POST /auth/register` | ✅ | `AuthController.java` |
| 014.2 | Email verification flow | ✅ | `GET /auth/verify-email` |
| 014.3 | Resend verification | ✅ | `POST /auth/resend-verification` |
| 014.4 | Email templates (Resend) | ⚠️ | Endpoint exists; Resend integration stubbed |
| 014.5 | Registration unit tests | ❌ | **Not written** |
| **TASK-015** | Login, JWT & Refresh Token | ⚠️ | |
| 015.1 | `POST /auth/login` | ✅ | With lockout enforcement |
| 015.2 | JWT structure (RS256) | ✅ | JJWT 0.12.6, `JwtService.java` |
| 015.3 | `POST /auth/refresh` | ✅ | Refresh token rotation |
| 015.4 | `POST /auth/logout` | ✅ | JTI deny-list in Redis |
| 015.5 | Account lockout mechanism | ✅ | 5 attempts → 15 min lock |
| 015.6 | Auth middleware | ✅ | `JwtAuthFilter.java` |
| 015.7 | Token lifecycle tests | ❌ | **Not written** |
| **TASK-016** | Multi-Factor Authentication (MFA) | ❌ | **Not started** |
| 016.1 | TOTP enrolment | ❌ | |
| 016.2 | TOTP verification & activation | ❌ | |
| 016.3 | MFA login step | ❌ | |
| 016.4 | SMS OTP (Twilio) | ❌ | |
| 016.5 | Backup codes | ❌ | |
| 016.6 | Admin MFA bypass | ❌ | |
| 016.7 | MFA integration tests | ❌ | |
| **TASK-017** | RBAC — Roles & Permissions | ⚠️ | Seeding done; enforcement not built |
| 017.1 | Permission seeding | ✅ | All 5 roles seeded in `TenantProvisioningService` |
| 017.2 | Permission check middleware | ❌ | **`PermissionService` not yet built** |
| 017.3 | Ownership scope enforcement | ❌ | `WHERE owner_id = ?` filtering not in place |
| 017.4 | Custom role CRUD | ❌ | |
| 017.5 | User role assignment | ❌ | |
| 017.6 | Field-level permission metadata | ❌ | |
| 017.7 | RBAC unit tests | ❌ | |
| **TASK-018** | SSO — OAuth 2.0 / OIDC | ❌ | **Not started** |
| 018.1–018.6 | All sub-tasks | ❌ | PKCE flow, Entra ID, Google, SAML 2.0, JIT provisioning, SSO config UI |
| **TASK-019** | Password Management | ⚠️ | Endpoints exist; policy engine not built |
| 019.1 | Forgot password | ✅ | `AuthController.java` |
| 019.2 | Reset password | ✅ | `AuthController.java` |
| 019.3 | Change password (authenticated) | ✅ | `AuthController.java` |
| 019.4 | Password policy engine | ❌ | Hardcoded validation only |
| 019.5 | Admin password reset | ❌ | Admin endpoint not yet built |

---

## PHASE 4 — Tenant Onboarding & Administration ⚠️

| Task | Sub-task | Status | Notes |
|------|----------|--------|-------|
| **TASK-020** | Self-Service Tenant Registration | ⚠️ | |
| 020.1 | Registration API | ✅ | `TenantController.java` |
| 020.2 | Stripe integration | ❌ | Tenant created without Stripe in Phase 1 |
| 020.3 | Onboarding wizard (FE) | ⚠️ | Basic register page exists; 4-step wizard not built |
| 020.4 | Post-registration setup | ✅ | Schema provisioned + seeded + admin created |
| 020.5 | Tenant slug validation | ✅ | `GET /platform/tenants/check-slug` |
| 020.6 | Onboarding checklist widget | ❌ | |
| **TASK-021** | Tenant Admin Panel | ❌ | **Not started** |
| 021.1 | User management API | ❌ | |
| 021.2 | User invitation flow | ❌ | |
| 021.3 | Custom field builder API | ❌ | |
| 021.4 | Custom field builder UI | ❌ | |
| 021.5 | Tenant branding settings | ❌ | |
| 021.6 | Tenant general settings | ❌ | |
| 021.7 | Password policy settings | ❌ | |
| 021.8 | Billing dashboard | ❌ | |
| 021.9 | Platform admin panel | ❌ | |
| **TASK-022** | Tenant Settings — Pipeline Configuration | ❌ | **Not started** |
| 022.1–022.4 | All sub-tasks | ❌ | Pipeline CRUD API, stage config, pipeline settings UI, default pipeline |

---

## PHASE 5 — Contact & Account Management ❌

> Tables exist in DB; controllers not yet built

| Task | Description | Status |
|------|-------------|--------|
| TASK-023 | Account CRUD API | ❌ |
| TASK-024 | Contact CRUD API | ❌ |
| TASK-025 | Dynamic Segmentation | ❌ |
| TASK-026 | Contact & Account Frontend | ❌ — list page skeleton exists, no API integration |

---

## Phases 6–18 ❌

| Phase | Tasks | Description |
|-------|-------|-------------|
| **6** | 027–029 | Lead & Opportunity Management |
| **7** | 030–032 | Activity & Interaction Tracking |
| **8** | 033–034 | Pipeline & Deal Management (Kanban) |
| **9** | 035–037 | Task & Workflow Automation Engine |
| **10** | 038–040 | Notifications & Alerts |
| **11** | 041–042 | Reporting & Analytics |
| **12** | 043–044 | Integration Framework (REST + GraphQL + Webhooks) |
| **13** | 045 | Data Import / Export |
| **14** | 046–049 | External Integrations (Excel, PowerApps, Zoho, Salesforce) |
| **15** | 050–052 | Audit, Compliance & Data Governance |
| **16** | 053–054 | Mobile Application (React Native) |
| **17** | 055–057 | Performance, Security & NFR Hardening |
| **18** | 058–061 | UAT, Documentation & GA Launch |

---

## Progress Summary

| Metric | Count |
|--------|-------|
| Total tasks | 61 |
| Complete ✅ | 17 |
| Partial ⚠️ | 6 |
| Cloud-ready ☁️ (IaC exists; needs AWS) | 4 |
| Not started ❌ | 34 |
| **Overall completion** | **~35%** of started phases (0–4) |

---

## Next Up — Priority Order

| Priority | Task | What's needed |
|----------|------|---------------|
| 🔴 High | **TASK-017** — RBAC permission check middleware | Build `PermissionService`; add `@PreAuthorize` to all service methods |
| 🔴 High | **TASK-013** — Typesense search integration | Collection schemas, sync worker, global search endpoint |
| 🔴 High | Tests for TASK-014, 015 | `AuthServiceTest`, `AuthControllerTest`, token lifecycle tests |
| 🟡 Medium | **TASK-021** — Tenant admin panel (BE + FE) | User management, custom field builder, branding settings |
| 🟡 Medium | **TASK-023 / TASK-024** — Account + Contact CRUD APIs | First real CRM entity endpoints |
| 🟡 Medium | **TASK-026** — Contact & Account Frontend | Wire up list page to API |
| 🟢 Low | **TASK-016** — MFA | TOTP enrolment + login step |
| 🟢 Low | **TASK-022** — Pipeline configuration UI | Stage builder for tenant admin |
