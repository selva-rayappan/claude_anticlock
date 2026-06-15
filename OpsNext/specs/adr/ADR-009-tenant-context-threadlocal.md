# ADR-009 — Multi-Tenancy Middleware: ThreadLocal TenantContext

**Date:** 2026-06-11  
**Status:** Accepted  
**Deciders:** Lead Architect  
**Depends On:** ADR-002 (schema-per-tenant), ADR-001 (Java + Virtual Threads)

---

## Context

With schema-per-tenant isolation, every DB query must execute against the correct tenant's schema. The tenant identity must be propagated through the call stack from the HTTP request down to the data access layer without passing it explicitly as a parameter to every method.

Two options:
1. **ThreadLocal** — store tenant context in a thread-local variable; available anywhere in the call stack
2. **Method parameter propagation** — pass `TenantContext` explicitly as a parameter to every service and repository method

A third concern: Java 21 Virtual Threads use a thread-per-task model where threads are pooled and reused. `ThreadLocal` values persist across tasks if not cleared, which can cause tenant leakage.

---

## Decision

**Use `ThreadLocal<String>` for tenant context, with mandatory cleanup in a `finally` block in `TenantFilter`.**

```java
// TenantContext.java
public class TenantContext {
    private static final ThreadLocal<String> TENANT_SCHEMA = new ThreadLocal<>();

    public static void set(String schema) { TENANT_SCHEMA.set(schema); }
    public static String get() { return TENANT_SCHEMA.get(); }
    public static void clear() { TENANT_SCHEMA.remove(); }
}

// TenantFilter.java (OncePerRequestFilter)
@Override
protected void doFilterInternal(request, response, chain) {
    try {
        String schema = resolveTenantSchema(request);
        TenantContext.set(schema);
        chain.doFilter(request, response);
    } finally {
        TenantContext.clear(); // mandatory: prevents tenant leakage on Virtual Thread reuse
    }
}
```

---

## Consequences

**Positive:**
- Zero boilerplate in service and repository methods: no `tenantId` parameter threading through every call
- Standard Java pattern, well-understood by all Java engineers
- Works correctly with Spring's `@Transactional` because transactions are bound to threads

**Negative:**
- Virtual Thread risk: if `TenantContext.clear()` is not called after request completion, the next request on the same virtual thread inherits the previous tenant's context. **Mitigated by `finally` block in TenantFilter — this is a hard requirement.**
- `@Async` methods run in a different thread: tenant context is NOT automatically inherited. Any `@Async` method that needs tenant context must receive it as a parameter and set it at the start of the async method.
- Testing: tests must call `TenantContext.set(schema)` in setup and `TenantContext.clear()` in teardown

**Virtual Thread Verification:**
Spring Boot 3.2+ with `spring.threads.virtual.enabled=true` uses virtual threads for request handling. Virtual threads are mounted on platform threads (carriers) but have their own `ThreadLocal` scope — each virtual thread gets its own `ThreadLocal` storage. The `finally` cleanup is still required for correctness when virtual threads are pooled and reused.

---

## Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| Method parameter propagation | Extremely verbose: every service, repository, and utility method needs a `String tenantSchema` parameter; impractical for a 15-entity CRM |
| Spring's `RequestContextHolder` | Already used by Spring MVC for HTTP request attributes; using it for tenant context would create coupling to the web layer; doesn't work in background jobs |
| ScopedValue (Java 21 preview) | `ScopedValue` is a safer alternative to `ThreadLocal` for structured concurrency — it's immutable and scoped to a bounded execution context. Not used because it's a preview feature in Java 21 and its API was not yet stable at the time of this decision. **Revisit in Phase 3 if ScopedValue becomes standard.** |
