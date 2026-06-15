# Architecture Decision Records (ADRs)

Full technology decision rationale: [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)

---

## ADR-001 — Java 21 + Spring Boot 3 for the API

**Status:** Accepted  
**Date:** 2026-06-11

**Context:** The original task plan specified Node.js 22 + Fastify. The team evaluated both stacks.

**Decision:** Use Java 21 + Spring Boot 3 for the API server (`backend/`).

**Rationale:**
- Spring Boot's `AbstractRoutingDataSource` + Hibernate 6 schema strategy provides first-class schema-per-tenant support with no custom code — the single biggest architectural requirement.
- Spring Security 6 is a 20-year battle-tested framework for RBAC, JWT, SAML 2.0, and OIDC — all required by IAM-F-04 through IAM-F-06.
- Spring Data Envers provides automatic entity versioning for audit trails (AUD-F-01) out of the box.
- Java 21 Virtual Threads (Project Loom) deliver Node.js-level I/O throughput with JVM type safety.

**Consequences:**
- Frontend remains Next.js / TypeScript — shared Zod schemas in `packages/shared` are consumed by the frontend only.
- Java backend generates its own OpenAPI spec via SpringDoc; no cross-language type sharing.
- Gradle is the build tool for `backend/`; pnpm + Turborepo for everything else.

---

## ADR-002 — Schema-per-Tenant (Not Row-Level Isolation)

**Status:** Accepted  
**Date:** 2026-06-11

**Context:** Choosing between row-level security (RLS), separate database per tenant, or schema-per-tenant.

**Decision:** Schema-per-tenant on a shared PostgreSQL cluster.

**Rationale:**
- Stronger isolation than RLS — a misconfigured query cannot leak cross-tenant data because schemas are separate namespaces.
- Simpler than separate databases — one cluster, one connection pool config, one migration toolchain.
- PostgreSQL's `search_path` is purpose-built for this pattern.
- Enables per-tenant backup, restore, and GDPR erasure by schema.

**Consequences:**
- Application middleware must always set `search_path` before any tenant-schema query.
- Prisma migrations must be applied per-schema; a migration runner script handles all tenants in CD.
- At Phase 3 scale (10K+ tenants), schema count may require sharding by tenant cohort.

---

## ADR-003 — Prisma for Schema Definition and Migrations

**Status:** Accepted  
**Date:** 2026-06-11

**Context:** The Java API uses JPA/Hibernate for ORM. A separate tool is needed for schema definition and migrations shared with the frontend type system.

**Decision:** Use Prisma in `packages/db/` for schema definition and migration management alongside JPA.

**Rationale:**
- Prisma `schema.prisma` is the single source of truth for the database schema, readable by both Java and TypeScript tooling.
- `prisma migrate` handles multi-schema migration with a clean history per schema.
- TypeScript types generated from Prisma are used by the frontend `packages/shared`.
- Java entity classes are kept in sync with the Prisma schema manually (they describe the same tables).

**Consequences:**
- Schema changes require updating both the Prisma schema and the corresponding JPA entity.
- `prisma migrate dev` is run from `packages/db/`; the Java API does not run its own migrations.

---

## ADR-004 — Turborepo + pnpm Workspaces for Monorepo

**Status:** Accepted  
**Date:** 2026-06-11

**Context:** Managing a monorepo with Next.js frontend, shared packages, and Prisma DB package.

**Decision:** Turborepo with pnpm workspaces.

**Rationale:**
- Turborepo provides incremental task caching — `pnpm build` only rebuilds changed packages.
- pnpm's workspace protocol (`workspace:*`) keeps `@opsnext/shared` and `@opsnext/db` linked without publishing.
- The Java `backend/` is included in the workspace for CLI convenience but its build is Gradle, not pnpm.

**Consequences:**
- `turbo.json` defines the dependency graph for `build`, `lint`, `typecheck` tasks.
- Java API build is invoked via `package.json` scripts that shell out to Gradle.

---

## ADR-005 — BullMQ for Background Jobs

**Status:** Accepted  
**Date:** 2026-06-11

**Context:** Choosing between BullMQ, AWS SQS, Temporal, and Spring Batch for async job processing.

**Decision:** BullMQ (Redis-backed) for all async and scheduled background work.

**Rationale:**
- Redis is already required for caching and Pub/Sub — reusing it for queues avoids a separate broker.
- BullMQ supports priority queues, delayed jobs, cron, and retry with exponential back-off.
- Bull Board provides a visual queue monitor without additional tooling.
- OpsNext's workflow complexity (linear action sequences) does not justify Temporal's operational overhead.

**Consequences:**
- Redis is a hard dependency — if Redis goes down, job processing stops.
- At Phase 3 scale, BullMQ can be replaced with NATS JetStream without changing job interfaces.

---

## ADR-006 — Typesense for Full-Text Search

**Status:** Accepted  
**Date:** 2026-06-11

**Context:** Need P95 < 500ms global search across contacts, accounts, leads, and opportunities.

**Decision:** Typesense (self-hosted) for all full-text and faceted search.

**Rationale:**
- Single binary, zero JVM dependencies — operational simplicity vs Elasticsearch.
- Sub-50ms search up to 10M documents per collection.
- Built-in typo tolerance; scoped API keys enforce per-tenant isolation at the search layer.
- Phase 3 migration path: Typesense cluster or Elasticsearch with the same query interface.

**Consequences:**
- Every entity mutation must enqueue a `search-sync` job — slight lag between write and search index update.
- Typesense collections must be provisioned at tenant creation.

---

## ADR-007 — Soft Delete Only

**Status:** Accepted  
**Date:** 2026-06-11

**Context:** Whether to physically delete records or retain them.

**Decision:** All mutable CRM entities use soft delete (`deletedAt` timestamp).

**Rationale:**
- GDPR right to erasure (AUD-F-03) is implemented as field anonymisation, not physical deletion — the record shape is preserved for audit log coherence.
- Audit log references entity IDs that must remain resolvable.
- Enables undo / restore operations without event sourcing overhead.

**Consequences:**
- All list queries must explicitly exclude `deleted_at IS NOT NULL` rows.
- Unique constraints (e.g., email per tenant) must be partial indexes filtered by `deleted_at IS NULL`.
- Storage grows over time; a background archival job moves old soft-deleted records to cold storage.
