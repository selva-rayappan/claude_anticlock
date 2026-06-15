# Architecture Principles

These are non-negotiable constraints. Any code that violates them must be changed before merge.

---

## 1. Strict Tenant Isolation

Every database query runs within the current tenant's PostgreSQL schema. No exceptions.

**How it works:**
- `TenantContext` (Java `ThreadLocal`) is populated from the JWT `tenantId` claim by `JwtAuthFilter` on every authenticated request.
- The JPA datasource routing sets `SET search_path = tenant_{slug}` for each connection before queries execute.
- All tenant-schema entities (Contact, Account, Lead, etc.) are JPA entities in the `tenant` schema — they carry no `tenantId` column because the schema itself provides isolation.

**Violations:**
- Never pass `tenantId` as a WHERE clause filter on tenant-schema tables.
- Never run a query without an active `TenantContext` on a tenant-schema entity.
- Never join across schemas in a single query.

---

## 2. Mandatory Audit Trail

Every CREATE, UPDATE, and DELETE on a core entity writes a row to `audit_logs` within the same transaction.

```
AuditLog {
  entityType: string   // "CONTACT", "OPPORTUNITY", etc.
  entityId:   string
  action:     CREATE | UPDATE | DELETE
  userId:     string
  ipAddress:  string
  userAgent:  string
  before:     Json     // null for CREATE
  after:      Json     // null for DELETE
  createdAt:  DateTime
}
```

Use `AuditService.log(...)` within the service method transaction — never rely on a background job for audit writes.

---

## 3. Soft Delete Only

Mutable entities have `deletedAt DateTime?`. Physical DELETE is never issued on these tables.

- Standard list queries always include `WHERE deleted_at IS NULL` (Prisma: `where: { deletedAt: null }`, JPA: `@Where(clause = "deleted_at IS NULL")`).
- Unique constraints on soft-deleted entities must be partial indexes: `WHERE deleted_at IS NULL`.
- The restore operation sets `deletedAt = null`.

---

## 4. API Response Envelope

All API responses use a standard envelope:

```json
{
  "success": true,
  "data": { ... },
  "meta": { "total": 100, "nextCursor": "xyz" }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [{ "field": "email", "message": "Invalid format" }],
    "traceId": "abc-123"
  }
}
```

Never return raw entity objects, raw exception messages, or stack traces to clients.

---

## 5. RBAC Enforcement at Service Layer

Permission checks use Spring Security's `@PreAuthorize` on **service methods**, not controllers.

Built-in roles (seeded at tenant provisioning):

| Role | Permissions |
|------|-------------|
| `SUPER_ADMIN` | All permissions, cross-tenant (platform only) |
| `TENANT_ADMIN` | All permissions within tenant |
| `SALES_MANAGER` | CRUD on all CRM entities; can assign to others |
| `SALES_REP` | CRUD on own records only (`scope=OWN`) |
| `READ_ONLY` | READ on all resources, no mutations |

Ownership scope (`scope=OWN`): append `WHERE owner_id = :currentUserId` at the service layer, not the controller.

---

## 6. JWT Architecture

- **Algorithm:** RS256 (asymmetric). Private key signs; public key verifies.
- **Access token payload:** `{ sub, tenantId, email, roles[], tier, iat, exp }`
- **Access token expiry:** 8 hours (configurable per tenant)
- **Refresh token:** Opaque, stored hashed in `sessions` table, 30-day TTL, rotated on each use.
- **Refresh token storage:** httpOnly + Secure + SameSite=Strict cookie.
- **JWKS endpoint:** `GET /api/v1/.well-known/jwks.json` — for external verification.
- **Revocation:** JTI deny-list in Redis (access); `revoked:{tokenId}` set (refresh).

---

## 7. Search Architecture

- Typesense handles all global search (sub-100ms, typo-tolerant).
- Every entity CREATE / UPDATE / DELETE in Postgres triggers a BullMQ `search-sync` job that upserts / removes the Typesense document.
- Typesense collections are scoped per tenant: `{tenantId}_contacts`, `{tenantId}_accounts`, etc.
- Typesense scoped API keys enforce `filter_by: tenantId:={tenantId}` — tenant isolation at the search layer.

---

## 8. Background Job Architecture

BullMQ (Redis-backed) handles all async work:

| Queue | Used For |
|-------|---------|
| `search-sync` | Typesense index updates after entity mutations |
| `import-validate` | Async CSV/XLSX validation |
| `import-execute` | Chunked row import (500 rows/chunk) |
| `workflow-eval` | Evaluate workflows matching a domain event |
| `workflow-execute` | Execute workflow action sequence |
| `notification-email` | Email notification batching (30s window) |
| `webhook-delivery` | Outbound webhook delivery with retry |
| `task-reminder` | Delayed job for task reminder notifications |

---

## 9. Domain Events

After every service-layer mutation, a domain event is emitted to Redis Pub/Sub:

```
Channel: events:{tenantId}
Payload: { eventType, entityType, entityId, before, after, userId, timestamp }
```

The workflow evaluation worker subscribes and matches events against active workflow triggers.

---

## 10. File / Blob Storage

- Import files: uploaded directly to S3 / MinIO via pre-signed URL (max 50 MB).
- Export files: generated by worker, stored in S3, user downloads via pre-signed URL (24h expiry).
- API server never streams large files — all file I/O is through pre-signed URLs.
- Local dev: MinIO at `localhost:9000` (S3-compatible).

---

## 11. Performance Budgets

| Metric | Target |
|--------|--------|
| API P95 response time (normal load) | ≤ 300 ms |
| API P95 response time (2× peak) | ≤ 800 ms |
| Global search P95 | ≤ 500 ms |
| Typesense search P95 | ≤ 100 ms |
| Dashboard queries (with cache) | ≤ 200 ms |

---

## 12. Security Baselines

- OWASP Top 10 compliance required before GA.
- All data at rest: AES-256.
- All data in transit: TLS 1.3 minimum.
- bcrypt cost factor 12 for passwords.
- Account lockout: 5 consecutive failures (configurable), 15-minute lock.
- Rate limiting: per-tenant per-tier via Redis counters.
- No PII (email, phone) in logs — mask before structured log emission.
