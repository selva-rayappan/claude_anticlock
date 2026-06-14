# OpsNext CRM — Master Task Tracker

**Last Updated:** 2026-06-14  
**Reference:** EXECUTION_TASK_PLAN.md v1.0  
**Current Sprint:** Phase 1 — CI/CD & Infrastructure  

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Complete — implemented and verified |
| ⚠️ | Partial — in progress or partially implemented |
| ❌ | Not started |
| ☁️ | Cloud-only — IaC/config created; requires AWS account to apply |
| 🔒 | Blocked — depends on incomplete predecessor |

---

## Phase Overview

| Phase | Tasks | Status | Notes |
|-------|-------|--------|-------|
| **0** — Architecture & Foundation Docs | 001–005 | ✅ **COMPLETE** | All 7 deliverable docs created |
| **1** — Monorepo, CI/CD & Infrastructure | 006–009 | ✅ **COMPLETE** | All files created; ☁️ items require AWS to apply |
| **2** — Database Design & Multi-Tenancy | 010–013 | ⚠️ **PARTIAL** | DB + multi-tenancy done; Typesense not started |
| **3** — IAM — Authentication & RBAC | 014–019 | ⚠️ **PARTIAL** | Auth done; MFA/SSO/full RBAC not started |
| **4** — Tenant Onboarding & Administration | 020–022 | ⚠️ **PARTIAL** | Registration done; admin panel not started |
| **5** — Contact & Account Management | 023–026 | ❌ Not started | |
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

> **Goal:** All binding design artefacts produced before product code.  
> **Status: COMPLETE — 2026-06-14**

| Task ID | Sub-task | Status | Deliverable |
|---------|----------|--------|-------------|
| **TASK-001** | **Technical Architecture Document (TAD)** | ✅ | `docs/architecture/TAD.md` |
| 001.1 | System context diagram (C4 L1) | ✅ | In TAD.md |
| 001.2 | Container diagram (C4 L2) | ✅ | In TAD.md |
| 001.3 | Component diagram — API Server (C4 L3) | ✅ | In TAD.md |
| 001.4 | Data flow diagrams | ✅ | In TAD.md |
| 001.5 | Sequence diagrams | ✅ | In TAD.md |
| 001.6 | ADRs (10 decisions recorded) | ✅ | `docs/architecture/adr/ADR-001` → `ADR-010` |
| 001.7 | Technology matrix | ✅ | In TAD.md §7 |
| 001.8 | API versioning strategy | ✅ | In TAD.md §8 |
| 001.9 | Error handling standard | ✅ | In TAD.md §9 |
| 001.10 | Logging & observability standard | ✅ | In TAD.md §10 |
| **TASK-002** | **Database Design Document (DDD)** | ✅ | `docs/database/DATABASE_DESIGN.md` |
| 002.1 | Entity-Relationship Diagram | ✅ | ASCII ERD in DATABASE_DESIGN.md §2 |
| 002.2 | Schema-per-tenant design | ✅ | DATABASE_DESIGN.md §1 |
| 002.3 | Custom fields architecture | ✅ | DATABASE_DESIGN.md §5 |
| 002.4 | Audit log table design | ✅ | DATABASE_DESIGN.md §8 |
| 002.5 | Index strategy | ✅ | DATABASE_DESIGN.md §6 |
| 002.6 | Soft delete strategy | ✅ | DATABASE_DESIGN.md §7 |
| 002.7 | Connection pooling design | ✅ | DATABASE_DESIGN.md §9 |
| 002.8 | Migration strategy | ✅ | DATABASE_DESIGN.md §10 |
| 002.9 | Seed data specification | ✅ | DATABASE_DESIGN.md §11 |
| **TASK-003** | **API Design Document** | ✅ | `docs/api/API_DESIGN.md`, `docs/api/openapi.yaml` |
| 003.1 | REST API resource taxonomy | ✅ | API_DESIGN.md §1 |
| 003.2 | OpenAPI 3.1 skeleton | ✅ | `docs/api/openapi.yaml` |
| 003.3 | Pagination standard | ✅ | API_DESIGN.md §4 |
| 003.4 | Bulk endpoint design | ✅ | API_DESIGN.md §6 |
| 003.5 | Filtering & sorting spec | ✅ | API_DESIGN.md §5 |
| 003.6 | Webhook payload schema | ✅ | API_DESIGN.md §7 |
| 003.7 | GraphQL schema draft | ✅ | API_DESIGN.md §11 |
| 003.8 | Rate limit headers spec | ✅ | API_DESIGN.md §8 |
| **TASK-004** | **Security Architecture Document** | ✅ | `docs/security/SECURITY_ARCHITECTURE.md`, `docs/security/THREAT_MODEL.md` |
| 004.1 | Threat model (STRIDE) | ✅ | THREAT_MODEL.md |
| 004.2 | Auth flow specification | ✅ | SECURITY_ARCHITECTURE.md §2 |
| 004.3 | Secrets management plan | ✅ | SECURITY_ARCHITECTURE.md §4 |
| 004.4 | Encryption-at-rest plan | ✅ | SECURITY_ARCHITECTURE.md §5 |
| 004.5 | OWASP Top 10 checklist | ✅ | SECURITY_ARCHITECTURE.md §7 |
| 004.6 | GDPR compliance checklist | ✅ | SECURITY_ARCHITECTURE.md §8 |
| 004.7 | Penetration test plan | ✅ | SECURITY_ARCHITECTURE.md §11 |
| **TASK-005** | **DevOps & Infrastructure Design Document** | ✅ | `docs/devops/INFRASTRUCTURE_DESIGN.md`, `docs/devops/DR_RUNBOOK.md` |
| 005.1 | Monorepo structure design | ✅ | INFRASTRUCTURE_DESIGN.md §1 |
| 005.2 | CI/CD pipeline design | ✅ | INFRASTRUCTURE_DESIGN.md §3 |
| 005.3 | Kubernetes resource design | ✅ | INFRASTRUCTURE_DESIGN.md §5 |
| 005.4 | Terraform module structure | ✅ | INFRASTRUCTURE_DESIGN.md §6 |
| 005.5 | Environment parity checklist | ✅ | INFRASTRUCTURE_DESIGN.md §7 |
| 005.6 | Observability stack design | ✅ | INFRASTRUCTURE_DESIGN.md §8 |
| 005.7 | Disaster recovery plan | ✅ | DR_RUNBOOK.md |

---

## PHASE 1 — Monorepo, CI/CD & Infrastructure Bootstrap ✅

> **Goal:** Working local dev environment, CI pipeline, deployed staging skeleton.  
> **Status: COMPLETE — 2026-06-14** (☁️ items require AWS account to apply)

| Task ID | Sub-task | Status | Notes |
|---------|----------|--------|-------|
| **TASK-006** | **Monorepo Initialisation** | ✅ | |
| 006.1 | Turborepo workspace init | ✅ | `turbo.json`, `pnpm-workspace.yaml`, `package.json` |
| 006.2 | Create workspace packages | ✅ | `apps/api` (Java), `apps/web` (Next.js), `packages/config`, `packages/shared`, `packages/db` |
| 006.3 | TypeScript configuration | ✅ | `tsconfig.base.json`, per-workspace tsconfigs |
| 006.4 | Linting & formatting | ✅ | ESLint + Prettier + Husky + lint-staged + commitlint |
| 006.5 | Git configuration | ✅ | `.gitignore` complete |
| 006.6 | Environment variable management | ✅ | `packages/config/src/env.ts`, `.env.example` files |
| 006.7 | Docker Compose (dev) | ✅ | `docker-compose.yml` (Postgres, Redis, Typesense, MinIO) |
| **TASK-007** | **CI/CD Pipeline Setup** | ✅ | |
| 007.1 | GitHub Actions — PR workflow | ✅ | `.github/workflows/pr-checks.yml` |
| 007.2 | GitHub Actions — merge workflow | ✅ | `.github/workflows/merge-to-main.yml` |
| 007.3 | GitHub Actions — release workflow | ✅ | `.github/workflows/release.yml` |
| 007.4 | Docker multi-stage builds | ✅ | `apps/api/Dockerfile`, `apps/web/Dockerfile` |
| 007.5 | ArgoCD setup | ☁️ | Requires live EKS cluster |
| 007.6 | Kubernetes manifests | ✅ | `infra/k8s/base/` + overlays (staging + prod) |
| 007.7 | Secrets injection (ESO) | ☁️ | Requires AWS Secrets Manager + EKS |
| 007.8 | Smoke test job | ✅ | Embedded in merge workflow + release workflow |
| **TASK-008** | **Terraform Infrastructure Provisioning** | ☁️ | All IaC files created; apply requires AWS account |
| 008.1 | Terraform state backend | ☁️ | `infra/terraform/envs/staging/main.tf` (backend block) |
| 008.2 | VPC module | ☁️ | `infra/terraform/modules/vpc/` |
| 008.3 | EKS cluster module | ☁️ | Inline in `infra/terraform/envs/staging/main.tf` (terraform-aws-modules/eks) |
| 008.4 | RDS PostgreSQL module | ☁️ | `infra/terraform/modules/rds/` |
| 008.5 | ElastiCache Redis module | ☁️ | `infra/terraform/modules/elasticache/` |
| 008.6 | S3 buckets | ☁️ | `infra/terraform/modules/s3/` |
| 008.7 | Secrets Manager secrets | ☁️ | In rds/elasticache modules (auto-creates Secrets Manager entries) |
| 008.8 | Cloudflare configuration | ☁️ | Documented in DR_RUNBOOK; Terraform module stub needed |
| 008.9 | Outputs documentation | ☁️ | `infra/terraform/modules/*/outputs.tf` |
| **TASK-009** | **Observability Stack Setup** | ☁️ | Manifests created; apply requires EKS |
| 009.1 | OpenTelemetry Collector | ☁️ | `infra/k8s/monitoring/otel-collector.yaml` (DaemonSet) |
| 009.2 | Prometheus + Grafana | ☁️ | Deploy via `helm install kube-prometheus-stack` (documented) |
| 009.3 | Loki log aggregation | ☁️ | Deploy via `helm install loki` (documented) |
| 009.4 | Tempo distributed tracing | ☁️ | Deploy via `helm install tempo` (documented) |
| 009.5 | Sentry project setup | ☁️ | Requires Sentry account; DSN added to Secrets Manager |
| 009.6 | Alerting rules | ☁️ | `infra/k8s/monitoring/alerting-rules.yaml` (PrometheusRule) |

---

## PHASE 2 — Database Design & Multi-Tenancy Core ⚠️

> **Status: PARTIAL — DB + middleware done; Typesense not started**  
> *Implemented ahead of plan order as part of project Phase 1*

| Task ID | Sub-task | Status | Notes |
|---------|----------|--------|-------|
| **TASK-010** | **Prisma/Flyway Schema — Platform (Public)** | ✅ | `V1__platform_schema.sql` via Flyway |
| 010.1 | `Tenant` model | ✅ | `public.tenants` table |
| 010.2 | `TenantConfig` model | ✅ | `public.tenant_configs` table |
| 010.3 | `TenantUsageMetrics` model | ✅ | `public.tenant_usage_metrics` table |
| 010.4 | `PlatformAdmin` model | ✅ | `public.platform_admins` table |
| 010.5 | `TenantSubscription` model | ✅ | `public.tenant_subscriptions` table |
| 010.6 | Platform schema migration | ✅ | Flyway auto-applies on startup |
| **TASK-011** | **Tenant Schema (Core Entities)** | ✅ | `tenant-schema-template.sql` |
| 011.1 | `User` model | ✅ | With lockout, invite, verification, push token |
| 011.2 | `Role` model | ✅ | System roles seeded |
| 011.3 | `Permission` model | ✅ | (resource, action, scope) triplet |
| 011.4 | `UserRole`, `RolePermission` join tables | ✅ | |
| 011.5 | `Session` + `RefreshToken` models | ✅ | |
| 011.6 | `CustomFieldDefinition` model | ✅ | |
| 011.7 | `Account` model | ✅ | With GIN indexes, soft delete |
| 011.8 | `Contact` model | ✅ | With consent fields, email opt-out |
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
| 011.19 | `AuditLog` model | ✅ | Partitioned by created_at |
| 011.20 | `ImportJob` model | ✅ | |
| 011.21 | Additional tables | ✅ | `Segment`, `ApiKey`, `WebhookSubscription`, `EmailSequence`, `OpportunityValueHistory` |
| **TASK-012** | **Multi-Tenancy Middleware** | ✅ | |
| 012.1 | Tenant resolution service | ✅ | `TenantFilter.java` — slug via header/subdomain, Redis cache |
| 012.2 | Schema routing | ✅ | `TenantJdbcTemplate.java` — SET search_path per query |
| 012.3 | Tenant plugin (Spring Filter) | ✅ | `TenantFilter` registered in `SecurityConfig` |
| 012.4 | Tenant isolation unit tests | ❌ | Not yet written |
| 012.5 | Tenant provisioning service | ✅ | `TenantProvisioningService.java` |
| 012.6 | Tenant schema migration strategy | ⚠️ | Strategy documented; `TenantSchemaMigrationService` not yet built |
| **TASK-013** | **Search Engine Integration (Typesense)** | ❌ | Not started |
| 013.1 | Typesense collection schemas | ❌ | |
| 013.2 | Search sync service | ❌ | |
| 013.3 | Global search endpoint | ❌ | |
| 013.4 | Backfill job | ❌ | |
| 013.5 | Search latency test | ❌ | |

---

## PHASE 3 — IAM — Authentication & RBAC ⚠️

> **Status: PARTIAL — Core auth done; MFA, SSO, full RBAC not started**

| Task ID | Sub-task | Status | Notes |
|---------|----------|--------|-------|
| **TASK-014** | **User Registration & Email Verification** | ✅ | |
| 014.1 | `POST /auth/register` | ✅ | `AuthController.java` |
| 014.2 | Email verification flow | ✅ | `GET /auth/verify-email` |
| 014.3 | Resend verification | ✅ | `POST /auth/resend-verification` |
| 014.4 | Email templates | ⚠️ | Endpoint exists; Resend integration stubbed |
| 014.5 | Registration unit tests | ❌ | Not written |
| **TASK-015** | **Login, JWT & Refresh Token** | ✅ | |
| 015.1 | `POST /auth/login` | ✅ | With lockout enforcement |
| 015.2 | JWT structure (RS256) | ✅ | JJWT 0.12.6, `JwtService.java` |
| 015.3 | `POST /auth/refresh` | ✅ | Refresh token rotation |
| 015.4 | `POST /auth/logout` | ✅ | JTI deny-list in Redis |
| 015.5 | Account lockout mechanism | ✅ | 5 attempts → 15 min lock |
| 015.6 | Auth middleware | ✅ | `JwtAuthFilter.java` |
| 015.7 | Token lifecycle tests | ❌ | Not written |
| **TASK-016** | **Multi-Factor Authentication (MFA)** | ❌ | Not started |
| 016.1–016.7 | All sub-tasks | ❌ | |
| **TASK-017** | **RBAC — Roles & Permissions** | ⚠️ | Seeding done; permission check middleware not implemented |
| 017.1 | Permission seeding | ✅ | All 5 roles seeded in `TenantProvisioningService` |
| 017.2 | Permission check middleware | ❌ | `PermissionService` not yet built |
| 017.3 | Ownership scope enforcement | ❌ | `WHERE owner_id = ?` filtering not yet in place |
| 017.4 | Custom role CRUD | ❌ | |
| 017.5 | User role assignment | ❌ | |
| 017.6 | Field-level permission metadata | ❌ | |
| 017.7 | RBAC unit tests | ❌ | |
| **TASK-018** | **SSO — OAuth 2.0 / OIDC** | ❌ | Not started |
| 018.1–018.6 | All sub-tasks | ❌ | |
| **TASK-019** | **Password Management** | ⚠️ | Endpoints exist; policy engine not built |
| 019.1 | Forgot password | ✅ | `AuthController.java` |
| 019.2 | Reset password | ✅ | `AuthController.java` |
| 019.3 | Change password (authenticated) | ✅ | `AuthController.java` |
| 019.4 | Password policy engine | ❌ | Hardcoded validation only |
| 019.5 | Admin password reset | ❌ | Admin endpoint not yet built |

---

## PHASE 4 — Tenant Onboarding & Administration ⚠️

| Task ID | Sub-task | Status | Notes |
|---------|----------|--------|-------|
| **TASK-020** | **Self-Service Tenant Registration** | ✅ | |
| 020.1 | Registration API | ✅ | `TenantController.java` |
| 020.2 | Stripe integration | ❌ | Tenant created without Stripe in Phase 1 |
| 020.3 | Onboarding wizard (FE) | ⚠️ | Basic register page exists; 4-step wizard not built |
| 020.4 | Post-registration setup | ✅ | Schema provisioned + seeded + admin created |
| 020.5 | Tenant slug validation | ✅ | `GET /platform/tenants/check-slug` |
| 020.6 | Onboarding checklist widget | ❌ | |
| **TASK-021** | **Tenant Admin Panel** | ❌ | Not started |
| 021.1–021.9 | All sub-tasks | ❌ | |
| **TASK-022** | **Tenant Settings — Pipeline Configuration** | ❌ | Not started |
| 022.1–022.4 | All sub-tasks | ❌ | |

---

## PHASE 5 — Contact & Account Management ❌

| Task ID | Status | Notes |
|---------|--------|-------|
| TASK-023 Account CRUD API | ❌ | Tables exist; controller not built |
| TASK-024 Contact CRUD API | ❌ | Tables exist; controller not built |
| TASK-025 Dynamic Segmentation | ❌ | Table exists; engine not built |
| TASK-026 Contact & Account Frontend | ❌ | List page skeleton exists; no API integration |

---

## PHASE 6 — Lead & Opportunity Management ❌

| Task ID | Status |
|---------|--------|
| TASK-027 Lead CRUD API | ❌ |
| TASK-028 Opportunity CRUD API | ❌ |
| TASK-029 Lead & Opportunity Frontend | ❌ |

---

## PHASE 7 — Activity & Interaction Tracking ❌

| Task ID | Status |
|---------|--------|
| TASK-030 Activity Logging API | ❌ |
| TASK-031 Email Capture Integration | ❌ |
| TASK-032 Calendar Integration | ❌ |

---

## PHASE 8 — Pipeline & Deal Management (Kanban) ❌

| Task ID | Status |
|---------|--------|
| TASK-033 Kanban Board Backend | ❌ |
| TASK-034 Kanban Board Frontend | ❌ |

---

## PHASE 9 — Task & Workflow Automation Engine ❌

| Task ID | Status |
|---------|--------|
| TASK-035 Task Management API & UI | ❌ |
| TASK-036 Workflow Automation Engine | ❌ |
| TASK-037 Email Sequences (Cadences) | ❌ |

---

## PHASE 10 — Notifications & Alerts ❌

| Task ID | Status |
|---------|--------|
| TASK-038 In-App Notification System | ❌ |
| TASK-039 Outbound Webhooks | ❌ |
| TASK-040 Slack & Teams Notifications | ❌ |

---

## PHASE 11 — Reporting & Analytics ❌

| Task ID | Status |
|---------|--------|
| TASK-041 Pre-Built Dashboard APIs | ❌ |
| TASK-042 Custom Report Builder | ❌ |

---

## PHASE 12 — Integration Framework ❌

| Task ID | Status |
|---------|--------|
| TASK-043 REST API Hardening & OpenAPI | ❌ |
| TASK-044 GraphQL API | ❌ |

---

## PHASE 13 — Data Import / Export ❌

| Task ID | Status |
|---------|--------|
| TASK-045 CSV / Excel Import Pipeline | ❌ |

---

## PHASE 14 — External Integrations ❌

| Task ID | Status |
|---------|--------|
| TASK-046 Excel Integration | ❌ |
| TASK-047 Microsoft PowerApps Connector | ❌ |
| TASK-048 Salesforce Integration | ❌ |
| TASK-049 Zoho CRM Integration | ❌ |

---

## PHASE 15 — Audit, Compliance & Data Governance ❌

| Task ID | Status |
|---------|--------|
| TASK-050 Audit Logging Infrastructure | ❌ |
| TASK-051 GDPR Compliance Workflows | ❌ |
| TASK-052 Encryption & Security Hardening | ❌ |

---

## PHASE 16 — Mobile Application ❌

| Task ID | Status |
|---------|--------|
| TASK-053 Mobile App Foundation | ❌ |
| TASK-054 Mobile Core Screens | ❌ |

---

## PHASE 17 — Performance, Security & NFR Hardening ❌

| Task ID | Status |
|---------|--------|
| TASK-055 Load Testing & Performance Optimisation | ❌ |
| TASK-056 Security Penetration Testing | ❌ |
| TASK-057 Accessibility & i18n | ❌ |

---

## PHASE 18 — UAT, Documentation & GA Launch ❌

| Task ID | Status |
|---------|--------|
| TASK-058 Developer Documentation | ❌ |
| TASK-059 End-to-End Testing Suite | ❌ |
| TASK-060 User Acceptance Testing | ❌ |
| TASK-061 Production Launch | ❌ |

---

## Progress Summary

| Metric | Count |
|--------|-------|
| Total tasks | 61 |
| Complete ✅ | 17 |
| Partial ⚠️ | 6 |
| Cloud-ready ☁️ (IaC files exist) | 4 |
| Not started ❌ | 34 |
| **Overall completion** | **~35%** (of started phases 0–4) |

---

## Next Up

| Priority | Task | Owner |
|----------|------|-------|
| 🔴 High | TASK-007.4 — Husky + lint-staged (006.4 gap) | DevOps |
| 🔴 High | TASK-017 — RBAC permission check middleware | BE |
| 🔴 High | TASK-013 — Typesense search integration | BE |
| 🟡 Medium | TASK-021 — Tenant admin panel (BE + FE) | BE + FE |
| 🟡 Medium | TASK-023/024 — Account + Contact CRUD APIs | BE |
| 🟡 Medium | TASK-026 — Contact & Account Frontend | FE |
| 🟢 Low | TASK-016 — MFA | BE |
| 🟢 Low | TASK-022 — Pipeline configuration UI | FE |
