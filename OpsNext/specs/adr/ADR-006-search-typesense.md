# ADR-006 — Search: Typesense vs Elasticsearch

**Date:** 2026-06-11  
**Status:** Accepted  
**Deciders:** Lead Architect  

---

## Context

OpsNext requires full-text search across contacts, accounts, leads, and opportunities (CON-F-06: global search). Requirements:
- P95 latency < 500ms with 100K records per tenant
- Typo-tolerance (users misspell names)
- Multi-tenant isolation (tenant A cannot see tenant B results)
- Self-hosted (cost control at scale)
- Faceted search for filters

---

## Decision

**Use Typesense (self-hosted) for full-text search.**

- One collection per entity type per tenant: `{tenantId}_contacts`, `{tenantId}_accounts`, etc.
- Search sync via Spring ApplicationEvents / async jobs: entity write → Typesense upsert
- Scoped API keys enforce `filter_by: tenantId:=acme` — tenant isolation at search layer
- Backfill job for existing data on Typesense re-indexing

---

## Consequences

**Positive:**
- Single binary, zero dependencies (no JVM, no cluster required for Phase 1)
- Sub-50ms search latency on collections up to 10M documents
- Built-in typo tolerance (configurable edit distance)
- Scoped API keys provide defense-in-depth for tenant isolation
- Simple HTTP API; any language can call it

**Negative:**
- Eventual consistency: search index lags DB by the async sync delay (typically < 1 second)
- Not suitable for structured aggregations/analytics (not a replacement for ClickHouse)
- Single-node Typesense has limits; cluster mode needed at ~100M documents

**Migration path:** When Typesense single-node reaches limits, switch to Typesense cluster (same API) or Elasticsearch (different query interface — abstracts via a `SearchService` interface in the codebase).

---

## Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| Elasticsearch | 3-node minimum for HA, JVM dependency, 10× operational complexity vs Typesense for equivalent search quality at Phase 1 scale |
| Meilisearch | Good alternative but Typesense's scoped API key tenant isolation is more purpose-built for multi-tenant SaaS |
| Algolia | SaaS pricing ($0.50/1000 searches) becomes expensive at 10,000 tenant scale; no self-hosted option |
| PostgreSQL FTS (tsvector) | Adequate for < 100K records but lacks typo tolerance and has higher latency at scale; no global search fan-out across entity types |
