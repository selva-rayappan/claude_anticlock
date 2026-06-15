# ADR-007 — Frontend: Next.js 15 + React 19

**Date:** 2026-06-11  
**Status:** Accepted  
**Deciders:** Lead Architect, Frontend Lead  

---

## Context

This decision is unchanged from the original execution task plan. The Java backend change (ADR-001) does not affect the frontend. Decision documented here for completeness of the ADR set.

---

## Decision

**Use Next.js 15 (App Router) + React 19 + shadcn/ui + Tailwind CSS v4.**

State management: Zustand (UI state) + TanStack Query v5 (server state).  
Forms: React Hook Form v7 + Zod v3.  
Tables/virtualization: TanStack Table v8, TanStack Virtual v3.  
Charts: Recharts (standard), ECharts (complex BI).

---

## Consequences

**Positive:**
- Server Components (RSC) render contact/account lists server-side — zero client JS waterfall for initial data
- Next.js App Router streaming + Suspense makes large dashboards feel fast even when analytics queries are slow
- Turbopack incremental builds keep development fast as codebase grows
- `packages/shared` Zod schemas are consumed by both the frontend and (via OpenAPI generation) validated against the Java API contract

**Negative:**
- Java API client generation is an additional step: Springdoc generates OpenAPI spec → `openapi-generator` generates TypeScript client → shared in `packages/shared`
- React 19 is newer; some third-party libraries may have compatibility issues initially

**Backend change impact:**
- The TypeScript-to-backend code sharing is lost (no `packages/shared` Zod schemas directly reused in Java)
- Compensated by OpenAPI-spec-driven TypeScript client generation: `pnpm gen:api` runs `openapi-generator-cli` against the Spring Boot Springdoc output and writes to `packages/shared/src/api/`

---

## Alternatives Considered

Previously evaluated in TECHNOLOGY_DECISION_RATIONALE.md:

| Alternative | Why Rejected |
|-------------|-------------|
| Remix | Smaller ecosystem; less mature Edge runtime support |
| SvelteKit | Smaller talent pool; no React Native code sharing |
| Vue 3 + Nuxt | No React Native sharing; smaller enterprise library ecosystem |
