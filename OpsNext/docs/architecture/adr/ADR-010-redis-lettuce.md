# ADR-010 — Cache: Redis 7 (Lettuce) vs Caffeine Local Cache

**Date:** 2026-06-11  
**Status:** Accepted  
**Deciders:** Lead Architect  

---

## Context

OpsNext needs caching for:
1. RBAC permission sets per user (loaded from DB on every request without cache)
2. Tenant slug → tenant ID lookups (TenantFilter runs on every request)
3. JWT deny-list (revoked tokens on logout)
4. Rate limiting counters (per-tenant, per-endpoint)
5. BullMQ job queue backing store (ADR-004)
6. Real-time notification delivery (Redis Pub/Sub for SSE, TASK-038)

Two main options: **Redis** (distributed, shared across all API pod instances) or **Caffeine** (in-process, per-pod local cache).

---

## Decision

**Use Redis 7 (Lettuce async client) for all caching and coordination.**

Redis serves all 6 use cases above. Caffeine is used only as an L1 cache in front of Redis for the RBAC permission sets (write-through, 30s TTL) in Phase 2 when permission checks become a hot path.

---

## Consequences

**Positive:**
- Shared across all API pods: a user who logs out on pod A has their token denied on pod B without cache invalidation messaging
- Rate limiting is accurate across all pods (single counter in Redis vs per-pod counters that miss cross-pod requests)
- Pub/Sub enables SSE notifications: any pod can publish a notification and the subscribing pod delivers it to the browser
- Redis is already required for BullMQ-equivalent job queuing (ADR-004) — adding caching to the same infrastructure adds no new operational dependency

**Negative:**
- Network round-trip for every cache access: Redis call adds ~0.5ms vs ~0.01ms for Caffeine; at 10,000 req/sec this is the dominant latency source for cached lookups
- Single point of failure if Redis is unavailable (mitigated by AWS ElastiCache Multi-AZ with automatic failover)
- Redis cluster mode adds complexity if single-node Redis reaches capacity

**L1/L2 Cache Strategy (Phase 2):**
- L1: Caffeine (in-process, 30s TTL, max 10,000 entries) for RBAC permissions — hot path
- L2: Redis (5 minute TTL) — source of truth
- Cache invalidation: on role change, invalidate Redis key; Caffeine TTL expires within 30s

---

## Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| Caffeine only | Cannot share state across pods: logout on pod A doesn't deny token on pod B; rate limiting counters are per-pod (inaccurate); no Pub/Sub for notifications |
| Memcached | No Pub/Sub; no sorted sets (used for rate limiting); no persistence; BullMQ is coupled to Redis |
| Hazelcast (distributed in-process) | Adds another clustering system to manage; operational overhead not justified given Redis is already required for job queuing |
| Spring Cache abstraction only | Spring's `@Cacheable` is a useful annotation layer but doesn't remove the need to choose a backing store |
