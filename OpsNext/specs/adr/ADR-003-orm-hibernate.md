# ADR-003 — ORM: Spring Data JPA + Hibernate 6 vs Prisma 6

**Date:** 2026-06-11  
**Status:** Accepted  
**Deciders:** Lead Architect, DBA  
**Depends On:** ADR-001 (Java runtime), ADR-002 (schema-per-tenant)

---

## Context

Following ADR-001 (Java runtime selection), the ORM choice naturally shifts. The original plan specified Prisma 6 (TypeScript). With a Java backend, the primary options are:

1. **Spring Data JPA + Hibernate 6** — standard Java ORM
2. **jOOQ** — type-safe SQL builder
3. **Spring Data JDBC** — lighter than JPA, no lazy loading
4. **Raw JDBC** — maximum control, no abstraction

Constraint from ADR-002: The schema-per-tenant pattern requires dynamic `search_path` switching per request, which complicates standard JPA entity mapping.

---

## Decision

**Use a hybrid approach:**
- **Spring Data JPA + Hibernate 6** for `public` schema entities (Tenant, TenantConfig, PlatformAdmin, TenantSubscription) — these have stable schemas and benefit from JPA's caching, lazy loading, and relationship management
- **Custom `TenantJdbcTemplate`** wrapping `JdbcTemplate` for all tenant-schema entities — direct SQL with explicit schema prefix, participating in Spring's transaction management via `DataSourceUtils.getConnection()`

---

## Consequences

**Positive:**
- JPA handles the platform schema cleanly: `@Entity`, `@OneToOne`, `@ManyToOne` relationships work without custom routing
- `TenantJdbcTemplate` gives full SQL control for tenant entities: no surprises from Hibernate lazy-loading, no N+1 risks, explicit schema prefix on every query
- `DataSourceUtils.getConnection()` ensures `TenantJdbcTemplate` participates in `@Transactional` boundaries — atomic operations across multiple entity writes work correctly
- No Hibernate proxy magic on tenant entities; record types and plain POJOs work well
- SQL is readable and auditable — important for security review

**Negative:**
- Tenant entities require manual SQL: more boilerplate than JPA for CRUD operations
- No Hibernate query plan caching for tenant entity queries
- Manual `ResultSet` mapping needed (mitigated by Spring's `BeanPropertyRowMapper` and `RowMapper` lambdas)
- Two data access patterns in one codebase increases cognitive overhead for new engineers

**Mitigation:**
- `TenantJdbcTemplate` provides a clean wrapper API that hides the schema-prefix complexity
- Row mappers are co-located with their entity classes
- Considered Hibernate's multi-tenancy `SCHEMA` strategy — rejected because it requires one `SessionFactory` per tenant or complex `CurrentTenantIdentifierResolver` + `MultiTenantConnectionProvider` wiring that is harder to reason about than direct JDBC

---

## Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| Hibernate multi-tenancy SCHEMA strategy | Requires complex `MultiTenantConnectionProvider` wiring; SessionFactory-per-tenant approach doesn't scale to 10,000 tenants |
| jOOQ | Excellent type-safe SQL but requires schema-level code generation; generating per-tenant would require per-tenant jOOQ instances |
| Spring Data JDBC (all entities) | No relationship support; would require manual join queries for all related entity fetching |
| Prisma 6 (Java via generated client) | No mature Prisma Java client; OpenAPI-generated client would add a network hop for every DB operation |
