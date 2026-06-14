# ADR-002 — Database: Schema-Per-Tenant vs Row-Level Isolation

**Date:** 2026-06-11  
**Status:** Accepted  
**Deciders:** Lead Architect, DBA  

---

## Context

OpsNext is a multi-tenant SaaS CRM. Every tenant's data must be completely isolated from other tenants. Three main isolation strategies exist for PostgreSQL:

1. **Database-per-tenant** — separate PostgreSQL database per tenant
2. **Schema-per-tenant** — shared PostgreSQL cluster, separate schema per tenant
3. **Row-level isolation** — shared tables, `tenant_id` column with row-level security (RLS)

The FRD requirements driving this decision:
- MT-01: Complete data isolation between tenants
- MT-03: Tenant data must not be accessible by other tenants under any failure mode
- MT-05: Tenants can have custom fields without schema changes to other tenants
- AUD-F-02: Audit logs must be isolated per tenant
- NFR: Support 10,000+ tenants on a single cluster

---

## Decision

**Use schema-per-tenant isolation in PostgreSQL.**

- One `public` schema for platform-level data (Tenant, TenantConfig, PlatformAdmin, TenantSubscription)
- One `tenant_{slug}` schema per tenant for all CRM data (User, Contact, Account, Lead, Opportunity, etc.)
- Tenant schema name stored in `public.tenants.schema_name`
- Application sets `search_path` to the tenant's schema on each connection/request

---

## Consequences

**Positive:**
- Hardware-enforced isolation: a bug that omits a `WHERE tenant_id = ?` clause cannot leak cross-tenant data; the schema boundary prevents it
- Tenant-specific migrations are possible (e.g., adding a custom column for one tenant) without affecting others
- PostgreSQL's `search_path` mechanism is purpose-built for this pattern
- Backup and restore of a single tenant is straightforward (`pg_dump --schema=tenant_acme`)
- Tablespace separation is possible for ENTERPRISE tier tenants in Phase 3

**Negative:**
- Schema count grows with tenants: 10,000 tenants = 10,000 schemas; PostgreSQL handles this well but tools (pg_stat, migration runners) need to account for it
- Prisma migrations must be run against every existing tenant schema on deployment (mitigated by the multi-schema migration script in TASK-012.6)
- Connection pool must be schema-aware: `SET search_path` on connection checkout or use separate connection pools per tenant (chosen: single pool, `SET search_path` per request)
- Some PostgreSQL cross-schema joins are needed for platform-level queries (e.g., platform admin viewing all tenants' usage)

**Implementation:**
- `TenantContext` (ThreadLocal) stores current tenant's schema name
- `TenantJdbcTemplate` prefixes all queries with the correct schema
- Platform entities use Spring Data JPA with `@Table(schema="public")`
- Tenant entities use raw JDBC via `TenantJdbcTemplate` with explicit schema prefix

---

## Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| Database-per-tenant | Unmanageable at 10,000 tenants: connection limit exhaustion, separate RDS instances are cost-prohibitive, migration operations multiplied |
| Row-level isolation (shared tables) | Requires `tenant_id` on every table and every query; a single missing `WHERE tenant_id = ?` creates a data leak; harder to audit; PostgreSQL RLS helps but adds complexity to all queries |
| Row-level isolation + PostgreSQL RLS | More secure than pure row-level but RLS policies add per-row overhead, are complex to configure correctly with Spring Security, and debugging policy failures is harder |
