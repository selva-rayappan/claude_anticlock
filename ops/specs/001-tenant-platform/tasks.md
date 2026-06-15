---
description: "Task list for 002-tenant-platform — Tenant & Platform Management"
---

# Tasks: Tenant & Platform Management

**Feature Branch**: `002-tenant-platform`
**Input**: `specs/002-tenant-platform/spec.md` · `specs/002-tenant-platform/plan.md`
**Constitution**: `.specify/memory/constitution.md` v1.0.0

**Tech Stack**:
- Backend: Java 21 + Spring Boot 3.4.1 · `apps/api/src/main/java/io/opsnext/api/`
- Frontend: Next.js 15 App Router + React 19 + shadcn/ui · `apps/web/src/`
- DB: PostgreSQL 16 (`public` schema for platform entities; `tenant_{slug}` per tenant)
- Cache/Queue: Redis 7 (session invalidation, metrics cache, export job state)

**Constitution Gates** (enforced throughout):
- Platform entities MUST live in the `public` schema; tenant data in `tenant_{slug}` (Principle I)
- `PLATFORM_ADMIN` role is completely separate from tenant-level `ADMIN`; cross-role access is forbidden (Principle IV)
- All platform operations MUST emit structured logs: `actor`, `tenantId`, `operation`, `durationMs` (Principle VI)
- Provisioning MUST be atomic — partial provisioning on failure leaves no orphan schemas (Principle I)
- Phase gate: localhost review + Product Owner approval before Phase 2 (Contacts) begins (Principle III)

---

## Phase 1: Setup

**Purpose**: DB migrations, shared types, and route scaffolding for platform layer.

- [ ] T001 Create Flyway migration `V1__platform_schema.sql` in `apps/api/src/main/resources/db/migration/` — creates `tenants`, `tier_definitions`, `tenant_metrics_snapshots`, `data_export_jobs` tables in the `public` schema; seeds `tier_definitions` rows for STARTER / PROFESSIONAL / ENTERPRISE
- [ ] T002 [P] Add `TenantStatus` enum (`ACTIVE`, `SUSPENDED`, `DEACTIVATED`), `TierName` enum (`STARTER`, `PROFESSIONAL`, `ENTERPRISE`), and `Tenant` type to `packages/shared/src/types/tenant.ts`
- [ ] T003 [P] Add `provisionTenantSchema`, `updateTierSchema` Zod schemas to `packages/shared/src/schemas/platform.ts`
- [ ] T004 [P] Register `/api/v1/platform/**` route prefix in Spring Security config at `apps/api/src/main/java/io/opsnext/api/security/SecurityConfig.java` — restricted to `PLATFORM_ADMIN` role globally
- [ ] T005 [P] Add `paths.platform.*` URL helpers (tenants list, provision, suspend, deactivate, export) to `apps/web/src/lib/api.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core platform infrastructure shared across all user stories.

**⚠️ CRITICAL**: No user story work begins until this phase is verified.

- [ ] T006 Implement `Tenant` JPA entity in `apps/api/src/main/java/io/opsnext/api/tenant/Tenant.java` — fields: id (UUID), slug (unique), displayName, status, tier, seedAdminEmail, provisionedAt, suspendedAt, deactivatedAt; `@Table(schema="public")`
- [ ] T007 [P] Implement `TenantRepository` in `apps/api/src/main/java/io/opsnext/api/tenant/TenantRepository.java` — Spring Data JPA; queries on `public` schema
- [ ] T008 [P] Implement `TierDefinition` value object / config class in `apps/api/src/main/java/io/opsnext/api/tenant/TierDefinition.java` — holds: tier, maxUsers, maxCustomFields, apiRateLimitPerMinute, featureFlags (Set<String>); loaded from `tier_definitions` table at startup
- [ ] T009 Implement `TierEnforcementService` in `apps/api/src/main/java/io/opsnext/api/tenant/TierEnforcementService.java` — `checkLimit(tenantId, limitType)` loads tenant tier, compares current usage against `TierDefinition` limits, throws `TierLimitException` with `TIER_LIMIT_REACHED` error code if exceeded
- [ ] T010 [P] Implement `PlatformAuditLogger` in `apps/api/src/main/java/io/opsnext/api/audit/PlatformAuditLogger.java` — structured log emitter for all platform operations: `TENANT_PROVISIONED`, `TENANT_SUSPENDED`, `TENANT_REACTIVATED`, `TENANT_DEACTIVATED`, `TIER_CHANGED`, `EXPORT_TRIGGERED`, `EXPORT_COMPLETE`
- [ ] T011 Implement Platform Admin route group layout at `apps/web/src/app/(platform)/layout.tsx` — wraps all `/platform/*` pages; checks `currentUser.role === 'PLATFORM_ADMIN'`; redirects non-platform-admins to `/dashboard`
- [ ] T012 [P] Add `usePlatformTenants`, `useTenant` base query hooks scaffold to `apps/web/src/lib/queries/platform.ts`

**Checkpoint**: Migration runs cleanly, `Tenant` entity persists to `public.tenants`, `TierEnforcementService` compiles, Platform Admin layout guards non-admins → user story work begins.

---

## Phase 3: User Story 1 — Tenant Provisioning (Priority: P1) 🎯 MVP

**Goal**: Platform Admin can provision a new tenant; the new tenant gets an isolated
data partition, default configuration, and the seed admin receives an invitation email.

**Independent Test**: Call `POST /api/v1/platform/tenants` with a unique slug → verify
new tenant appears in the list, a `tenant_acme` schema exists in PostgreSQL, seed admin
receives invitation email, and login with those credentials succeeds.

### Backend — User Story 1

- [ ] T013 Implement `TenantProvisioningService` in `apps/api/src/main/java/io/opsnext/api/platform/TenantProvisioningService.java`:
  - `provision(slug, displayName, seedAdminEmail)` — validates slug uniqueness (returns `DUPLICATE_SLUG` if taken), executes `CREATE SCHEMA tenant_{slug}`, runs tenant-schema Flyway baseline migration, seeds: default pipeline stages, role definitions, and Admin user row; sends invitation email via `EmailService`; all wrapped in a transaction that drops the schema on failure (atomic provisioning)
- [ ] T014 [US1] Implement `PlatformService.listTenants(page, size, statusFilter)` in `apps/api/src/main/java/io/opsnext/api/platform/PlatformService.java` — paginated tenant list from `public.tenants`
- [ ] T015 [US1] Implement `PlatformController` in `apps/api/src/main/java/io/opsnext/api/platform/PlatformController.java`:
  - `POST /api/v1/platform/tenants` → provision (calls `TenantProvisioningService.provision()`)
  - `GET /api/v1/platform/tenants` → listTenants (with `?status=&page=&limit=`)
  - `GET /api/v1/platform/tenants/{id}` → getTenant
- [ ] T016 [P] [US1] Implement `EmailService.sendTenantInvitation(email, slug, setupLink)` in `apps/api/src/main/java/io/opsnext/api/email/EmailService.java` — sends invitation via configured transactional email provider (SMTP / SendGrid); setup link contains a one-time token valid 72h

### Frontend — User Story 1

- [ ] T017 [P] [US1] Implement `ProvisionTenantDialog` at `apps/web/src/components/platform/provision-tenant-dialog.tsx` — form with slug (validated: lowercase, alphanumeric + hyphens), display name, seed admin email; calls `POST /api/v1/platform/tenants`; shows success with new tenant slug or inline duplicate-slug error
- [ ] T018 [P] [US1] Implement tenants list page at `apps/web/src/app/(platform)/tenants/page.tsx` — searchable, filterable table (slug, display name, status badge, tier, provisioned date); "Provision tenant" button opens `ProvisionTenantDialog`
- [ ] T019 [US1] Add `useProvisionTenant` mutation and `usePlatformTenants` query to `apps/web/src/lib/queries/platform.ts`
- [ ] T020 [US1] Implement `TenantStatusBadge` component at `apps/web/src/components/platform/tenant-status-badge.tsx` — colour-coded badge: ACTIVE (green), SUSPENDED (amber), DEACTIVATED (red)

**Checkpoint**: New tenant provisioned end-to-end; schema created in PostgreSQL; invitation email sent; seed admin can sign in.

---

## Phase 4: User Story 2 — Tenant Suspension & Deactivation (Priority: P1)

**Goal**: Platform Admin can suspend a tenant (immediate session kill) or permanently
deactivate it. Suspended tenants see a clear message on sign-in.

**Independent Test**: Sign in as a tenant user, then (as Platform Admin) suspend the
tenant. Verify the next request from the tenant user is blocked. Reactivate and verify
sign-in works again. Test deactivation with the confirmation prompt.

### Backend — User Story 2

- [ ] T021 [US2] Implement `PlatformService.suspendTenant(tenantId, actorId)` in `apps/api/src/main/java/io/opsnext/api/platform/PlatformService.java` — sets `status = SUSPENDED`, `suspendedAt = now`; publishes `tenant:suspended:{tenantId}` event to Redis pub/sub channel so all API nodes clear that tenant's active sessions from their local caches and the deny-list; logs `TENANT_SUSPENDED`
- [ ] T022 [US2] Implement `PlatformService.reactivateTenant(tenantId, actorId)` — sets `status = ACTIVE`, clears `suspendedAt`; logs `TENANT_REACTIVATED`
- [ ] T023 [US2] Implement `PlatformService.deactivateTenant(tenantId, actorId)` — sets `status = DEACTIVATED`, `deactivatedAt = now`; invalidates all sessions; logs `TENANT_DEACTIVATED`; operation is irreversible (no reactivation endpoint)
- [ ] T024 [US2] Update `TenantAuthenticationFilter` (from 003-auth-authz) to check `tenant.status` on each request — return `TENANT_SUSPENDED` (HTTP 403) or `TENANT_DEACTIVATED` (HTTP 403) before processing; status read from Redis cache (TTL 30s) to avoid DB hit per request
- [ ] T025 [US2] Add suspension/deactivation endpoints to `PlatformController`:
  - `POST /api/v1/platform/tenants/{id}/suspend` → suspendTenant
  - `POST /api/v1/platform/tenants/{id}/reactivate` → reactivateTenant
  - `POST /api/v1/platform/tenants/{id}/deactivate` → deactivateTenant (requires `{ confirm: true }` in body)

### Frontend — User Story 2

- [ ] T026 [P] [US2] Implement tenant detail page at `apps/web/src/app/(platform)/tenants/[id]/page.tsx` — shows tenant info, status badge, tier, provisioned date; action buttons: "Suspend" (if ACTIVE), "Reactivate" (if SUSPENDED), "Deactivate" (with confirmation dialog, only if not DEACTIVATED)
- [ ] T027 [P] [US2] Add `useSuspendTenant`, `useReactivateTenant`, `useDeactivateTenant` mutations to `apps/web/src/lib/queries/platform.ts`
- [ ] T028 [US2] Implement deactivation confirmation dialog in `apps/web/src/components/platform/deactivate-tenant-dialog.tsx` — requires the user to type the tenant slug to confirm; disables the confirm button until slug matches; calls `POST /api/v1/platform/tenants/{id}/deactivate`

**Checkpoint**: Suspend → active sessions killed → sign-in blocked → reactivate → sign-in works. Deactivation confirmation UX verified.

---

## Phase 5: User Story 3 — Resource Monitoring Dashboard (Priority: P2)

**Goal**: Platform Admin views per-tenant usage metrics (users, records, API calls,
storage) in a sortable, filterable dashboard.

**Independent Test**: With 2 provisioned tenants of different sizes, open the monitoring
dashboard and verify both rows show correct record counts. Sort by API calls — verify
correct order.

### Backend — User Story 3

- [ ] T029 [P] [US3] Implement `TenantMetricsSnapshot` entity in `apps/api/src/main/java/io/opsnext/api/metrics/TenantMetricsSnapshot.java` — fields: tenantId, activeUserCount, totalRecordCount, apiCallCount30d, storageBytes, snapshotAt; stored in `public.tenant_metrics_snapshots`
- [ ] T030 [US3] Implement `TenantMetricsService` in `apps/api/src/main/java/io/opsnext/api/metrics/TenantMetricsService.java`:
  - `refreshMetrics(tenantId)` — runs aggregate queries against `tenant_{slug}` schema: counts users, contacts+companies+deals, API log entries (last 30d); stores result in `tenant_metrics_snapshots` and caches in Redis (key: `metrics:{tenantId}`, TTL: 5 min)
  - `getMetrics(tenantId)` — returns cached snapshot or triggers refresh if stale
  - `refreshAllTenants()` — `@Scheduled(fixedRate = 300000)` batch refresh for all ACTIVE tenants
- [ ] T031 [US3] Add `GET /api/v1/platform/tenants/{id}/metrics` and `GET /api/v1/platform/metrics` (all tenants summary) to `PlatformController`

### Frontend — User Story 3

- [ ] T032 [P] [US3] Implement `MetricsTable` component at `apps/web/src/components/platform/metrics-table.tsx` — TanStack Table with columns: slug, displayName, status, tier, activeUsers, totalRecords, apiCalls30d, storageBytes; client-side sort on all columns; status filter chips
- [ ] T033 [P] [US3] Implement monitoring dashboard page at `apps/web/src/app/(platform)/monitoring/page.tsx` — renders `MetricsTable`; auto-refreshes every 60 seconds via `refetchInterval`
- [ ] T034 [US3] Add `usePlatformMetrics` query to `apps/web/src/lib/queries/platform.ts`
- [ ] T035 [US3] Add "Monitoring" nav item to the Platform Admin sidebar layout at `apps/web/src/app/(platform)/layout.tsx`

**Checkpoint**: Dashboard loads all tenants with correct metrics; sort and filter work; auto-refresh fires.

---

## Phase 6: User Story 4 — Subscription Tier Management (Priority: P2)

**Goal**: Platform Admin assigns a tier to each tenant. System enforces tier limits on
every relevant write operation. Tier upgrades take effect immediately.

**Independent Test**: Assign STARTER (5-user limit) to a tenant with 4 users. Add the
5th — succeeds. Attempt the 6th — blocked with `TIER_LIMIT_REACHED`. Upgrade to
PROFESSIONAL — 6th user can now be added immediately.

### Backend — User Story 4

- [ ] T036 [US4] Implement `PlatformService.updateTier(tenantId, newTier, actorId)` in `apps/api/src/main/java/io/opsnext/api/platform/PlatformService.java` — updates `tenants.tier`; invalidates tenant's Redis config cache so enforcement picks up new limits immediately; logs `TIER_CHANGED`
- [ ] T037 [US4] Wire `TierEnforcementService.checkLimit()` into `UserService.createUser()` (003-auth-authz), `CustomFieldService.defineField()` (001-contacts-companies), and API rate-limit middleware — throw `TierLimitException` before any write if quota exceeded; return HTTP 402 with `TIER_LIMIT_REACHED` + `{ currentTier, limit, current }` body
- [ ] T038 [US4] Add `PUT /api/v1/platform/tenants/{id}/tier` to `PlatformController` — calls `updateTier`; Platform Admin only

### Frontend — User Story 4

- [ ] T039 [P] [US4] Implement `TierSelector` component at `apps/web/src/components/platform/tier-selector.tsx` — dropdown (STARTER / PROFESSIONAL / ENTERPRISE) with current tier highlighted; calls `PUT /api/v1/platform/tenants/{id}/tier` on change; shows confirmation for downgrades
- [ ] T040 [P] [US4] Wire `TierSelector` into the tenant detail page (`apps/web/src/app/(platform)/tenants/[id]/page.tsx`)
- [ ] T041 [US4] Add tier-limit UI treatment to user management page (003-auth-authz feature) — when `TIER_LIMIT_REACHED` is returned from `POST /api/v1/users`, show an "Upgrade required" inline banner with a link to contact support
- [ ] T042 [US4] Add feature-flag gating to Enterprise-only UI elements (e.g., SSO config) — render with `disabled` + `UpgradeRequired` tooltip when tenant tier does not include the feature flag; use `currentTenant.featureFlags` from auth store

**Checkpoint**: Tier limits block over-quota writes; upgrade lifts limits immediately; feature-flag UI gates work.

---

## Phase 7: User Story 5 — GDPR Data Export (Priority: P3)

**Goal**: Platform Admin triggers an async full-tenant data export. A download link is
available for 24 hours when the export completes.

**Independent Test**: Trigger export for a tenant with 100 contacts. Verify a job ID is
returned. Poll status until `COMPLETE`. Download archive and verify it contains exactly
those 100 contacts in JSON format and no records from other tenants.

### Backend — User Story 5

- [ ] T043 [P] [US5] Implement `DataExportJob` entity in `apps/api/src/main/java/io/opsnext/api/export/DataExportJob.java` — fields: id, tenantId, status (PENDING | RUNNING | COMPLETE | FAILED), downloadUrl, expiresAt, triggeredBy, triggeredAt, completedAt; stored in `public.data_export_jobs`
- [ ] T044 [US5] Implement `DataExportService` in `apps/api/src/main/java/io/opsnext/api/export/DataExportService.java`:
  - `triggerExport(tenantId, actorId)` — creates `DataExportJob` with status `PENDING`, publishes to Redis Streams queue; returns jobId immediately
  - `processExport(jobId)` — `@Async` worker: sets status `RUNNING`; queries all entities from `tenant_{slug}` schema (contacts, companies, deals, activities, users); serialises to JSON; writes to MinIO (local) / S3-compatible (prod) as `exports/{tenantId}/{jobId}.zip`; generates pre-signed download URL (24h TTL); sets status `COMPLETE`; on failure sets `FAILED` with error message
- [ ] T045 [US5] Implement `DataExportController` in `apps/api/src/main/java/io/opsnext/api/export/DataExportController.java`:
  - `POST /api/v1/platform/tenants/{id}/export` → triggerExport (returns `{ jobId }`)
  - `GET /api/v1/platform/tenants/{id}/export/{jobId}` → job status + downloadUrl when COMPLETE

### Frontend — User Story 5

- [ ] T046 [P] [US5] Add "Export data" button to tenant detail page (`apps/web/src/app/(platform)/tenants/[id]/page.tsx`) — calls `POST /api/v1/platform/tenants/{id}/export`; shows returned jobId and links to status panel
- [ ] T047 [US5] Implement export status panel in tenant detail page — polls `GET /api/v1/platform/tenants/{id}/export/{jobId}` every 5 seconds until `COMPLETE` or `FAILED`; shows progress indicator; displays download link with expiry time when complete
- [ ] T048 [US5] Add `useTriggerExport` mutation and `useExportJobStatus` polling query to `apps/web/src/lib/queries/platform.ts`

**Checkpoint**: Export triggered; job progresses to COMPLETE; archive downloaded; verified contains only target tenant data.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Observability, security hardening, and pre-gate-review quality pass.

- [ ] T049 [P] Verify all platform API endpoints return machine-readable error codes: `DUPLICATE_SLUG`, `TENANT_SUSPENDED`, `TENANT_DEACTIVATED`, `TIER_LIMIT_REACHED`, `EXPORT_JOB_NOT_FOUND` — no stack traces in response bodies
- [ ] T050 [P] Confirm all platform operations produce structured audit log entries via `PlatformAuditLogger` — verify `TENANT_PROVISIONED`, `TENANT_SUSPENDED`, `TENANT_REACTIVATED`, `TENANT_DEACTIVATED`, `TIER_CHANGED`, `EXPORT_TRIGGERED`, `EXPORT_COMPLETE` are emitted with `actor`, `tenantId`, `durationMs`
- [ ] T051 Verify tenant isolation: add a cross-tenant access test — authenticated user from tenant A cannot read tenant B's contacts/companies/deals via any `/api/v1/` endpoint regardless of ID parameter manipulation
- [ ] T052 [P] Verify atomic provisioning: simulate a failure mid-provisioning (e.g., email send failure) and confirm no orphan `tenant_*` schema or `tenants` row is left behind
- [ ] T053 [P] Add "Platform" nav link to the main app sidebar at `apps/web/src/components/layout/sidebar.tsx` — visible only when `currentUser.role === 'PLATFORM_ADMIN'`
- [ ] T054 Run localhost validation: all 5 user story independent tests pass; cross-tenant isolation verified; prepare phase-gate summary for Product Owner review

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — blocks all user stories
- **Phase 3 (US1 Provisioning)**: Depends on Phase 2 — MVP; must complete before US2
- **Phase 4 (US2 Suspension)**: Depends on Phase 3 (extends `PlatformService`)
- **Phase 5 (US3 Monitoring)**: Depends on Phase 2 — independent of US1/US2
- **Phase 6 (US4 Tier Mgmt)**: Depends on Phase 2 + Phase 3 (tenant must exist); wires into 001 + 003 features
- **Phase 7 (US5 Export)**: Depends on Phase 3 (tenant must be provisionable); independent of Phases 4–6
- **Phase 8 (Polish)**: Depends on all desired phases complete

### Within Each User Story

- Entities / migrations before services
- Services before controllers
- Controllers before frontend query hooks
- Query hooks before page/component wiring

### Parallel Opportunities

- T001–T005 all parallelisable (Phase 1)
- T006–T012 all parallelisable (Phase 2)
- Once Phase 2 complete: US3 (Phase 5) and US5 (Phase 7) can start in parallel with US1 (Phase 3)
- Within each story: tasks marked `[P]` can run in parallel

---

## Implementation Strategy

### MVP First (P1 Stories — Phases 1–4)

1. Phase 1: Setup (T001–T005)
2. Phase 2: Foundational (T006–T012) — CRITICAL
3. Phase 3: US1 Tenant Provisioning (T013–T020)
4. Phase 4: US2 Suspension & Deactivation (T021–T028)
5. **STOP**: Platform Admin can provision and control tenants → phase-gate review

### Incremental Delivery

- MVP above → Platform Admin fully operational for tenant lifecycle
- Add Phase 5 (Monitoring) → visibility into usage
- Add Phase 6 (Tiers) → monetisation enforcement
- Add Phase 7 (Export) → GDPR compliance
- Phase 8 Polish → security hardening → final phase-gate sign-off

### Parallel Team Strategy

- Developer A: Backend (T006–T016, T021–T025, T029–T031, T036–T038, T043–T045)
- Developer B: Frontend (T017–T020, T026–T028, T032–T035, T039–T042, T046–T048)
- Both unblock after Phase 2 (T006–T012)

---

## Notes

- `[P]` = parallelisable (different files, no incomplete dependencies)
- `[USn]` = maps to User Story n in `specs/002-tenant-platform/spec.md`
- Provisioning MUST be atomic — Constitution Principle I (no orphan schemas on failure)
- All platform ops logged via `PlatformAuditLogger` — Constitution Principle VI
- `PLATFORM_ADMIN` role check MUST be enforced at the Spring Security layer, not only in service code — Constitution Principle IV
- Phase gate review (T054) MUST complete before Phase 2 (Contacts) begins — Constitution Principle III
- Commit format: `feat(platform): T013 implement TenantProvisioningService`
