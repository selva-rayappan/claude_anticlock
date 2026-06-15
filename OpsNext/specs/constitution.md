# OpsNext Constitution

> This document is the Spec Kit **constitution** — governing principles that all feature specs, implementations, and reviews must respect. Any code that violates these principles must be fixed before merge.

---

## 1. Project Identity

**OpsNext** is a cloud-native, multi-tenant CRM SaaS platform targeting SMB-to-mid-market organisations.

| Attribute | Value |
|---|---|
| Tenancy model | Schema-per-tenant (PostgreSQL) |
| Scale target (Phase 1) | 500 tenants · <100K records/tenant · 500 req/s |
| Scale target (Phase 2) | 5,000 tenants · <1M records/tenant · 5,000 req/s |
| Scale target (Phase 3) | 10,000+ tenants · <10M records/tenant · 50,000+ req/s |
| Compliance | GDPR · CCPA · SOC 2 Type II · WCAG 2.1 AA · OWASP Top 10 |

---

## 2. Architecture Principles

### 2.1 Strict Tenant Isolation

Every database query runs within the current tenant's PostgreSQL schema. No exceptions.

- `TenantContext` (Java `ThreadLocal`) is set from the JWT `tenantId` claim by `JwtAuthFilter`.
- `TenantJdbcTemplate` sets `SET search_path = tenant_{slug}` for each connection.
- Never pass `tenantId` as a WHERE clause filter on tenant-schema tables.
- Never join across schemas in a single query.
- Never run a query without an active `TenantContext` on a tenant-schema entity.

### 2.2 Mandatory Audit Trail

Every CREATE, UPDATE, and DELETE on a core entity writes to `audit_logs` within the **same transaction**.

```
AuditLog { entityType, entityId, action, userId, ipAddress, before, after, createdAt }
```

Use `AuditService.log(...)` inside the service method — never rely on a background job.

### 2.3 Soft Delete Only

Mutable entities have `deletedAt TIMESTAMPTZ`. Physical `DELETE` is never issued.

- All list queries include `WHERE deleted_at IS NULL`.
- Unique constraints use partial indexes: `WHERE deleted_at IS NULL`.

### 2.4 API Response Envelope

All responses use the standard envelope:

```json
{ "success": true, "data": { ... }, "meta": { "total": 100 } }
```

Error responses:

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [], "traceId": "..." } }
```

Never return raw entity objects, raw exception messages, or stack traces.

### 2.5 RBAC at Service Layer

`@PreAuthorize` on **service methods**, not controllers. Built-in roles: `SUPER_ADMIN`, `TENANT_ADMIN`, `SALES_MANAGER`, `SALES_REP`, `READ_ONLY`.

### 2.6 JWT Architecture

RS256 · 8h access token · 30d refresh (httpOnly cookie, rotated) · Redis JTI deny-list.

### 2.7 Search Architecture

Typesense handles global search. Every entity mutation triggers a BullMQ `search-sync` job. Collections scoped per tenant: `{tenantId}_contacts`, etc.

### 2.8 Background Job Architecture

BullMQ (Redis-backed): `search-sync`, `import-validate`, `import-execute`, `workflow-eval`, `workflow-execute`, `notification-email`, `webhook-delivery`, `task-reminder`.

### 2.9 Domain Events

After every mutation: publish to Redis Pub/Sub channel `events:{tenantId}`.

```
Payload: { eventType, entityType, entityId, before, after, userId, timestamp }
```

### 2.10 File / Blob Storage

Pre-signed S3/MinIO URLs only. API server never streams files. Import max 50 MB. Export pre-signed URLs expire in 24h. Local dev: MinIO at `localhost:9000`.

### 2.11 Performance Budgets

| Metric | Target |
|---|---|
| API P95 (normal load) | ≤ 300 ms |
| API P95 (2× peak) | ≤ 800 ms |
| Global search P95 | ≤ 500 ms |
| Typesense search P95 | ≤ 100 ms |
| Dashboard queries (cached) | ≤ 200 ms |

### 2.12 Security Baselines

OWASP Top 10 before GA · AES-256 at rest · TLS 1.3 in transit · bcrypt cost 12 · 5 failed attempts → 15 min lockout · No PII in logs.

---

## 3. Spec-First Rule

**Update `specs/api/openapi.yaml` before implementing any API endpoint change.** The spec is the contract; the code is the implementation. They must match.

When implementing a new feature:
1. Create `specs/features/{name}/spec.md` first
2. Update `specs/api/openapi.yaml` for any API changes
3. Then implement

---

## 4. Coding Standards

### 4.1 General (All Languages)

- No comments unless the WHY is non-obvious (not the what).
- No multi-line docstrings or comment blocks.
- No emojis, no `TODO` comments in committed code — use `specs/tasks.md`.
- Prefer editing existing files over creating new ones.
- No speculative abstractions. Three similar lines is better than a premature abstraction.
- No backwards-compatibility hacks for removed code.
- No feature flags — just change the code.
- No error handling for scenarios that cannot happen.

### 4.2 Java (Backend — `backend/`)

**Package structure:**
```
io.opsnext.api/
├── config/           — Spring @Configuration classes
├── security/         — JWT filter, SecurityPrincipal
├── tenant/           — TenantContext, middleware
├── common/dto/       — ApiResponse<T>, PageResponse<T>
├── common/exception/ — AppException, GlobalExceptionHandler
└── {module}/
    ├── {Module}Controller.java
    ├── {Module}Service.java
    └── dto/{Module}Request.java
```

**Conventions:**
- Constructor injection (`@RequiredArgsConstructor`) — never `@Autowired` on fields.
- `@Transactional` on service methods only (not repos, not controllers).
- `@PreAuthorize` on service methods for RBAC.
- Java records for immutable request/response DTOs.
- Never expose JPA entity objects in API responses.
- Service throws `AppException`; `GlobalExceptionHandler` maps to HTTP.

**Naming:**

| Construct | Convention |
|---|---|
| Class | PascalCase |
| Method | camelCase |
| Constant | SCREAMING_SNAKE |
| Package | lowercase.dots |
| DB column | snake_case |
| REST path | kebab-case |

### 4.3 TypeScript / React (Frontend — `frontend/`)

**File naming:**

| Construct | Convention |
|---|---|
| React component file | kebab-case `.tsx` |
| Component export | PascalCase |
| Hook | camelCase, `use` prefix |
| Store | camelCase, `.store.ts` suffix |
| Utility | camelCase |

**Component rules:**
- Server Components by default in App Router.
- `"use client"` only for state, effects, event handlers.
- All API calls via `src/lib/api.ts`.
- Form state in React Hook Form; never `useState` for form fields.
- Zod schemas in `packages/shared/src/schemas/`; use `zodResolver`.

**State:**

| Type | Where |
|---|---|
| Server/async data | TanStack Query |
| Global UI state | Zustand (`src/store/`) |
| Local ephemeral | `useState` |
| Form state | React Hook Form |
| URL state | `useSearchParams` |

- Use `cn()` for Tailwind class merging.
- Mobile-first responsive (`sm:`, `md:`, `lg:` prefixes on exceptions).
- Never swallow errors silently — show toast via `useToast`.

### 4.4 Database (`packages/db/`, backend migrations)

- All migrations additive-only — no `DROP` or `RENAME` in live migrations.
- Soft delete: `deletedAt TIMESTAMPTZ`; all standard queries filter `WHERE deleted_at IS NULL`.
- All timestamps UTC: `createdAt`, `updatedAt`, `deletedAt`.
- Custom fields as JSONB `custom_fields` column.
- GIN indexes on `tags` (text[]) and `custom_fields` (JSONB).
- Index naming: `{table}_{columns}_idx`.

---

## 5. Phase Gate Process

Work proceeds through numbered phases. Each phase must be:

1. **Fully implemented** — all subtasks complete, no stubs.
2. **Reviewed on localhost** — user reviews the running application.
3. **Approved** — explicit sign-off before Phase N+1 begins.

**Never start Phase N+1 while Phase N is in review or incomplete.**

---

## 6. Code Review Checklist

Before marking any task done:

- [ ] No raw entity objects in API responses
- [ ] All mutations write to `audit_logs`
- [ ] Soft-delete pattern used (no physical DELETE)
- [ ] `@PreAuthorize` annotation on all service mutations
- [ ] No PII in log statements
- [ ] `search-sync` BullMQ job enqueued for entity mutations
- [ ] No `TODO` comments or stub implementations
- [ ] Response uses `ApiResponse<T>` envelope
- [ ] Migration is additive-only
- [ ] `specs/api/openapi.yaml` updated if API changed
