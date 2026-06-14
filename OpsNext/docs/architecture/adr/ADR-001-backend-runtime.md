# ADR-001 — Backend Runtime: Java 21 + Spring Boot 3 vs Node.js + Fastify

**Date:** 2026-06-11  
**Status:** Accepted  
**Deciders:** Lead Architect, Engineering Lead  

---

## Context

The original execution task plan specified Node.js 22 + Fastify v5 as the API server runtime. Before implementation commenced, the engineering team re-evaluated this decision based on the following factors:

1. The founding backend engineers have 5+ years of Java/Spring Boot production experience
2. OpsNext targets enterprise and mid-market customers where Spring Security's compliance pedigree (SOC 2, GDPR) carries weight in procurement
3. The multi-tenancy pattern (schema-per-tenant) has native, battle-tested support in Spring + Hibernate via `AbstractRoutingDataSource`
4. Java 21 Virtual Threads (JEP 444) eliminate the key performance argument for Node.js's non-blocking model

The TECHNOLOGY_DECISION_RATIONALE.md documents the full head-to-head comparison across 8 dimensions.

---

## Decision

**Use Java 21 + Spring Boot 3.4.1 as the API server runtime.**

Key components of the chosen stack:
- Spring Boot 3.4.1 (Spring Framework 6.2)
- Spring Security 6.4 (filter chain, method security, OAuth2 client)
- Spring Data JPA + Hibernate 6.6 (platform schema entities)
- JJWT 0.12.6 (JWT generation and validation)
- HikariCP 5.1 (connection pool)
- Gradle 8.11.1 (build tool)
- Virtual threads: `spring.threads.virtual.enabled: true`

The Node.js frontend (`apps/web`) and all `packages/shared` TypeScript code are unchanged.

---

## Consequences

**Positive:**
- `AbstractRoutingDataSource` + Hibernate schema strategy gives native schema-per-tenant support; zero custom code for the routing layer
- Spring Security's 20-year production track record reduces auth implementation risk
- BCrypt, PBKDF2, and password policy enforcement are built into Spring Security
- Spring Data Envers provides automatic entity audit history (Phase 15)
- Java's compile-time type safety catches a class of bugs TypeScript cannot
- Virtual threads make blocking JDBC calls as efficient as reactive async

**Negative:**
- Lost TypeScript monorepo code sharing between backend and frontend: `packages/shared` Zod schemas and types cannot be directly consumed by the Java backend; API contract must be maintained separately
- JVM container startup time (5–15s) is slower than Node.js (1–3s); mitigated by readiness probes and pre-warming
- JVM heap memory per pod is higher (300–600 MB vs 80–150 MB for Node.js); factored into Kubernetes resource requests
- Backend and frontend engineers must context-switch between Java and TypeScript

**Mitigations:**
- OpenAPI 3.1 spec generated from Spring controllers (Springdoc) is used to generate a TypeScript API client for the frontend, preserving type safety at the seam
- Docker multi-stage build with GraalVM native image compilation is evaluated for Phase 3 to reduce cold start time
- Kubernetes `minReadySeconds` and HPA warm-up periods account for JVM startup

---

## Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| Node.js 22 + Fastify v5 | Team's Java expertise and schema-per-tenant native support outweighed monorepo sharing benefit |
| Go (Gin / Chi) | No ORM equivalent to Hibernate for schema-per-tenant; team has no Go expertise |
| .NET 9 (ASP.NET Core) | Strong alternative but team has Java expertise, not C#; library ecosystem overlap is minimal |
| Python FastAPI | GIL limits multi-core CPU throughput; weaker enterprise auth library ecosystem |
