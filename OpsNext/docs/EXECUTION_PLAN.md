# OpsNext CRM — Detailed Execution Task Plan

**Document Version:** 1.0  
**Status:** AWAITING APPROVAL  
**Prepared By:** Technical Architecture Team  
**Date:** 2026-06-11  
**Reference FRD:** FUNCTIONAL_REQUIREMENTS.md v1.0  
**Classification:** Internal — Confidential  

---

## How to Read This Document

| Symbol | Meaning |
|--------|---------|
| `[TASK-XXX]` | Unique task identifier |
| `depends: [TASK-XXX]` | Must complete before this task begins |
| `P1 / P2 / P3` | Priority tier matching FRD |
| `~Xd` | Estimated effort in engineering days (1 dev) |
| `→ FRD: XX` | Traceability to FRD requirement |
| `[BE]` | Backend engineer | `[FE]` Frontend | `[DBA]` Database | `[DevOps]` | `[QA]` |

---

## Execution Phases Overview

```
PHASE 0  │ Technical Architecture & Foundation Docs      │ Weeks  1–2
PHASE 1  │ Monorepo, CI/CD & Infrastructure Bootstrap    │ Weeks  2–4
PHASE 2  │ Database Design & Multi-Tenancy Core          │ Weeks  4–7
PHASE 3  │ IAM — Authentication & RBAC                   │ Weeks  6–9
PHASE 4  │ Tenant Onboarding & Administration            │ Weeks  9–11
PHASE 5  │ Contact & Account Management                  │ Weeks 10–13
PHASE 6  │ Lead & Opportunity Management                 │ Weeks 12–15
PHASE 7  │ Activity Tracking & Timeline                  │ Weeks 14–17
PHASE 8  │ Pipeline & Deal Management (Kanban)           │ Weeks 16–19
PHASE 9  │ Task & Workflow Automation Engine             │ Weeks 18–22
PHASE 10 │ Notifications & Alerts                        │ Weeks 20–23
PHASE 11 │ Reporting & Analytics                         │ Weeks 22–26
PHASE 12 │ Integration Framework (REST + GraphQL + WH)   │ Weeks 24–28
PHASE 13 │ Data Import / Export                          │ Weeks 26–29
PHASE 14 │ External Integrations                         │ Weeks 28–34
PHASE 15 │ Audit, Compliance & Data Governance           │ Weeks 18–34
PHASE 16 │ Mobile Application (React Native)             │ Weeks 20–34
PHASE 17 │ Performance, Security & NFR Hardening         │ Weeks 30–36
PHASE 18 │ UAT, Documentation & GA Launch                │ Weeks 35–40
```

> Phases 1–4 are strictly sequential. Phases 5 onwards have parallel tracks possible with adequate team size.

---

## PHASE 0 — Technical Architecture & Foundation Documents

> **Goal:** Produce all binding design artefacts before a single line of product code is written. Every downstream phase references these documents.

---

### TASK-001 — Technical Architecture Document (TAD)

**Effort:** ~5d | **Role:** Lead Architect | **Priority:** P1

**Purpose:** The master architectural blueprint that all engineers reference. Without this, implementation decisions diverge.

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 001.1 | System context diagram | C4 Level 1: OpsNext in relation to external systems (browser, mobile, Salesforce, Zoho, PowerApps, Excel, email, calendar) |
| 001.2 | Container diagram | C4 Level 2: Web App, API Server, Worker Service, Search Service, Analytics Service, all data stores — with protocols between each |
| 001.3 | Component diagram | C4 Level 3: Internal breakdown of API Server — Router, Middleware, Service Layer, Repository Layer, Event Bus |
| 001.4 | Data flow diagrams | DFDs for: tenant onboarding, user authentication, CRUD entity lifecycle, import pipeline, workflow execution, notification dispatch |
| 001.5 | Sequence diagrams | UML sequences for: login + refresh token, create contact, convert lead, trigger workflow, bulk import, Salesforce sync |
| 001.6 | ADRs (Architecture Decision Records) | Document decisions: schema-per-tenant vs row-level isolation; Fastify vs NestJS; Prisma vs Drizzle; BullMQ vs SQS; Typesense vs Elasticsearch |
| 001.7 | Technology matrix | Full dependency matrix: package name, version pinned, licence, security advisory check, upgrade path |
| 001.8 | API versioning strategy | URL prefix (`/api/v1`), deprecation lifecycle, breaking vs non-breaking change policy |
| 001.9 | Error handling standard | Standardised error envelope `{ code, message, details[], traceId }`, HTTP status mapping, error code registry |
| 001.10 | Logging & observability standard | Structured JSON log schema (service, tenantId, userId, traceId, spanId, level, message, duration), log levels, sampling rates |

**Acceptance Criteria:**
- TAD reviewed and signed off by Lead Architect, Product Owner, and Security Lead
- All ADRs have recorded context, decision, and consequences
- Document version-controlled in `/docs/architecture/`

---

### TASK-002 — Database Design Document (DDD)

**Effort:** ~4d | **Role:** Lead Architect + DBA | **Priority:** P1  
**depends:** TASK-001

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 002.1 | Entity-Relationship Diagram | Full ERD covering all 15+ core entities: Tenant, User, Role, Permission, Contact, Account, Lead, Opportunity, Activity, Task, Pipeline, Stage, Workflow, WorkflowExecution, AuditLog, Notification, ImportJob |
| 002.2 | Schema-per-tenant design | Document the `public` (platform) schema vs `tenant_{slug}` schema split; which tables live in each; how Prisma migrations handle both |
| 002.3 | Custom fields architecture | Design JSONB-based custom field storage on core entities with index strategy; `custom_field_definitions` table (type, validation rules, display order) in tenant schema |
| 002.4 | Audit log table design | Append-only `audit_logs` table with BRIN index on timestamp; partition strategy by month; retention job design |
| 002.5 | Index strategy | Composite indexes for all common query patterns: owner + status, tenant + entity type, created_at ranges; explain the covering index choices |
| 002.6 | Soft delete strategy | `deleted_at` timestamptz column on mutable entities; partial indexes to exclude soft-deleted rows from standard queries |
| 002.7 | Connection pooling design | PgBouncer configuration: pool_mode=transaction, max_client_conn, pool sizes per environment; Prisma datasource url config |
| 002.8 | Migration strategy | Prisma migrate conventions: additive-only migrations for live tenants; shadow database approach; rollback playbook |
| 002.9 | Seed data specification | Specify what seed data populates each environment; default pipeline stages, roles, permissions, sample tenant |

**Deliverables:** `/docs/database/ERD.png`, `/docs/database/DATABASE_DESIGN.md`

---

### TASK-003 — API Design Document

**Effort:** ~3d | **Role:** Lead Backend Engineer | **Priority:** P1  
**depends:** TASK-002

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 003.1 | REST API resource taxonomy | Define all resource paths, HTTP verbs, nested routes (e.g., `/v1/accounts/:id/contacts`), query parameter conventions |
| 003.2 | OpenAPI 3.1 skeleton | Draft spec file with all endpoints stubbed: path, method, request schema, response schema, auth requirement, rate limit tier |
| 003.3 | Pagination standard | Cursor-based pagination (for large datasets) vs offset (for reports); response envelope `{ data[], meta: { nextCursor, total } }` |
| 003.4 | Bulk endpoint design | POST `/v1/contacts/bulk` — max batch size, partial success handling, error array format |
| 003.5 | Filtering & sorting spec | `filter[field][op]=value` pattern; supported operators per field type; sort parameter convention |
| 003.6 | Webhook payload schema | Standard event envelope: `{ eventId, eventType, tenantId, timestamp, data, signature }` |
| 003.7 | GraphQL schema draft | Type definitions for all core entities, queries, mutations; relay-style cursor connection pattern |
| 003.8 | Rate limit headers spec | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After` — document per tier |

**Deliverables:** `/docs/api/openapi.yaml`, `/docs/api/API_DESIGN.md`

---

### TASK-004 — Security Architecture Document

**Effort:** ~3d | **Role:** Security Lead | **Priority:** P1  
**depends:** TASK-001

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 004.1 | Threat model | STRIDE analysis for: authentication flows, API endpoints, data import, webhook delivery, admin operations |
| 004.2 | Auth flow specification | Detailed flows for: password login, token refresh, MFA enrolment, TOTP verification, OAuth PKCE flow, SAML assertion handling |
| 004.3 | Secrets management plan | Which secrets go in Secrets Manager vs env vars; rotation schedule; developer local-dev secret handling (no real secrets in .env) |
| 004.4 | Encryption-at-rest plan | PostgreSQL Transparent Data Encryption; S3 SSE-S3; Redis auth + TLS; field-level encryption keys per tenant |
| 004.5 | OWASP Top 10 mitigation checklist | Per each OWASP item: specific controls in place in OpsNext (input validation via Zod, parameterised queries via Prisma, CSP headers, CORS policy, etc.) |
| 004.6 | GDPR compliance checklist | Data subject rights implementation plan: access (export), rectification (update), erasure (anonymisation), portability; DPA register |
| 004.7 | Penetration test plan | Scope, timeline, tooling (OWASP ZAP, Burp Suite), findings remediation SLA |

**Deliverables:** `/docs/security/SECURITY_ARCHITECTURE.md`, `/docs/security/THREAT_MODEL.md`

---

### TASK-005 — DevOps & Infrastructure Design Document

**Effort:** ~2d | **Role:** DevOps Lead | **Priority:** P1  
**depends:** TASK-001

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 005.1 | Monorepo structure design | Turborepo workspace layout: `apps/web`, `apps/api`, `apps/worker`, `apps/mobile`, `packages/db`, `packages/shared`, `packages/config` |
| 005.2 | CI/CD pipeline design | GitHub Actions workflows: PR checks (lint, typecheck, unit test, build), merge-to-main (integration test, staging deploy), release (canary → prod) |
| 005.3 | Kubernetes resource design | Namespace layout; Deployment, Service, HPA, PodDisruptionBudget, ResourceQuota specs per service; resource requests/limits |
| 005.4 | Terraform module structure | Module breakdown: `vpc`, `eks`, `rds`, `elasticache`, `s3`, `cloudfront`, `secrets`, `dns`; state backend config (S3 + DynamoDB lock) |
| 005.5 | Environment parity checklist | What differs dev/staging/prod: resource sizes, replicas, feature flags, external service credentials |
| 005.6 | Observability stack design | OpenTelemetry collector config; Prometheus scrape targets; Grafana dashboard templates; Loki log pipeline; alerting rules and PagerDuty routing |
| 005.7 | Disaster recovery plan | RTO/RPO targets; PostgreSQL backup schedule (daily snapshots + WAL streaming to S3); Redis persistence config; DR runbook |

**Deliverables:** `/docs/devops/INFRASTRUCTURE_DESIGN.md`, `/docs/devops/DR_RUNBOOK.md`

---

## PHASE 1 — Monorepo, CI/CD & Infrastructure Bootstrap

> **Goal:** Working local development environment, passing CI pipeline, and deployed staging skeleton. No business logic yet.

---

### TASK-006 — Monorepo Initialisation

**Effort:** ~2d | **Role:** Lead BE + DevOps | **Priority:** P1  
**depends:** TASK-005

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 006.1 | Initialise Turborepo workspace | `npx create-turbo@latest`; configure `turbo.json` pipeline (build, test, lint, typecheck tasks with caching); `.npmrc` with exact versions |
| 006.2 | Create workspace packages | `apps/web` (Next.js 15), `apps/api` (Fastify), `apps/worker` (Node.js BullMQ processor), `packages/db` (Prisma client + schema), `packages/shared` (Zod schemas, types, utils), `packages/config` (ESLint, TypeScript, Tailwind configs) |
| 006.3 | TypeScript configuration | Root `tsconfig.base.json`; per-app extends; strict mode; path aliases (`@opsnext/db`, `@opsnext/shared`); composite projects for incremental builds |
| 006.4 | Linting & formatting | ESLint flat config with `@typescript-eslint`, `eslint-plugin-import`, `eslint-plugin-security`; Prettier; Husky pre-commit + lint-staged |
| 006.5 | Git configuration | `.gitignore` (node_modules, .env, dist, .next, build); branch protection rules documentation; commit message convention (Conventional Commits) |
| 006.6 | Environment variable management | `dotenv-flow` setup; `.env.example` with all required vars documented; Zod-based env validation module in `packages/config/env.ts` that fails fast on startup |
| 006.7 | Docker Compose (dev) | Services: `postgres`, `redis`, `typesense`, `minio` (S3-compatible local); health checks; named volumes; `.env` injection |

**Acceptance Criteria:**
- `pnpm install && pnpm build` completes with zero errors across all workspaces
- `docker compose up` starts all dev dependencies within 60 seconds
- `pnpm lint` and `pnpm typecheck` pass on fresh clone

---

### TASK-007 — CI/CD Pipeline Setup

**Effort:** ~3d | **Role:** DevOps | **Priority:** P1  
**depends:** TASK-006

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 007.1 | GitHub Actions — PR workflow | Triggers on PR open/sync; steps: checkout, setup pnpm, restore Turborepo cache, install, lint, typecheck, unit tests, build; fail-fast; post summary comment |
| 007.2 | GitHub Actions — merge workflow | Triggers on merge to `main`; runs full integration test suite with live Docker Compose services; on success, builds Docker images and pushes to ECR with `sha-XXXXXXX` tag |
| 007.3 | GitHub Actions — release workflow | Manual trigger with version input; semantic version tag; runs staging deploy; requires manual approval gate before prod |
| 007.4 | Docker multi-stage builds | `Dockerfile` for each app: `deps → builder → runner` stages; non-root user; `.dockerignore`; layer caching optimisation; final image < 300 MB |
| 007.5 | ArgoCD setup | Install ArgoCD in cluster; configure Git repo connection; create Application CRDs for staging and prod environments; sync policy (automated for staging, manual for prod) |
| 007.6 | Kubernetes manifests | Base manifests in `infra/k8s/base/`; Kustomize overlays in `infra/k8s/overlays/staging` and `infra/k8s/overlays/prod`; resource limits, liveness/readiness probes per service |
| 007.7 | Secrets injection | External Secrets Operator setup; SecretStore pointing to AWS Secrets Manager; ExternalSecret manifests that sync at deploy time |
| 007.8 | Smoke test job | Post-deploy Kubernetes Job that hits `/health` and `/api/v1/health` on each service; fails deployment if unhealthy |

---

### TASK-008 — Terraform Infrastructure Provisioning (Staging)

**Effort:** ~4d | **Role:** DevOps | **Priority:** P1  
**depends:** TASK-007

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 008.1 | Terraform state backend | S3 bucket + DynamoDB table for remote state; separate state files per environment; workspace strategy |
| 008.2 | VPC module | 3 AZ deployment; public subnets (ALB, NAT GW), private subnets (EKS nodes, RDS), isolated subnets (RDS standby); VPC flow logs to CloudWatch |
| 008.3 | EKS cluster module | Managed node groups (t3.medium for staging, m5.xlarge for prod); IRSA (IAM Roles for Service Accounts); cluster autoscaler; AWS CNI; CoreDNS |
| 008.4 | RDS PostgreSQL module | PostgreSQL 16 Multi-AZ; parameter group (max_connections=500, shared_buffers, work_mem tuned); automated backups 7 days; performance insights enabled |
| 008.5 | ElastiCache Redis module | Redis 7 cluster mode disabled (staging), cluster mode enabled (prod); at-rest + in-transit encryption; auth token |
| 008.6 | S3 buckets | `opsnext-imports-{env}`, `opsnext-exports-{env}`, `opsnext-attachments-{env}`; versioning on imports; lifecycle rules to Glacier after 90 days; no public access |
| 008.7 | Secrets Manager secrets | Skeleton secrets created: `opsnext/{env}/db`, `opsnext/{env}/redis`, `opsnext/{env}/jwt`, `opsnext/{env}/stripe`, `opsnext/{env}/resend` |
| 008.8 | Cloudflare configuration | DNS zone import; CNAME records for `app.opsnext.io`, `api.opsnext.io`; WAF rules: rate limit, bot management, OWASP ruleset |
| 008.9 | Outputs documentation | All Terraform outputs (cluster endpoint, DB URL, Redis endpoint) documented; used in CI/CD secrets rotation |

---

### TASK-009 — Observability Stack Setup

**Effort:** ~2d | **Role:** DevOps | **Priority:** P1  
**depends:** TASK-008

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 009.1 | OpenTelemetry Collector | Deploy otel-collector DaemonSet; configure receivers (otlp grpc/http), processors (batch, memory_limiter, resource), exporters (prometheus, loki, tempo) |
| 009.2 | Prometheus + Grafana | Deploy kube-prometheus-stack via Helm; configure persistent storage; import OpsNext dashboard templates (API latency, DB connections, queue depth, error rate) |
| 009.3 | Loki log aggregation | Deploy Loki; configure Promtail DaemonSet; label strategy: namespace, pod, container, tenantId (extracted from log JSON) |
| 009.4 | Tempo distributed tracing | Deploy Tempo; configure trace sampling (1% prod, 100% staging); Grafana Trace Explore datasource |
| 009.5 | Sentry project setup | Create OpsNext org in Sentry; projects per service (api, web, worker, mobile); DSN secrets in Secrets Manager; release tracking integration with GitHub |
| 009.6 | Alerting rules | PagerDuty routing: API error rate > 1% → page; DB connection saturation > 80% → page; pod restart loop → notify; job queue depth > 1000 → notify |

---

## PHASE 2 — Database Design & Multi-Tenancy Core

> **Goal:** Working database layer with tenant isolation fully proven before any business logic is built on top.

---

### TASK-010 — Prisma Schema — Platform (Public) Schema

**Effort:** ~3d | **Role:** DBA + BE | **Priority:** P1  
**depends:** TASK-002, TASK-006

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 010.1 | `Tenant` model | Fields: id (cuid), slug (unique, regex-validated), name, status (ACTIVE/SUSPENDED/DELETED), subscriptionTier (BASIC/PROFESSIONAL/ENTERPRISE), schemaName, createdAt, updatedAt, deletedAt; indexes on slug, status |
| 010.2 | `TenantConfig` model | One-to-one with Tenant; fields: logoUrl, primaryColor, timezone, currency, language, dateFormat, featureFlags (JSONB), ssoProvider, ssoConfig (encrypted JSONB) |
| 010.3 | `TenantUsageMetrics` model | Denormalised metrics updated by background job: userCount, contactCount, apiCallsThisMonth, storageBytes; reset job schedule |
| 010.4 | `PlatformAdmin` model | Separate from tenant users; fields: id, email (unique), passwordHash, mfaEnabled, lastLoginAt, createdAt |
| 010.5 | `TenantSubscription` model | Fields: tenantId, stripeCustomerId, stripePriceId, status, currentPeriodStart, currentPeriodEnd; Stripe webhook event log |
| 010.6 | Platform schema migration | First migration file; verify `prisma migrate dev` creates public schema tables cleanly; seed with one test tenant |

→ **FRD:** MT-01, MT-06, MT-07, TEN-F-07

---

### TASK-011 — Prisma Schema — Tenant Schema (Core Entities)

**Effort:** ~5d | **Role:** DBA + BE | **Priority:** P1  
**depends:** TASK-010

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 011.1 | `User` model | Fields: id, email (unique within tenant), passwordHash, firstName, lastName, avatarUrl, status (ACTIVE/INVITED/DEACTIVATED), mfaEnabled, mfaSecret (encrypted), passwordChangedAt, failedLoginAttempts, lockedUntil, createdAt, updatedAt; index on email |
| 011.2 | `Role` model | Fields: id, name (unique within tenant), description, isSystem (bool — system roles cannot be deleted), createdAt; built-in roles seeded: SUPER_ADMIN, TENANT_ADMIN, SALES_MANAGER, SALES_REP, READ_ONLY |
| 011.3 | `Permission` model | Fields: id, resource (enum: CONTACT, ACCOUNT, LEAD, OPPORTUNITY, PIPELINE, REPORT, WORKFLOW, USER, SETTING), action (enum: CREATE, READ, UPDATE, DELETE, EXPORT), scope (ALL/OWN) |
| 011.4 | `UserRole`, `RolePermission` join tables | UserRole: userId + roleId + assignedAt + assignedBy; RolePermission: roleId + permissionId |
| 011.5 | `Session` model | Fields: id, userId, token (hashed), refreshToken (hashed), expiresAt, ipAddress, userAgent, createdAt; index on token, userId |
| 011.6 | `CustomFieldDefinition` model | Fields: id, entityType (enum), fieldKey (slug, unique per entity+tenant), label, fieldType (TEXT/NUMBER/DATE/DROPDOWN/MULTI_SELECT/BOOLEAN/URL/EMAIL), options (JSONB for dropdowns), required, displayOrder, createdAt |
| 011.7 | `Account` model | Fields: id, name, domain, industry, size (enum), annualRevenue, currency, website, description, address (JSONB), ownerId, parentAccountId (self-ref), tags (text[]), source, customFields (JSONB), createdAt, updatedAt, deletedAt; GIN index on tags, customFields |
| 011.8 | `Contact` model | Fields: id, firstName, lastName, email (unique within tenant), phones (JSONB array), title, accountId, ownerId, address (JSONB), socialHandles (JSONB), tags (text[]), source, leadSource, customFields (JSONB), createdAt, updatedAt, deletedAt; GIN index on tags, customFields; partial index on email where deletedAt IS NULL |
| 011.9 | `Lead` model | Fields: id, firstName, lastName, email, phone, company, source, status (enum with configurable values), ownerId, score (0-100), convertedAt, convertedToContactId, convertedToAccountId, convertedToOpportunityId, customFields (JSONB), createdAt, updatedAt, deletedAt |
| 011.10 | `Pipeline` model | Fields: id, name, description, isDefault (bool), isActive, createdBy, createdAt, updatedAt |
| 011.11 | `PipelineStage` model | Fields: id, pipelineId, name, displayOrder, probability (0-100), isClosed (bool), isWon (bool), requiredFields (text[]), rotColor, createdAt |
| 011.12 | `Opportunity` model | Fields: id, name, accountId, contactId, pipelineId, stageId, ownerId, value, currency, probability, expectedCloseDate, closeReason, closeNote, customFields (JSONB), createdAt, updatedAt, deletedAt; index on stageId, ownerId, expectedCloseDate |
| 011.13 | `OpportunityStageHistory` model | Fields: id, opportunityId, fromStageId, toStageId, changedBy, changedAt, durationInPreviousStage (computed) |
| 011.14 | `Activity` model | Fields: id, type (CALL/EMAIL/MEETING/NOTE/TASK), entityType (enum), entityId, subject, body, outcome, durationMinutes, scheduledAt, completedAt, participants (JSONB), attachments (JSONB), ownerId, createdAt, updatedAt |
| 011.15 | `Task` model | Fields: id, title, description, priority (LOW/MEDIUM/HIGH/URGENT), status (OPEN/IN_PROGRESS/COMPLETED/CANCELLED), dueAt, completedAt, assigneeId, entityType, entityId, reminderAt, createdBy, createdAt, updatedAt; index on assigneeId + status + dueAt |
| 011.16 | `Workflow` model | Fields: id, name, description, isActive, triggerType (enum), triggerConfig (JSONB), conditions (JSONB array), actions (JSONB array), runCount, lastRunAt, createdBy, createdAt, updatedAt |
| 011.17 | `WorkflowExecution` model | Fields: id, workflowId, triggerEntityType, triggerEntityId, status (PENDING/RUNNING/SUCCESS/FAILED/SKIPPED), startedAt, completedAt, actionResults (JSONB array), errorMessage |
| 011.18 | `Notification` model | Fields: id, userId, type, title, body, data (JSONB), readAt, createdAt; index on userId + readAt |
| 011.19 | `AuditLog` model | Append-only; fields: id (bigserial), entityType, entityId, action (CREATE/UPDATE/DELETE), userId, ipAddress, userAgent, before (JSONB), after (JSONB), createdAt; BRIN index on createdAt |
| 011.20 | `ImportJob` model | Fields: id, entityType, status (PENDING/PROCESSING/COMPLETED/FAILED), fileName, fileUrl, totalRows, processedRows, errorRows, fieldMapping (JSONB), errorReport (JSONB), createdBy, createdAt, completedAt |
| 011.21 | Seed data script | Prisma seed: default pipeline with 5 stages, 5 roles with permissions, 1 admin user, 10 sample contacts/accounts/leads for dev/staging |

→ **FRD:** All CON, LEAD, PIPE, ACT, WF, RPT, AUD requirements

---

### TASK-012 — Multi-Tenancy Middleware

**Effort:** ~3d | **Role:** BE | **Priority:** P1  
**depends:** TASK-011

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 012.1 | Tenant resolution service | Extract tenant from: subdomain (`acme.opsnext.io`), JWT claim (`tenantId`), API key lookup; throw 401 if no valid tenant context |
| 012.2 | Prisma schema routing | `PrismaClient` factory that sets `search_path` to `tenant_{slug}` per request; connection pooling via PgBouncer in transaction mode |
| 012.3 | Fastify tenant plugin | `fastify-plugin` that attaches `request.tenantContext` (tenantId, slug, tier, config); registered globally before all routes |
| 012.4 | Tenant isolation unit tests | Test suite proving: request without tenant → 401; tenant A cannot query tenant B data even with valid JWT; schema search_path correctly set per request context |
| 012.5 | Tenant provisioning service | `TenantProvisioningService.create(tenantData)`: creates public-schema Tenant record → runs Prisma migration against new schema → seeds default data → returns tenant object; runs in transaction |
| 012.6 | Tenant schema migration strategy | Script to apply latest Prisma migrations to all existing tenant schemas (used in CD pipeline after migration); idempotent; dry-run mode |

→ **FRD:** MT-01, MT-02, MT-03, MT-08

---

### TASK-013 — Search Engine Integration (Typesense)

**Effort:** ~2d | **Role:** BE | **Priority:** P1  
**depends:** TASK-012

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 013.1 | Typesense collection schemas | Define collections per entity type per tenant: `{tenantId}_contacts`, `{tenantId}_accounts`, `{tenantId}_leads`, `{tenantId}_opportunities`; field types, facets, default sorting |
| 013.2 | Search sync service | Event-driven: on entity CREATE/UPDATE/DELETE in Postgres → publish to BullMQ `search-sync` queue → worker upserts/deletes Typesense document |
| 013.3 | Global search endpoint | `GET /api/v1/search?q=term&types[]=contact,account` → fan-out to Typesense collections → merge and rank results → return unified response |
| 013.4 | Backfill job | One-time script to populate Typesense from Postgres for existing tenants; chunked 500 rows at a time; progress tracking |
| 013.5 | Search latency test | Verify P95 < 500 ms with 100K records using Artillery or k6 load test |

→ **FRD:** CON-F-06

---

## PHASE 3 — IAM — Authentication & RBAC

> **Goal:** Secure, tested authentication and authorisation layer. No CRM features until auth is proven.

---

### TASK-014 — User Registration & Email Verification

**Effort:** ~2d | **Role:** BE | **Priority:** P1  
**depends:** TASK-012

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 014.1 | `POST /api/v1/auth/register` | Validate email format (Zod); check uniqueness within tenant schema; bcrypt hash password (rounds=12); create User record (status=INVITED); generate email verification token (crypto.randomBytes, store SHA-256 hash in DB, 24h expiry) |
| 014.2 | Email verification flow | `GET /api/v1/auth/verify-email?token=xxx`; look up token hash; activate user (status=ACTIVE); invalidate token; redirect to login with success message |
| 014.3 | Resend verification email | Rate-limited (3 per hour per email) `POST /api/v1/auth/resend-verification`; regenerate token; send via Resend |
| 014.4 | Email templates | React Email template for: verification email, welcome email; plain-text fallback; tenant branding injected (logo, colours) |
| 014.5 | Registration unit tests | Test: valid registration; duplicate email; invalid email; weak password; token expiry; double verification attempt |

→ **FRD:** IAM-F-01, TEN-F-01

---

### TASK-015 — Login, JWT & Refresh Token

**Effort:** ~2d | **Role:** BE | **Priority:** P1  
**depends:** TASK-014

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 015.1 | `POST /api/v1/auth/login` | Validate credentials; bcrypt compare; check account lock (`lockedUntil`); on fail → increment `failedLoginAttempts`, lock after 5 (configurable); on success → reset counter; issue access token (JWT, 8h) + refresh token (opaque, 30d); set httpOnly Secure SameSite=Strict cookie for refresh token |
| 015.2 | JWT structure | Payload: `{ sub: userId, tenantId, email, roles: string[], tier, iat, exp }`; signed with RS256 (asymmetric); public key endpoint at `/api/v1/.well-known/jwks.json` for external verification |
| 015.3 | `POST /api/v1/auth/refresh` | Read refresh token from httpOnly cookie; validate not revoked (Redis set `revoked:{tokenId}`); issue new access token + rotate refresh token; revoke old refresh token |
| 015.4 | `POST /api/v1/auth/logout` | Revoke current refresh token in Redis; clear httpOnly cookie; add access token JTI to Redis deny-list (until expiry) |
| 015.5 | Account lockout mechanism | After 5 (configurable per tenant) failures: set `lockedUntil = now + 15min`; send account-locked email; admin unlock endpoint `POST /api/v1/admin/users/:id/unlock` |
| 015.6 | Auth middleware | Fastify `onRequest` hook: extract Bearer token; verify JWT signature + expiry; check JTI deny-list; attach `request.user` (userId, tenantId, roles); reject with 401 if invalid |
| 015.7 | Token lifecycle tests | Test: valid login; wrong password × 5 lockout; expired access token; refresh rotation; logout revocation; replay attack on revoked refresh token |

→ **FRD:** IAM-F-01, IAM-F-02, IAM-F-07

---

### TASK-016 — Multi-Factor Authentication (MFA)

**Effort:** ~2d | **Role:** BE | **Priority:** P1  
**depends:** TASK-015

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 016.1 | TOTP enrolment | `POST /api/v1/auth/mfa/enrol/totp` → generate TOTP secret (speakeasy); return QR code URI; store secret encrypted in `mfaSecret` field; not active until verified |
| 016.2 | TOTP verification & activation | `POST /api/v1/auth/mfa/verify-totp` → validate 6-digit code; if valid: set `mfaEnabled=true`, generate 10 backup codes (bcrypt each, store), return backup codes once |
| 016.3 | MFA login step | After successful password auth: if `mfaEnabled=true` → return partial session token (scope=MFA_PENDING); require `POST /api/v1/auth/mfa/challenge` with TOTP code before issuing full access token |
| 016.4 | SMS OTP (optional) | Integrate Twilio Verify API; `POST /api/v1/auth/mfa/enrol/sms` → send SMS with OTP; verify and activate; fallback if TOTP not available |
| 016.5 | Backup codes | `POST /api/v1/auth/mfa/backup-code` → accept one backup code; invalidate used code; warn if < 3 remaining; regenerate endpoint (requires TOTP re-auth) |
| 016.6 | Admin MFA bypass | Tenant admin can force-disable MFA for a user (with audit log); used for account recovery |
| 016.7 | MFA integration tests | Full flow: enrol → login with MFA → use backup code → disable MFA → re-enrol |

→ **FRD:** IAM-F-03

---

### TASK-017 — RBAC — Roles & Permissions

**Effort:** ~3d | **Role:** BE | **Priority:** P1  
**depends:** TASK-015

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 017.1 | Permission seeding | Seed all 5 built-in roles with appropriate permissions matrix; SUPER_ADMIN has all; READ_ONLY has only READ on all resources |
| 017.2 | Permission check middleware | `requirePermission(resource, action)` Fastify hook factory; reads `request.user.roles`; loads role permissions from Redis cache (TTL 5min); throws 403 if not permitted |
| 017.3 | Ownership scope enforcement | For SALES_REP with scope=OWN: append `WHERE ownerId = currentUserId` to all queries; enforce at service layer, not controller |
| 017.4 | Custom role CRUD | `POST /api/v1/roles` (Tenant Admin only); validate no duplicate name; `PUT /api/v1/roles/:id/permissions` — replace permission set; `DELETE /api/v1/roles/:id` (cannot delete if users assigned) |
| 017.5 | User role assignment | `PUT /api/v1/users/:id/roles` — replace role set; audit logged; invalidate Redis permission cache for that user |
| 017.6 | Field-level permission metadata | `CustomFieldDefinition` has `visibleToRoles` and `editableByRoles` arrays; API response masks restricted fields; applied in entity service layer |
| 017.7 | RBAC unit tests | Test every permission combination for all 5 built-in roles against each resource/action pair; test ownership scope filtering |

→ **FRD:** IAM-F-04, IAM-F-05

---

### TASK-018 — SSO — OAuth 2.0 / OIDC

**Effort:** ~3d | **Role:** BE | **Priority:** P2  
**depends:** TASK-017

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 018.1 | OAuth PKCE flow | `GET /api/v1/auth/sso/:provider/authorize` → redirect to provider with state + PKCE challenge; `GET /api/v1/auth/sso/callback` → exchange code for tokens; look up or provision user; issue OpsNext session |
| 018.2 | Microsoft Entra ID connector | Register OpsNext app in Entra ID; configure scopes: `openid profile email`; map Entra claims to OpsNext user fields; tenant-specific client credentials stored encrypted |
| 018.3 | Google Workspace connector | Register in Google Console; same flow; support `hd` (hosted domain) claim to auto-assign tenant |
| 018.4 | SAML 2.0 connector | `passport-saml` or `samlify`; Service Provider metadata endpoint; validate assertions; map attributes; per-tenant IdP config UI |
| 018.5 | JIT provisioning | On first SSO login: auto-create User record in tenant schema with default role (configurable); send welcome email |
| 018.6 | SSO configuration UI | Tenant admin settings page: select provider, enter client ID/secret, set default role, enable/disable; test connection button |

→ **FRD:** IAM-F-06, MT-08

---

### TASK-019 — Password Management

**Effort:** ~1d | **Role:** BE | **Priority:** P1  
**depends:** TASK-015

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 019.1 | Forgot password | `POST /api/v1/auth/forgot-password` → generate secure reset token (30min expiry); send email with link; rate-limit 3 requests per hour per email; same response regardless of email existence |
| 019.2 | Reset password | `POST /api/v1/auth/reset-password` → validate token; enforce password policy; hash + save; invalidate all existing sessions for that user; send password-changed email |
| 019.3 | Change password (authenticated) | `PUT /api/v1/auth/change-password` → verify current password; validate new password against policy; rotate password; optionally invalidate other sessions |
| 019.4 | Password policy engine | Check: min length, uppercase, number, special char, not in last N passwords (store hashes of last 10); all configurable per tenant in TenantConfig |
| 019.5 | Admin password reset | Tenant admin `POST /api/v1/admin/users/:id/reset-password` → sends forced reset email; sets `passwordChangedAt = null` to force change on next login |

→ **FRD:** IAM-F-01, IAM-F-08

---

## PHASE 4 — Tenant Onboarding & Administration

---

### TASK-020 — Self-Service Tenant Registration

**Effort:** ~3d | **Role:** BE + FE | **Priority:** P1  
**depends:** TASK-017

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 020.1 | Registration API | `POST /api/v1/platform/tenants/register` — validate org name, generate slug (auto from org name, unique check), accept plan; create Stripe customer; call TenantProvisioningService; create first admin user |
| 020.2 | Stripe integration | Create Stripe customer on tenant creation; subscribe to selected plan price; store `stripeCustomerId` and `subscriptionId`; handle `checkout.session.completed` webhook to activate tenant |
| 020.3 | Onboarding wizard (FE) | 4-step wizard: (1) org details (name, industry, size), (2) preferences (timezone, currency, language), (3) admin user credentials, (4) plan selection; progress saved client-side so page refresh doesn't lose state |
| 020.4 | Post-registration setup | On completion: provision tenant schema, seed defaults, send welcome email with login link, provision Stripe trial if applicable; all steps within 30 seconds |
| 020.5 | Tenant slug validation | Real-time slug availability check `GET /api/v1/platform/tenants/check-slug?slug=xxx`; reserved words list (admin, api, app, www, etc.) |
| 020.6 | Onboarding completion checklist | In-app checklist widget shown after first login: (1) Invite team member, (2) Import contacts, (3) Create pipeline, (4) Set up first workflow — 60% completion threshold |

→ **FRD:** TEN-F-01, TEN-F-02, MT-01

---

### TASK-021 — Tenant Admin Panel

**Effort:** ~4d | **Role:** BE + FE | **Priority:** P1  
**depends:** TASK-020

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 021.1 | User management API | CRUD `/api/v1/admin/users`; `POST /invite` (generates invite token, sends email); `PUT /:id/status` (activate/deactivate); `PUT /:id/roles`; list with pagination + filter by status/role |
| 021.2 | User invitation flow | Invite email contains magic link (72h expiry); recipient clicks → sets password → account activated; invitation can be resent or revoked |
| 021.3 | Custom field builder API | CRUD `/api/v1/admin/custom-fields?entityType=CONTACT`; validation: fieldKey regex `[a-z_]`, no conflict with system fields; max 50 fields per entity |
| 021.4 | Custom field builder UI | Drag-and-drop field ordering; field type picker with live preview; dropdown options editor; required/optional toggle; entity type tab switcher |
| 021.5 | Tenant branding settings | `PUT /api/v1/admin/tenant/branding`; upload logo to S3 (max 2 MB, PNG/SVG/JPG); primary colour picker (hex); preview pane shows how login page and emails will look |
| 021.6 | Tenant general settings | Timezone picker (IANA tz database), currency selector (ISO 4217), language selector, date format, number format |
| 021.7 | Password policy settings | Tenant admin UI to configure: min length, complexity requirements, expiry days, history count, lockout threshold and duration |
| 021.8 | Billing dashboard | Current plan display, next billing date, usage meters (users, contacts, API calls vs limits), upgrade/downgrade CTA linking to Stripe Customer Portal |
| 021.9 | Platform admin panel | Separate `/platform-admin/` route (PLATFORM_ADMIN role only): list all tenants, view usage, suspend/reactivate, impersonate (with audit log), manually adjust limits |

→ **FRD:** TEN-F-03, TEN-F-04, TEN-F-05, TEN-F-07, MT-04, MT-06, MT-07

---

### TASK-022 — Tenant Settings — Pipeline Configuration

**Effort:** ~2d | **Role:** BE + FE | **Priority:** P2  
**depends:** TASK-021

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 022.1 | Pipeline CRUD API | `POST /api/v1/admin/pipelines`; `PUT /:id/stages` (replace stage list with display order); cannot delete pipeline if active opportunities exist — archive instead |
| 022.2 | Stage configuration | Each stage: name, probability, colour, required fields (from Contact/Opportunity field list), isClosed, isWon flags |
| 022.3 | Pipeline settings UI | Named pipelines list; stage builder with drag-to-reorder; probability slider per stage; colour swatch picker; required fields multi-select |
| 022.4 | Default pipeline | One pipeline marked as default (shown on Opportunities create form); admin can change default but cannot delete it without assigning new default |

→ **FRD:** TEN-F-05, PIPE-F-03

---

## PHASE 5 — Contact & Account Management

---

### TASK-023 — Account CRUD API

**Effort:** ~2d | **Role:** BE | **Priority:** P1  
**depends:** TASK-012, TASK-017

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 023.1 | `POST /api/v1/accounts` | Zod validation schema (name required, domain optional but validated as URL, industry enum, size enum); permission check CREATE_ACCOUNT; auto-set ownerId to current user if not provided (SALES_MANAGER+ can assign to others); emit `account.created` event; write AuditLog |
| 023.2 | `GET /api/v1/accounts` | List with cursor pagination (default 25 per page); filter params: ownerId, industry, size, tags, createdAt range; sort by name, createdAt, updatedAt; include custom fields in response |
| 023.3 | `GET /api/v1/accounts/:id` | Single account with relations: contacts count + top 5 contacts, open opportunities count + value, recent activities (last 5); ownership scope enforced |
| 023.4 | `PUT /api/v1/accounts/:id` | Partial update (PATCH semantics via PUT); JSONB merge for customFields (not replace); emit `account.updated` event with diff; write AuditLog with before/after |
| 023.5 | `DELETE /api/v1/accounts/:id` | Soft delete (set `deletedAt`); check for open opportunities — warn but allow; emit `account.deleted`; bulk delete endpoint `DELETE /api/v1/accounts/bulk` (max 100 IDs) |
| 023.6 | Duplicate detection | On create/update: query accounts with same `domain` (normalised, www stripped) or same `name` (trigram similarity ≥ 0.8); return 200 with `{ warnings: [{ type: 'DUPLICATE', matchId, matchName }] }` and continue; client shows confirmation modal |
| 023.7 | Account tests | Unit: validation, ownership scope; Integration: CRUD lifecycle, duplicate detection, soft delete exclusion from list |

→ **FRD:** CON-F-02, CON-F-04, AUD-F-01

---

### TASK-024 — Contact CRUD API

**Effort:** ~2d | **Role:** BE | **Priority:** P1  
**depends:** TASK-023

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 024.1 | `POST /api/v1/contacts` | Zod validation; email uniqueness check within tenant; link to Account (accountId optional); duplicate detection on email match → warning response; AuditLog write; search index sync via BullMQ |
| 024.2 | `GET /api/v1/contacts` | List with cursor pagination; filters: accountId, ownerId, tags (array contains), createdAt range, source; full-text via Typesense integration; export signal (adds `X-Total-Count` header) |
| 024.3 | `GET /api/v1/contacts/:id` | Single contact with: linked account, open opportunities, all activities timeline (paginated), tasks, email thread count |
| 024.4 | `PUT /api/v1/contacts/:id` | Partial update; phones/emails stored as JSONB array (can add/remove individual entries); JSONB merge for customFields; AuditLog |
| 024.5 | `DELETE /api/v1/contacts/:id` | Soft delete; remove from search index; bulk delete max 100 |
| 024.6 | Contact → Account association | `PUT /api/v1/contacts/:id/account` — link/unlink to account; single contact can be associated to multiple accounts (junction table); Account detail page shows all contacts |
| 024.7 | Duplicate merge | `POST /api/v1/contacts/:id/merge/:duplicateId` (SALES_MANAGER+): field-level merge UI — choose winner for each field; merge activities, opportunities, tasks to winner; soft-delete loser; AuditLog |
| 024.8 | Contact tags API | `PUT /api/v1/contacts/:id/tags` (replace all); `POST /api/v1/contacts/:id/tags` (add); `DELETE /api/v1/contacts/:id/tags/:tag` (remove); tags auto-suggest from existing tenant tags |

→ **FRD:** CON-F-01, CON-F-03, CON-F-04, CON-F-05

---

### TASK-025 — Dynamic Segmentation

**Effort:** ~2d | **Role:** BE | **Priority:** P2  
**depends:** TASK-024

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 025.1 | Filter engine | Recursive AND/OR filter tree parser; supports all standard field types + custom fields (from JSONB); operators: eq, neq, contains, starts_with, gt, lt, in, between, is_null, is_not_null |
| 025.2 | Segment model | `Segment` table: id, name, entityType, filterTree (JSONB), count (cached), lastComputedAt, isPinned, createdBy |
| 025.3 | `POST /api/v1/segments` | Save a filter tree as a named segment; immediately compute and cache count via background job |
| 025.4 | `GET /api/v1/contacts?segmentId=xxx` | Apply saved segment filter tree + any additional request filters; combine with AND |
| 025.5 | Segment count refresh | BullMQ cron job every 10 minutes recomputes count for all active segments; count displayed in sidebar with last-updated timestamp |

→ **FRD:** CON-F-07

---

### TASK-026 — Contact & Account Frontend (Web)

**Effort:** ~5d | **Role:** FE | **Priority:** P1  
**depends:** TASK-024, TASK-025

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 026.1 | Contacts list page | Table with virtual scroll (TanStack Virtual); column visibility toggle; bulk select + bulk action bar (delete, assign owner, add tag, export); saved views (pinned segments in sidebar); URL-state persistence for filters/sort |
| 026.2 | Contact detail page | Two-column layout: left (core info + custom fields + edit inline); right (activity timeline + tasks + linked opportunities); avatar upload to S3; tag editor inline |
| 026.3 | Accounts list page | Same pattern as contacts; industry facet sidebar; hierarchy view (parent/child accounts) as tree |
| 026.4 | Account detail page | KPI header (open deals count/value, contact count, last activity date); tabs: Contacts, Opportunities, Activities, Notes |
| 026.5 | Create/Edit forms | Slide-over panel (not full page navigation) for create/edit; React Hook Form + Zod validation; auto-save draft to `sessionStorage`; duplicate warning modal |
| 026.6 | Global search bar | Command palette (Cmd+K); Typesense-powered; grouped results by entity type; keyboard navigation; recent searches (localStorage); click navigates to entity detail |
| 026.7 | Import wizard UI | Step 1: upload CSV/XLSX; Step 2: auto-map columns to fields (confidence score shown); Step 3: validation preview (errors highlighted red, warnings yellow, success green); Step 4: confirm + submit; Step 5: progress polling + summary |
| 026.8 | Custom field rendering | `CustomFieldRenderer` component: renders correct input type based on fieldType; honours required, displayOrder; used in all entity forms uniformly |

→ **FRD:** CON-F-01 to CON-F-07

---

## PHASE 6 — Lead & Opportunity Management

---

### TASK-027 — Lead CRUD API

**Effort:** ~2d | **Role:** BE | **Priority:** P1  
**depends:** TASK-024

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 027.1 | Lead CRUD endpoints | Same pattern as Contact CRUD; additional fields: score (computed, not directly settable), status (validated against tenant's configured statuses), convertedAt |
| 027.2 | Lead status state machine | `LeadStatusService`: validate status transitions against configured allowed transitions; emit `lead.status_changed` event on each transition; write AuditLog |
| 027.3 | Lead conversion | `POST /api/v1/leads/:id/convert` → atomic transaction: create Contact + Account (optional) + Opportunity (optional) from lead data; set `convertedAt`; link IDs on lead; emit `lead.converted` event |
| 027.4 | Lead assignment rules engine | `LeadAssignmentService`: evaluate configured rules (round-robin pool, territory match, industry match, load balance by open leads count); assignee set atomically; emit `lead.assigned` event |
| 027.5 | Lead scoring engine | `LeadScoringService`: evaluate configurable rules (demographic: industry/size/title weight; behavioural: email opened, page visited, form submitted); recalculate on entity update; store score history |
| 027.6 | Lead tests | Status machine: valid and invalid transitions; conversion: all 3 conversion types; assignment: each rule type; scoring: rule evaluation |

→ **FRD:** LEAD-F-01, LEAD-F-02, LEAD-F-03, LEAD-F-04, LEAD-F-05

---

### TASK-028 — Opportunity CRUD API

**Effort:** ~2d | **Role:** BE | **Priority:** P1  
**depends:** TASK-027

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 028.1 | Opportunity CRUD endpoints | Full CRUD; validate stageId belongs to pipelineId; on create: set probability from stage default; AuditLog |
| 028.2 | Stage change handler | `OpportunityStageService.changeStage(id, newStageId, userId)`: validate transition; write `OpportunityStageHistory` record; compute `durationInPreviousStage`; if stage.isClosed: require close reason (if configured); emit `opportunity.stage_changed` event |
| 028.3 | Win/loss recording | `POST /api/v1/opportunities/:id/close` → body: `{ outcome: 'WON' | 'LOST', reason, note }`; validate reason is from configured list; set stage to terminal stage; emit `opportunity.closed` event |
| 028.4 | Opportunity value history | Append-only `OpportunityValueHistory` table tracks each value change with timestamp; used for forecast accuracy analysis |
| 028.5 | Bulk operations | `PUT /api/v1/opportunities/bulk/owner` (reassign up to 100 deals); `PUT /api/v1/opportunities/bulk/stage` |

→ **FRD:** LEAD-F-06, LEAD-F-07, LEAD-F-08

---

### TASK-029 — Lead & Opportunity Frontend

**Effort:** ~4d | **Role:** FE | **Priority:** P1  
**depends:** TASK-027, TASK-028

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 029.1 | Lead list page | Table view; status filter chips; score column with colour gradient (red-yellow-green); bulk actions; quick-convert button in row actions |
| 029.2 | Lead detail page | Score badge prominent; status stepper visualisation; conversion history; activity timeline |
| 029.3 | Lead conversion modal | 3-toggle selection (create Contact / Account / Opportunity); pre-filled fields from lead; confirm and redirect to newly created records |
| 029.4 | Lead scoring rules UI | Tenant admin: rule builder with field selector, operator, value, weight; total weight normalisation indicator; test against a sample lead |
| 029.5 | Opportunity list page | Table view with stacked bar showing pipeline distribution; filterable by pipeline, owner, close date range; expected value sum in footer |
| 029.6 | Opportunity detail page | Stage stepper with current stage highlighted; close date countdown; linked contact/account cards; value + probability prominently shown; stage history log |

→ **FRD:** LEAD-F-01 to LEAD-F-08

---

## PHASE 7 — Activity & Interaction Tracking

---

### TASK-030 — Activity Logging API

**Effort:** ~2d | **Role:** BE | **Priority:** P1  
**depends:** TASK-028

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 030.1 | Activity CRUD | `POST /api/v1/activities`; polymorphic entity link (entityType + entityId validated to exist in tenant schema); type-specific validation (CALL requires duration; MEETING requires participants) |
| 030.2 | Activity timeline | `GET /api/v1/entities/:type/:id/activities` — reverse chronological, paginated, filterable by type; includes tasks and workflow executions interleaved |
| 030.3 | Note pinning | Activities of type NOTE can be `pinned=true`; pinned notes appear at top of timeline regardless of date; maximum 3 pinned notes per entity |
| 030.4 | File attachments | `POST /api/v1/activities/:id/attachments` → pre-signed S3 upload URL (max 25 MB, allowed types: PDF/DOC/DOCX/PNG/JPG/MP3/MP4); attachment metadata stored in Activity.attachments JSONB |
| 030.5 | Activity edit / delete | Activities can be edited up to 24h after creation; delete (soft) any time; AuditLog tracks changes |

→ **FRD:** ACT-F-01, ACT-F-02

---

### TASK-031 — Email Capture Integration

**Effort:** ~3d | **Role:** BE | **Priority:** P2  
**depends:** TASK-030

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 031.1 | Gmail OAuth connector | `GET /api/v1/integrations/gmail/connect` → OAuth PKCE to Google; store refresh token (encrypted) per user; scopes: `gmail.readonly` |
| 031.2 | Email sync worker | BullMQ recurring job per connected user (every 15 min): fetch new messages via Gmail API; for each email: find matching contact by email address; create Activity(type=EMAIL) in matched contact's tenant schema |
| 031.3 | Outlook / M365 connector | Same pattern via Microsoft Graph API; `Mail.Read` scope; delta link for incremental sync |
| 031.4 | Email thread view | `GET /api/v1/contacts/:id/emails` — grouped by thread; rendered in timeline with expand/collapse; reply link opens email client |
| 031.5 | BCC-to-CRM | Provide tenant-specific BCC address (`crm+{tenantSlug}@mail.opsnext.io`); inbound mail handler (Resend webhooks or AWS SES) parses email, finds contact by FROM address, creates activity |
| 031.6 | Email connection settings UI | User settings page: connect/disconnect Gmail or Outlook; show last sync time; manual re-sync button; disconnect revokes token |

→ **FRD:** ACT-F-03

---

### TASK-032 — Calendar Integration

**Effort:** ~2d | **Role:** BE | **Priority:** P2  
**depends:** TASK-031

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 032.1 | Google Calendar sync | OAuth `calendar.readonly` scope; sync events that have attendees matching CRM contact emails; create Activity(type=MEETING) linked to matched contacts |
| 032.2 | Microsoft 365 Calendar | Graph API `Calendars.Read`; same sync logic |
| 032.3 | Meeting outcome logging | After meeting time passes: in-app prompt "Log outcome for meeting: [title]"; click opens quick-log modal with outcome field and notes |
| 032.4 | Calendar display in timeline | Meeting activities show calendar icon, attendees, duration; "View in Calendar" deep link |

→ **FRD:** ACT-F-04

---

## PHASE 8 — Pipeline & Deal Management (Kanban)

---

### TASK-033 — Kanban Board Backend

**Effort:** ~1d | **Role:** BE | **Priority:** P1  
**depends:** TASK-028

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 033.1 | Pipeline view API | `GET /api/v1/pipelines/:id/board` → returns all stages with paginated opportunities (max 50 per stage, sorted by updatedAt desc); each opportunity card includes: name, account, value, expected close, owner avatar |
| 033.2 | Drag-and-drop stage update | `PATCH /api/v1/opportunities/:id/stage` — lightweight endpoint for Kanban drag (separate from full PUT to avoid over-posting); triggers stage change handler from TASK-028 |
| 033.3 | Pipeline filters | Board view supports same filters as list view (owner, date range, value range); filters passed as query params; board re-fetches per stage |
| 033.4 | Pipeline aggregates | `GET /api/v1/pipelines/:id/summary` → per-stage: count, total value, weighted value (value × probability); overall pipeline velocity (avg deal cycle time) |

→ **FRD:** PIPE-F-01, PIPE-F-02

---

### TASK-034 — Kanban Board Frontend

**Effort:** ~3d | **Role:** FE | **Priority:** P1  
**depends:** TASK-033

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 034.1 | Kanban board component | `@dnd-kit/core` for drag-and-drop; column per stage; virtual scroll within column (TanStack Virtual); optimistic UI update on drop (rollback on API error) |
| 034.2 | Deal card component | Compact card: deal name, account logo/name, value formatted with currency, expected close date (colour-coded: overdue = red, this week = orange), owner avatar, activity count badge |
| 034.3 | Stage column header | Stage name, deal count, total value; colour-coded per stage config; "Add Deal" quick-create button |
| 034.4 | Filter toolbar | Owner multi-select (avatar picker), date range picker, value range slider, pipeline switcher dropdown; filter state in URL params |
| 034.5 | Forecast view | Toggle between Kanban and Forecast table view; forecast table: stages as rows, week columns; cells show count + weighted value; chart below with bar chart |
| 034.6 | Stale deal badges | Cards with no activity in N+ days show amber "stale" badge (N configurable by tenant); hover tooltip shows last activity date |

→ **FRD:** PIPE-F-01, PIPE-F-02, PIPE-F-04, PIPE-F-05

---

## PHASE 9 — Task & Workflow Automation Engine

---

### TASK-035 — Task Management API & UI

**Effort:** ~2d | **Role:** BE + FE | **Priority:** P1  
**depends:** TASK-030

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 035.1 | Task CRUD API | Full CRUD; `reminderAt` field triggers scheduled BullMQ job to send notification; status transitions: OPEN→IN_PROGRESS→COMPLETED; bulk complete endpoint |
| 035.2 | Task views | `GET /api/v1/tasks?view=my` (assigneeId=me), `?view=team` (all visible per RBAC), `?view=overdue` (dueAt < now AND status != COMPLETED), `?view=upcoming` (dueAt within 7 days) |
| 035.3 | Task list UI | Checklist-style list; group by: due date (Today / This Week / Later / Overdue); click entity link navigates to related record; swipe to complete on mobile |
| 035.4 | Inline task creation | Quick-add task from entity detail pages (contact, account, opportunity) without navigating away; appears immediately in entity activity timeline |
| 035.5 | Task reminders | BullMQ delayed job created when `reminderAt` is set; job dispatches in-app + email notification at reminder time; reschedule if task due date changes |

→ **FRD:** WF-F-01, WF-F-02

---

### TASK-036 — Workflow Automation Engine

**Effort:** ~5d | **Role:** BE | **Priority:** P2  
**depends:** TASK-035

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 036.1 | Workflow data model | `Workflow.triggerConfig`: `{ entityType, event }`. `Workflow.conditions`: `[ { field, operator, value } ]` (AND logic). `Workflow.actions`: `[ { type, config } ]` (sequential) |
| 036.2 | Trigger event bus | Fastify lifecycle hook: after every service-layer mutation, emit domain event to Redis Pub/Sub channel `events:{tenantId}`; event payload: `{ eventType, entityType, entityId, before, after, userId, timestamp }` |
| 036.3 | Workflow evaluation worker | BullMQ `workflow-eval` queue; consumer: load all active workflows for tenant matching `entityType + event`; evaluate conditions against event payload; if match → enqueue `workflow-execute` job |
| 036.4 | Action executor | `WorkflowActionExecutor`: switch on action.type: `CREATE_TASK` (TaskService.create), `SEND_EMAIL` (Resend), `SEND_NOTIFICATION` (NotificationService), `UPDATE_FIELD` (EntityService.patch), `ASSIGN_OWNER` (EntityService.patch), `CALL_WEBHOOK` (axios POST with signature); each action result logged to `WorkflowExecution.actionResults` |
| 036.5 | Idempotency | `WorkflowExecution` has unique constraint on `(workflowId, triggerEntityId, triggerEventId)`; prevents double-execution on event replay |
| 036.6 | Error handling | Failed action: retry 3× with exponential back-off; after max retries: mark `WorkflowExecution.status = FAILED`; send alert to Tenant Admin; do not fail remaining actions in sequence |
| 036.7 | Workflow builder UI | Visual rule builder: trigger selector (entity type + event type dropdown); condition rows (field picker, operator picker, value input); action rows (action type + config form); enable/disable toggle; execution history table below |
| 036.8 | Date-triggered workflows | BullMQ cron job (daily): scan opportunities with `expectedCloseDate = today + X days`; emit `opportunity.close_date_approaching` event; triggers configured workflows |
| 036.9 | Workflow tests | Unit: condition evaluation (true/false for each operator); Integration: full end-to-end trigger → condition → action execution; idempotency test |

→ **FRD:** WF-F-03, WF-F-04, WF-F-05, WF-F-06

---

### TASK-037 — Email Sequences (Cadences)

**Effort:** ~3d | **Role:** BE + FE | **Priority:** P3  
**depends:** TASK-036

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 037.1 | Sequence data model | `EmailSequence`: steps array (delay days, template, subject, fromUser); enrolled contacts; pause/resume per contact |
| 037.2 | Enrolment API | `POST /api/v1/sequences/:id/enrol` → bulk or individual contact enrolment; duplicate enrolment check; BullMQ delayed jobs created for each step |
| 037.3 | Sequence execution | Each delayed job: check contact still enrolled + not replied + not unsubscribed; send email via Resend; track open/click via Resend webhooks; advance to next step or complete |
| 037.4 | Unsubscribe handling | One-click unsubscribe link in every sequence email; marks contact `emailOptOut=true`; never sends to opted-out contacts |
| 037.5 | Sequence analytics | Open rate, click rate, reply rate per step; per-contact status (Enrolled / Active / Replied / Completed / Unsubscribed) |

→ **FRD:** WF-F-07

---

## PHASE 10 — Notifications & Alerts

---

### TASK-038 — In-App Notification System

**Effort:** ~2d | **Role:** BE + FE | **Priority:** P1  
**depends:** TASK-036

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 038.1 | Notification creation service | `NotificationService.create(userId, type, title, body, data)` — write to `notifications` table; publish to Redis channel `notifications:{userId}` |
| 038.2 | Server-Sent Events endpoint | `GET /api/v1/notifications/stream` — SSE connection per authenticated user; subscribes to Redis channel; pushes new notifications in real-time; reconnect handled by browser EventSource |
| 038.3 | Notification bell UI | Bell icon in header with unread count badge; dropdown panel showing last 20 notifications; mark-all-read button; click navigates to related entity; real-time count updates via SSE |
| 038.4 | Notification preferences API | `GET/PUT /api/v1/users/me/notification-preferences` — per event type: in-app (always on), email (on/off); tenant admin can set defaults |
| 038.5 | Email notifications | `NotificationEmailJob` in BullMQ: for each notification where user has email enabled: render email template; send via Resend with 30-second delay (batch multiple events into one email if within window) |
| 038.6 | Notification types | Implement all FRD types: TASK_DUE, DEAL_STAGE_CHANGED, NEW_ASSIGNMENT, MENTION, WORKFLOW_TRIGGERED, IMPORT_COMPLETE, STALE_DEAL, SYSTEM_ALERT |

→ **FRD:** NOT-F-01, NOT-F-02

---

### TASK-039 — Outbound Webhooks

**Effort:** ~2d | **Role:** BE | **Priority:** P2  
**depends:** TASK-038

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 039.1 | Webhook subscription model | `WebhookSubscription` table: id, url (HTTPS only), secret (for HMAC signing), events (text[] of event types), isActive, failureCount, lastDeliveryAt |
| 039.2 | Webhook delivery worker | BullMQ `webhook-delivery` queue; POST payload to subscriber URL with `X-OpsNext-Signature: sha256={HMAC}` header and `X-OpsNext-Event-Type` header; 10s timeout |
| 039.3 | Retry & failure handling | Retry 5× with exponential back-off (1min, 5min, 30min, 2h, 24h); after 5 failures: set `isActive=false`; send admin alert; delivery log stored 30 days |
| 039.4 | Webhook management API | CRUD `/api/v1/webhooks`; `POST /test` → sends test payload to verify endpoint; delivery log `GET /api/v1/webhooks/:id/deliveries` |
| 039.5 | Webhook management UI | Subscription list with status indicator; secret shown once on creation; delivery log table with status, response code, latency; manual retry button |

→ **FRD:** NOT-F-04

---

### TASK-040 — Slack & Teams Notifications

**Effort:** ~2d | **Role:** BE + FE | **Priority:** P3  
**depends:** TASK-039

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 040.1 | Slack OAuth integration | OAuth 2.0 to install Slack app; store `bot_token` per tenant; channel picker; send Slack Block Kit message with entity link |
| 040.2 | Teams Incoming Webhook | Tenant admin provides Teams Incoming Webhook URL; POST Adaptive Card payloads |
| 040.3 | Alert configuration | Per integration: select which event types to send; mention specific users (by @email lookup); test alert button |

→ **FRD:** NOT-F-05

---

## PHASE 11 — Reporting & Analytics

---

### TASK-041 — Pre-Built Dashboard APIs

**Effort:** ~3d | **Role:** BE | **Priority:** P1  
**depends:** TASK-028

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 041.1 | Sales overview query | Metrics: total open opportunities count + value; closed-won MTD count + value vs prior period; conversion rate (leads → opportunities → won); average deal size; top 5 deals by value |
| 041.2 | Pipeline summary query | Per-stage: count, total value, weighted value, avg days in stage; overall velocity (avg lead time creation → closed-won) |
| 041.3 | Lead funnel query | Counts at each status; conversion rate between statuses; avg time in each status; source breakdown (pie chart data) |
| 041.4 | Activity report query | Activities per type per day (time series); per owner activity count; most active contacts; upcoming tasks due |
| 041.5 | Win/loss analysis query | Win rate by owner, by industry, by lead source, by pipeline stage; avg deal size won vs lost; loss reasons breakdown |
| 041.6 | All queries filterable | Every dashboard query endpoint accepts: `ownerId[]`, `pipelineId`, `dateRange.from`, `dateRange.to`, `teamId` query params |
| 041.7 | Query caching | ClickHouse or PostgreSQL materialized views refreshed every 15 minutes; Redis caches query results (TTL 5 min) keyed by params hash; cache invalidated on relevant entity write |

→ **FRD:** RPT-F-01, RPT-F-02

---

### TASK-042 — Custom Report Builder

**Effort:** ~4d | **Role:** BE + FE | **Priority:** P2  
**depends:** TASK-041

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 042.1 | Report definition model | `Report`: id, name, entityType, dimensions (text[]), measures (JSONB: field + aggregation), filters (JSONB), chartType, sortField, sortDir, limit, createdBy |
| 042.2 | Query builder service | `ReportQueryService.execute(reportDef)` → dynamically build Prisma query with GROUP BY, aggregations, filters; sanitise all inputs; max 5,000 rows in UI, unlimited for export |
| 042.3 | Report builder UI | Step 1: entity type; Step 2: drag-and-drop dimensions (x-axis) and measures (y-axis with aggregation picker: COUNT/SUM/AVG/MIN/MAX); Step 3: filters; Step 4: chart type picker; live preview chart |
| 042.4 | Saved reports | CRUD for saved reports; pin to dashboard; share with team (link with tenant-scoped auth); `GET /api/v1/reports/:id/data` refreshes on demand |
| 042.5 | Scheduled report delivery | Report scheduler: cron expression (or human-readable: daily/weekly/monthly), recipient emails, format (PDF/CSV); BullMQ cron job renders report and sends via Resend |
| 042.6 | Forecast report | Quota setup per user per period; forecast = closed-won + (open pipeline × probability); best-case = closed-won + open pipeline; table + bar chart view |

→ **FRD:** RPT-F-03, RPT-F-04, RPT-F-05

---

## PHASE 12 — Integration Framework

---

### TASK-043 — REST API Hardening & OpenAPI

**Effort:** ~3d | **Role:** BE | **Priority:** P1  
**depends:** All previous API tasks

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 043.1 | OpenAPI spec generation | Use `fastify-swagger` + `@fastify/swagger-ui`; all routes annotated with schema, response codes, auth requirements; generate `openapi.yaml` as CI artefact |
| 043.2 | API versioning | All routes under `/api/v1/`; version header `X-API-Version` also accepted; `Sunset` response header when version deprecated |
| 043.3 | Rate limiting | `@fastify/rate-limit` with Redis backing; per-tenant per-tier limits; `X-RateLimit-*` headers on all API responses; 429 response with `Retry-After` |
| 043.4 | API Key authentication | `ApiKey` model: id, keyHash (SHA-256 of raw key), prefix (first 8 chars for display), tenantId, name, lastUsedAt, expiresAt, scopes (text[]); `POST /api/v1/admin/api-keys` issues key (raw shown once) |
| 043.5 | OAuth 2.0 Client Credentials | For M2M integrations; `POST /api/v1/oauth/token` with `grant_type=client_credentials`; issues short-lived access token (1 hour) scoped to API key permissions |
| 043.6 | CORS configuration | Strict origin allowlist (tenant's configured domains + opsnext.io); `credentials: true`; pre-flight caching |
| 043.7 | Request/response logging | Every API request logged with: method, path, tenantId, userId, status, duration, traceId; no PII in logs (email/phone masked) |

→ **FRD:** INT-F-01, INT-F-02, INT-F-05

---

### TASK-044 — GraphQL API

**Effort:** ~3d | **Role:** BE | **Priority:** P2  
**depends:** TASK-043

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 044.1 | Mercurius setup | Register Mercurius plugin in Fastify; schema-first approach; playground enabled in non-prod environments |
| 044.2 | Core type definitions | GraphQL types for all entities mirroring REST; Relay-style connection types (edges, nodes, pageInfo) for all list queries |
| 044.3 | DataLoader for N+1 | `dataloader` instances per entity type per request context; batch loads accounts-for-contacts, contacts-for-opportunities |
| 044.4 | Query resolvers | Queries: contacts, contact(id), accounts, account(id), leads, opportunities, pipeline, activities; all respecting RBAC and tenant isolation |
| 044.5 | Mutation resolvers | createContact, updateContact, deleteContact; same for all entities; reuse service layer from REST |
| 044.6 | Subscription support | `contact_created`, `opportunity_stage_changed` over WebSocket via Mercurius subscriptions; Redis Pub/Sub as subscription transport |
| 044.7 | Query depth + complexity limits | Max query depth = 7; complexity limit = 1,000 (simple field = 1, list field = 10, nested list = 100); rate limit GraphQL endpoint separately |

→ **FRD:** INT-F-03

---

## PHASE 13 — Data Import / Export

---

### TASK-045 — CSV / Excel Import Pipeline

**Effort:** ~3d | **Role:** BE + FE | **Priority:** P1  
**depends:** TASK-024

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 045.1 | File upload endpoint | `POST /api/v1/imports/upload` (multipart form); validate file type (CSV/XLSX) and size (max 50 MB); store to S3 `opsnext-imports` bucket; create `ImportJob` record (status=PENDING); return jobId |
| 045.2 | Column detection service | Parse first row as headers; infer data types from first 20 data rows; return column list with `suggestedField` mapping for each column |
| 045.3 | Import validation worker | BullMQ `import-validate` queue; parse entire file; for each row: validate required fields, type coerce, check duplicates (batch email lookup); build error report (row index, column, errorCode, message); update job with `validationErrors` |
| 045.4 | Import execution worker | BullMQ `import-execute` queue; process in chunks of 500 rows using Prisma `createMany`; update `processedRows` counter in real-time; upsert on duplicate email (configurable); write to search index in batches |
| 045.5 | Import status polling | `GET /api/v1/imports/:jobId/status` → returns job status, processed/total rows progress, error count; used by frontend to show progress bar |
| 045.6 | Import completion notification | Email summary: total imported, skipped (duplicates), failed (errors); downloadable error report CSV attached |
| 045.7 | Export endpoints | `GET /api/v1/contacts/export?format=csv&filter[...]`; `GET /api/v1/accounts/export?format=xlsx`; streams response for large datasets; respects all active filters; max 100K rows |

→ **FRD:** IMP-F-01, IMP-F-02, IMP-F-03, IMP-F-06

---

## PHASE 14 — External Integrations

---

### TASK-046 — Excel Integration

**Effort:** ~3d | **Role:** BE + FE | **Priority:** P1  
**depends:** TASK-043

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 046.1 | Export to XLSX | Use `exceljs` library; styled output (header row bold + colour, column widths auto-fit, number/date formatting); all list views and report pages have "Export to Excel" button |
| 046.2 | XLSX import support | Import wizard (TASK-045) already handles `.xlsx`; add column type inference specific to Excel number/date serial format conversion |
| 046.3 | Excel Add-in manifest | Create Office Add-in `manifest.xml`; task pane add-in; registered on Microsoft AppSource (or sideloaded for enterprise) |
| 046.4 | Add-in backend API | Dedicated scoped API endpoints for Excel Add-in: `GET /api/v1/excel/contacts?email=xxx` (lookup by email); `PUT /api/v1/excel/contacts/:id` (update from sheet); `POST /api/v1/excel/contacts/sync` (batch upsert from selected range) |
| 046.5 | Add-in React UI | Task pane: login with OpsNext credentials; "Pull Contacts" button (downloads N contacts to sheet); "Push Changes" button (syncs modified rows back); conflict indicator for rows changed both in CRM and Excel |

→ **FRD:** XLS-I-01, XLS-I-02, XLS-I-03

---

### TASK-047 — Microsoft PowerApps Connector

**Effort:** ~3d | **Role:** BE | **Priority:** P2  
**depends:** TASK-043

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 047.1 | Custom connector definition | Write `apiDefinition.swagger.json` (Power Platform format); define all connector actions: GetContacts, GetContact, CreateLead, UpdateOpportunity, GetPipelines |
| 047.2 | Connector triggers | Power Platform polling triggers: `NewContact` (polls `GET /api/v1/contacts?createdAfter={triggerState}`), `OpportunityStageChanged`; return trigger state for incremental polling |
| 047.3 | OAuth policy | Register app in Entra ID with `api://opsnext` URI; token exchange policy in connector definition; user's Entra token exchanged for OpsNext API token |
| 047.4 | Connector testing | Import connector into Power Platform sandbox; build sample Power Automate flow: "When new OpsNext Lead → Send Teams message"; validate end-to-end |
| 047.5 | Connector certification | Submit for Microsoft Independent Publisher Connector certification; comply with Microsoft connector policies |

→ **FRD:** PWA-I-01, PWA-I-02, PWA-I-03

---

### TASK-048 — Salesforce Integration

**Effort:** ~5d | **Role:** BE + FE | **Priority:** P2  
**depends:** TASK-043

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 048.1 | Salesforce OAuth connector | OAuth 2.0 to Salesforce; store `access_token` + `refresh_token` (encrypted) per tenant; instance URL stored; `SalesforceConnection` model |
| 048.2 | Field mapping UI | Tenant admin: table showing SF Object fields ↔ OpsNext entity fields; auto-suggest based on name similarity; save mapping per entity type |
| 048.3 | One-time import worker | `POST /api/v1/integrations/salesforce/import` → BullMQ job; Salesforce Bulk API 2.0 SOQL query in batches (50K rows each); write to OpsNext entity tables; progress tracking |
| 048.4 | Continuous sync engine | Salesforce change data capture (Change Event subscriptions via CometD) or polling `/services/data/vXX.0/query?q=SELECT+Id,...+WHERE+LastModifiedDate>=...`; apply changes to OpsNext; bidirectional in Phase 2 |
| 048.5 | Conflict resolution | Configurable strategy per tenant: `OPSNEXT_WINS`, `SALESFORCE_WINS`, `NEWEST_WINS` (compare `SystemModstamp` vs `updatedAt`); conflict log viewable by admin |
| 048.6 | Sync status dashboard | Last sync timestamp per entity type; records synced count; errors table; manual trigger button; pause/resume sync |
| 048.7 | Connected app credentials | Stored encrypted in AWS Secrets Manager per tenant (`opsnext/{tenantId}/salesforce`); never returned in API responses |

→ **FRD:** SF-I-01, SF-I-02, SF-I-03, SF-I-04, IMP-F-04

---

### TASK-049 — Zoho CRM Integration

**Effort:** ~4d | **Role:** BE + FE | **Priority:** P2  
**depends:** TASK-043

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 049.1 | Zoho OAuth connector | Zoho OAuth 2.0 v2; separate authorization servers per region (US, EU, IN, AU); store tokens encrypted per tenant |
| 049.2 | Field mapping UI | Same pattern as Salesforce; Zoho standard modules: Contacts, Leads, Accounts, Deals → mapped to OpsNext entities |
| 049.3 | One-time migration | `POST /api/v1/integrations/zoho/import` → Zoho Bulk Write API; handle Zoho pagination (200 records per page); rate limit 100 calls/min |
| 049.4 | Continuous sync | Zoho notification service (webhooks from Zoho on record change) OR polling `Modified_Time >= {lastSync}`; 15-minute minimum sync interval |
| 049.5 | Sync scheduler | Per-tenant configurable cron; `ZohoSyncJob` BullMQ repeatable; update `lastSyncAt` on success |

→ **FRD:** ZOHO-I-01, ZOHO-I-02, ZOHO-I-03, IMP-F-05

---

## PHASE 15 — Audit, Compliance & Data Governance

> This phase runs in parallel from Phase 4 onwards — individual components implemented alongside each entity module.

---

### TASK-050 — Audit Logging Infrastructure

**Effort:** ~2d | **Role:** BE | **Priority:** P1  
**depends:** TASK-012

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 050.1 | AuditLog service | `AuditService.log(tenantId, userId, entityType, entityId, action, before, after, request)` — write to audit_logs table; use Postgres `COPY` for bulk inserts; never throws (audit failure must not break main operation) |
| 050.2 | Service layer integration | All service methods (create, update, delete) for every entity call `AuditService.log` after successful DB write; `before` snapshot from pre-update read; `after` from post-update read |
| 050.3 | Audit log API | `GET /api/v1/admin/audit-logs?entityType=CONTACT&entityId=xxx&userId=yyy&from=&to=` (Tenant Admin access); `GET /api/v1/platform/audit-logs` (Platform Admin, cross-tenant); cursor pagination; export to CSV |
| 050.4 | Audit log UI | Admin panel: searchable + filterable table; entity type filter; date range picker; user filter; row expand to show before/after JSON diff |
| 050.5 | Log immutability | DB user for application has only INSERT on audit_logs; no UPDATE/DELETE privileges; monthly partition archival to S3 Glacier |

→ **FRD:** AUD-F-01, AUD-F-02

---

### TASK-051 — GDPR Compliance Workflows

**Effort:** ~2d | **Role:** BE | **Priority:** P1  
**depends:** TASK-050

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 051.1 | PII field registry | `PersonalDataField` enum listing all fields considered PII across all entities (email, phone, name, address, etc.); used by anonymisation and export |
| 051.2 | Right to erasure | `POST /api/v1/admin/gdpr/erase?contactEmail=xxx` (Tenant Admin); replaces all PII fields with anonymised values (email→`anonymised_{id}@deleted.opsnext.io`, name→`Anonymised User`); creates GdprErasureLog |
| 051.3 | Data portability export | `POST /api/v1/admin/gdpr/export?contactEmail=xxx`; produces ZIP containing JSON files for all records related to the subject; delivered via signed S3 URL (24h expiry) |
| 051.4 | Consent tracking | Optional `consentGivenAt` + `consentSource` fields on Contact; filter non-consented contacts from email sequences |
| 051.5 | Data retention jobs | BullMQ monthly cron: archive contacts with `updatedAt < now - retentionPeriod` to separate schema; configurable per tenant (default 7 years) |

→ **FRD:** AUD-F-03, AUD-F-04

---

### TASK-052 — Encryption & Security Hardening

**Effort:** ~2d | **Role:** DevOps + BE | **Priority:** P2  
**depends:** TASK-008

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 052.1 | RDS encryption | Verify RDS instance has `storage_encrypted=true` with AWS-managed KMS key; enable Aurora encryption for EU tenants with dedicated CMK |
| 052.2 | Redis encryption | TLS enabled on ElastiCache; auth token required; `requirepass` in Redis config |
| 052.3 | S3 encryption | SSE-S3 on all buckets; block all public access; bucket policies deny HTTP; access logging enabled |
| 052.4 | TLS enforcement | ALB HTTPS listener only; HTTP → HTTPS redirect; TLS 1.2 minimum (1.3 preferred); HSTS header with 1-year max-age |
| 052.5 | Security headers | Fastify `@fastify/helmet`: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| 052.6 | Field-level encryption (P3) | Postgres `pgcrypto` extension; `encrypt_field(value, tenant_kms_key)` for designated sensitive fields (per AUD-F-07) |

→ **FRD:** AUD-F-06, AUD-F-07

---

## PHASE 16 — Mobile Application (React Native)

---

### TASK-053 — Mobile App Foundation

**Effort:** ~3d | **Role:** Mobile FE | **Priority:** P2  
**depends:** TASK-017, TASK-043

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 053.1 | Expo project setup | `create-expo-app` in `apps/mobile`; TypeScript; Expo Router v3 (file-based navigation); configured in Turborepo |
| 053.2 | Shared API client | Extract `@opsnext/api-client` package from web; React Query hooks shared between web and mobile |
| 053.3 | Auth flow | Secure token storage (Expo SecureStore); login screen; biometric authentication option (Expo LocalAuthentication); deep link handling for invite/reset-password links |
| 053.4 | Navigation structure | Tab navigator: Dashboard, Contacts, Deals, Tasks, More; stack navigators per tab; modal presentation for create/edit |
| 053.5 | Push notifications setup | Expo Notifications; FCM (Android) + APNs (iOS) setup; token registration endpoint `PUT /api/v1/users/me/push-token`; notification tap → navigate to entity |
| 053.6 | Offline indicator | NetInfo to detect connectivity; toast banner when offline; write operations queued to AsyncStorage and synced on reconnect (Phase 3 full offline) |

→ **FRD:** NOT-F-03

---

### TASK-054 — Mobile Core Screens

**Effort:** ~5d | **Role:** Mobile FE | **Priority:** P2  
**depends:** TASK-053

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 054.1 | Dashboard screen | Today's tasks due count; overdue deals count; recent activities feed; quick-action FAB (add contact, log call, create task) |
| 054.2 | Contacts screen | FlatList with search bar; swipe left → quick actions (call, email, log activity); pull to refresh; infinite scroll |
| 054.3 | Contact detail screen | Same sections as web: info, linked account, timeline, tasks, opportunities; tap phone number → native call intent; tap email → mail app |
| 054.4 | Deals screen | Horizontal scroll stage columns (simplified Kanban); deal list per stage; tap deal → detail screen |
| 054.5 | Tasks screen | Grouped list (Today/Upcoming/Overdue); swipe right to complete; swipe left to delete |
| 054.6 | Activity log screen | Quick log form: type picker, notes text area, entity link picker (contact/deal search), date/time; one-tap "Log Call" from contact screen |
| 054.7 | Business card scanner (P3) | Camera screen using Expo Camera; OCR via Google Cloud Vision API; auto-fill create contact form from business card data |

---

## PHASE 17 — Performance, Security & NFR Hardening

---

### TASK-055 — Load Testing & Performance Optimisation

**Effort:** ~4d | **Role:** BE + DevOps | **Priority:** P1  
**depends:** All backend phases

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 055.1 | k6 load test scripts | Scenarios: steady-state (500 VU × 10 min), spike (0→2000 VU in 30s), soak (200 VU × 2 hours); cover: login, contact CRUD, pipeline board load, report query |
| 055.2 | P95 latency baseline | Run k6 against staging; establish baseline per endpoint; identify > 300ms P95 endpoints as optimization targets |
| 055.3 | Database query profiling | `pg_stat_statements` analysis; EXPLAIN ANALYZE on top 20 slowest queries; add missing indexes; rewrite N+1 patterns |
| 055.4 | Redis caching | Identify read-heavy queries (pipeline board, dashboard metrics); add Redis cache layer with appropriate TTL; cache invalidation on writes |
| 055.5 | API response optimisation | Ensure all list endpoints use select fields (no `SELECT *`); implement response compression (`@fastify/compress`); CDN caching for static assets |
| 055.6 | Connection pooling validation | PgBouncer metrics under load; tune `pool_size` and `max_client_conn`; verify no connection exhaustion at peak |
| 055.7 | Re-test and sign off | Re-run full load test suite after optimisations; all P95 < 300ms normal, < 800ms peak; sign off by Lead Architect |

→ **FRD:** NFR Performance, Throughput

---

### TASK-056 — Security Penetration Testing

**Effort:** ~3d | **Role:** Security Lead + External | **Priority:** P1  
**depends:** TASK-052

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 056.1 | OWASP ZAP automated scan | Full active scan against staging; review and triage findings; critical/high must be resolved before GA |
| 056.2 | Manual pen test | Cross-tenant data access attempts; JWT manipulation; SQL injection via custom field queries; auth bypass attempts; IDOR on entity IDs (use UUIDs/CUIDs to prevent enumeration) |
| 056.3 | Dependency vulnerability scan | `pnpm audit`; Snyk scan; resolve all critical/high CVEs; medium CVEs in remediation plan |
| 056.4 | Secrets scan | TruffleHog scan on full git history; verify no secrets ever committed; rotate any found |
| 056.5 | GDPR review | Legal review of data flow documentation; DPA sign-off; privacy policy and cookie policy pages published |
| 056.6 | Remediation sprint | Fix all critical and high severity findings; retest; sign penetration test report |

→ **FRD:** NFR Security, AUD-F-05

---

### TASK-057 — Accessibility & i18n

**Effort:** ~2d | **Role:** FE | **Priority:** P2  
**depends:** TASK-026, TASK-034

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 057.1 | WCAG 2.1 AA audit | Run axe-core automated audit on all major pages; fix: colour contrast ratios, focus management, ARIA labels on icon buttons, keyboard navigation in Kanban |
| 057.2 | Screen reader testing | Test with NVDA (Windows) and VoiceOver (Mac): login flow, contact creation, pipeline board, notification centre |
| 057.3 | i18n framework | `next-intl` integration; extract all UI strings to `messages/en.json`; configure locale detection from browser/tenant settings |
| 057.4 | RTL layout support | `dir` attribute based on locale; Tailwind RTL plugin; verify Kanban board and sidebars flip correctly |
| 057.5 | Date/currency formatting | Use `Intl.DateTimeFormat` and `Intl.NumberFormat` with tenant locale throughout; no hardcoded format strings |

→ **FRD:** NFR Internationalisation, C-02

---

## PHASE 18 — UAT, Documentation & GA Launch

---

### TASK-058 — Developer Documentation

**Effort:** ~3d | **Role:** Tech Lead | **Priority:** P1  
**depends:** TASK-043

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 058.1 | API reference site | Deploy Swagger UI (from OpenAPI spec) and GraphQL Playground at `developers.opsnext.io`; versioned; dark mode |
| 058.2 | Integration guides | Step-by-step guides: Salesforce setup, Zoho setup, PowerApps connector, Excel Add-in, webhook configuration; with screenshots |
| 058.3 | SDK publication | Publish `@opsnext/api-client` as npm package with TypeScript types generated from OpenAPI spec |
| 058.4 | Postman collection | Export complete Postman collection from OpenAPI spec; publish to Postman public workspace; include environment setup guide |
| 058.5 | Architecture runbook | Deployed service map; runbook for common ops: tenant suspension, DB failover, search re-index, import job retry |

---

### TASK-059 — End-to-End Testing Suite

**Effort:** ~3d | **Role:** QA | **Priority:** P1  
**depends:** All phases

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 059.1 | Playwright E2E setup | Playwright configured in `apps/web`; fixtures for auth (create test tenant, login); `playwright.config.ts` with multiple browser targets |
| 059.2 | Critical path tests | Test suites: (1) Register tenant + first login, (2) Create/edit/delete contact, (3) Convert lead → opportunity, (4) Move deal through all pipeline stages, (5) Import CSV contacts, (6) Run workflow automation, (7) Generate and export report |
| 059.3 | Cross-tenant isolation tests | E2E test: Tenant A creates contact → Tenant B cannot see it (API + UI verified) |
| 059.4 | Integration test suite | Supertest API integration tests: all CRUD endpoints, auth flows, permission checks, rate limiting; run against Docker Compose |
| 059.5 | E2E in CI | Playwright runs in CI on merge to `main`; test report uploaded as GitHub Actions artefact; fail deployment on E2E failure |

---

### TASK-060 — User Acceptance Testing (UAT)

**Effort:** ~5d | **Role:** PM + QA + Pilot Tenants | **Priority:** P1  
**depends:** TASK-059

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 060.1 | UAT environment | Provision dedicated UAT environment with pilot tenant data; feature flags for in-development features disabled |
| 060.2 | UAT test scripts | Written test scripts for each user role (Sales Rep, Sales Manager, Tenant Admin) covering all P1 requirements |
| 060.3 | UAT sessions | 3 × 2-hour sessions with 2–3 pilot tenants each; record sessions (with consent); collect structured feedback |
| 060.4 | Bug triage | Categorise all UAT findings: critical (blocks launch), major (must fix pre-GA), minor (backlog); fix all critical before go-ahead |
| 060.5 | UAT sign-off | Formal UAT sign-off document signed by Product Owner and pilot tenant representatives |

---

### TASK-061 — Production Launch

**Effort:** ~2d | **Role:** All | **Priority:** P1  
**depends:** TASK-060

#### Sub-tasks

| # | Sub-task | Detail |
|---|----------|--------|
| 061.1 | Production infrastructure | Apply Terraform for production environment (larger instances, Multi-AZ, auto-scaling configured) |
| 061.2 | DNS cutover plan | Cloudflare DNS records; health check pre-cutover; rollback plan (30-second DNS revert) |
| 061.3 | Launch checklist | ☑ All P1 FRD requirements tested ☑ Pen test signed off ☑ GDPR checklist complete ☑ Monitoring alerts active ☑ On-call rotation set up ☑ Status page (status.opsnext.io) live ☑ Support desk ready |
| 061.4 | Canary launch | 5% traffic to new deployment; monitor error rate, latency, and DB connections for 30 minutes; promote to 100% if healthy |
| 061.5 | Post-launch monitoring | 48-hour war room period; all engineers on-call; daily metrics review; SLA monitoring dashboard |

---

## Summary: Effort & Timeline Estimate

| Phase | Tasks | Estimated Dev Days | Parallel Tracks |
|-------|-------|-------------------|----------------|
| 0 — Architecture docs | 001–005 | 17d | 1 architect |
| 1 — Infra bootstrap | 006–009 | 11d | 1–2 DevOps |
| 2 — DB & multi-tenancy | 010–013 | 13d | 1 DBA + 1 BE |
| 3 — IAM | 014–019 | 13d | 2 BE |
| 4 — Tenant admin | 020–022 | 9d | 1 BE + 1 FE |
| 5 — Contacts/Accounts | 023–026 | 11d | 1 BE + 1 FE |
| 6 — Leads/Opportunities | 027–029 | 8d | 1 BE + 1 FE |
| 7 — Activities | 030–032 | 7d | 1 BE + 1 FE |
| 8 — Pipeline/Kanban | 033–034 | 4d | 1 BE + 1 FE |
| 9 — Workflows | 035–037 | 10d | 2 BE + 1 FE |
| 10 — Notifications | 038–040 | 6d | 1 BE + 1 FE |
| 11 — Reports | 041–042 | 7d | 1 BE + 1 FE |
| 12 — Integration framework | 043–044 | 6d | 2 BE |
| 13 — Import/Export | 045 | 3d | 1 BE + 1 FE |
| 14 — External integrations | 046–049 | 15d | 2 BE + 1 FE |
| 15 — Audit/Compliance | 050–052 | 6d | 1 BE + DevOps |
| 16 — Mobile | 053–054 | 8d | 1 Mobile FE |
| 17 — NFR hardening | 055–057 | 9d | All |
| 18 — Launch | 058–061 | 13d | All |
| **TOTAL** | **61 Tasks** | **~176 engineering days** | |

> With a team of **4 engineers** (1 Lead/BE, 1 BE, 1 FE, 1 DevOps) working with parallel tracks, total calendar time is approximately **36–40 weeks** to GA with all P1 and P2 requirements.

---

## Dependency Graph (Critical Path)

```
TASK-001 (TAD)
  └── TASK-002 (DB Design)
        └── TASK-010 (Platform Schema)
              └── TASK-011 (Tenant Schema)
                    └── TASK-012 (Multitenant Middleware)
                          ├── TASK-014 (Registration)
                          │     └── TASK-015 (Login/JWT)
                          │           ├── TASK-016 (MFA)
                          │           └── TASK-017 (RBAC) ◄── CRITICAL PATH
                          │                 └── TASK-020 (Tenant Registration)
                          │                       └── TASK-021 (Admin Panel)
                          │                             ├── TASK-023 (Accounts)
                          │                             │     └── TASK-024 (Contacts)
                          │                             │           └── TASK-027 (Leads)
                          │                             │                 └── TASK-028 (Opportunities)
                          │                             │                       ├── TASK-033 (Pipeline)
                          │                             │                       └── TASK-041 (Reports)
                          │                             └── TASK-036 (Workflows)
                          └── TASK-013 (Search)
```

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Schema-per-tenant migration fails for large tenant counts | Medium | High | Automate migration with dry-run mode; test with 1,000 tenants in staging before GA |
| Salesforce API rate limits block continuous sync | High | Medium | Implement adaptive backoff; use Bulk API for initial load; cache SF metadata |
| GDPR audit data export performance at scale | Medium | Medium | Pre-compute export packages nightly; serve from S3 rather than real-time query |
| BullMQ workflow engine under high concurrency | Low | High | Load test with 10,000 concurrent workflow evaluations; add dedicated worker pool |
| Excel Add-in certification delay (Microsoft review) | High | Low | Submit early in Phase 14; release basic XLSX export independently; Add-in is P2 |
| Typesense search index consistency lag | Low | Medium | Implement sync queue with dead letter queue; hourly consistency reconciliation job |

---

*Document Owner: Lead Technical Architect*  
*Status: AWAITING STAKEHOLDER APPROVAL TO COMMENCE IMPLEMENTATION*  
*Next Action: Review and approve to begin PHASE 0 — TASK-001*
