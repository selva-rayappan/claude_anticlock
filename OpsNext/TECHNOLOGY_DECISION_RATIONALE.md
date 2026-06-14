# OpsNext CRM — Technology Decision Rationale

**Document Version:** 1.0  
**Status:** Approved for Reference  
**Prepared By:** Lead Technical Architect  
**Date:** 2026-06-11  
**Linked Documents:** FUNCTIONAL_REQUIREMENTS.md, EXECUTION_TASK_PLAN.md  

---

## Preface: The Java 21 + Spring Boot 3 Challenge

This is the right question to ask. Java 21 with Spring Boot 3 is a world-class enterprise backend stack and in many dimensions it is **technically superior** to the chosen Node.js stack. A 15-year architect owes you an honest trade-off analysis — not a rationalisation of a forgone conclusion.

This document does three things:

1. Provides a **direct head-to-head comparison** between Java 21 + Spring Boot 3 and the chosen stack for each decision dimension
2. Gives the **specific reason** why each technology in the task plan was selected
3. Identifies the **conditions under which you should override** these decisions and choose Java

---

## Part 1 — Java 21 + Spring Boot 3 vs Node.js + Fastify

### 1.1 Runtime Performance

| Dimension | Java 21 + Spring Boot 3 | Node.js 22 + Fastify | Winner |
|-----------|------------------------|---------------------|--------|
| CPU-bound throughput | Excellent — JIT-compiled bytecode, JVM warmup amortised over uptime | Good — V8 JIT, but single-threaded event loop | **Java** |
| I/O-bound throughput (API server) | Excellent — Project Loom Virtual Threads (JEP 444) make blocking I/O as performant as async | Excellent — non-blocking I/O is the native model | **Tie** |
| Memory footprint per pod | 300–600 MB JVM heap minimum even with GraalVM native | 80–150 MB | **Node.js** |
| Cold start time (containers) | 3–8 seconds (JVM); ~300 ms (GraalVM native image) | 200–500 ms | **Node.js** (or GraalVM native) |
| Sustained high concurrency | **Java wins here** — Virtual Threads handle 100K+ blocked threads cheaply; no callback hell | Node.js performs well but long-running blocking code blocks the loop | **Java** |
| Latency consistency (P99) | More consistent under GC pressure with ZGC (Java 21 default) | GC pauses are shorter but less predictable under heavy load | **Java** (ZGC) |

**Verdict for OpsNext:** At Phase 1 scale (500 tenants, 500 req/sec), the difference is negligible. At Phase 3 scale (50,000 req/sec), Java's Virtual Threads give it an edge for sustained concurrency. If the team expects to reach enterprise scale within 18 months, Java 21 is the more future-proof runtime choice.

---

### 1.2 Multi-Tenancy Implementation

| Dimension | Java 21 + Spring Boot 3 | Node.js 22 + Fastify |
|-----------|------------------------|---------------------|
| Schema routing | Spring's `AbstractRoutingDataSource` is purpose-built for dynamic datasource routing per request; battle-tested in enterprise SaaS products | Manual Prisma client factory + `SET search_path` per request; works but is custom code |
| Hibernate multi-tenancy | First-class support: `SCHEMA` strategy in Hibernate 6 is exactly the schema-per-tenant pattern needed; zero custom code | No ORM-native equivalent; must be implemented in `packages/db` as custom middleware |
| Request context propagation | `ThreadLocal` (or ScopedValue in Java 21) propagates tenant context through the call stack reliably | Requires `AsyncLocalStorage` — works but is less mature and can be lost across certain async boundaries |
| Connection pooling | HikariCP (Spring default) is the fastest JVM connection pool, battle-tested at massive scale with schema-per-tenant | PgBouncer is a separate process (adds operational complexity); Prisma's built-in pool is less configurable |

**Verdict for OpsNext:** **Java 21 wins this dimension for multi-tenancy.** Spring's `AbstractRoutingDataSource` + Hibernate schema strategy is a more native, proven implementation of the exact architecture OpsNext requires. The Node.js implementation works but requires more custom code and carries more risk.

---

### 1.3 Type Safety & Correctness

| Dimension | Java 21 + Spring Boot 3 | Node.js 22 + Fastify |
|-----------|------------------------|---------------------|
| Type system | Statically typed, verified at compile time — no runtime type errors | TypeScript provides compile-time types but they are erased at runtime; Zod adds runtime validation |
| Null safety | Records (Java 16+), sealed classes, pattern matching in switch (Java 21) eliminate null pointer patterns elegantly | TypeScript's `strictNullChecks` helps but doesn't eliminate all runtime null issues |
| API contract enforcement | Spring's `@Valid` + Bean Validation (JSR-380) provides compile + runtime contract enforcement | Zod validation is robust but is a separate step from the type definitions |
| Refactoring safety | IDE refactoring (IntelliJ) renames across all call sites with full type resolution | TypeScript with VS Code is good but not as comprehensive as Java's tooling |
| Records & sealed types (Java 21) | Records (`record Contact(...)`) + sealed interfaces make domain modelling concise and exhaustively checked | TypeScript interfaces + discriminated unions achieve similar intent but less compile-time enforcement |

**Verdict for OpsNext:** **Java wins on type safety.** For a CRM handling financial data (deal values, invoices), statically verified types reduce production bugs meaningfully. TypeScript + Zod is good but has escape hatches (type assertions, `any`) that Java's type system does not.

---

### 1.4 Security Framework Maturity

| Dimension | Java 21 + Spring Boot 3 | Node.js 22 + Fastify |
|-----------|------------------------|---------------------|
| Authentication framework | Spring Security — 20+ years in production, fine-grained filter chain, used in banking and government systems | Lucia Auth — modern, well-designed, but relatively new (< 3 years old); smaller adoption base |
| RBAC implementation | Spring Security's Method Security (`@PreAuthorize("hasRole('MANAGER')")`) is declarative, tested, and framework-enforced | Custom Fastify hooks — correct but manually maintained; higher risk of missing a protection on a new route |
| OAuth 2.0 / OIDC | Spring Authorization Server (first-party) + Spring Security OAuth2 Client — comprehensive and certified | Arctic library — correct but far less mature and less featureful |
| SAML 2.0 | `spring-security-saml2` — first-class support, used in large enterprise integrations | `passport-saml` or `samlify` — functional but less widely deployed in enterprise |
| Audit trail | Spring Data Envers provides automatic entity versioning/audit trail out of the box | Custom `AuditService` as specified in TASK-050 — must be manually maintained |

**Verdict for OpsNext:** **Java wins on security framework maturity.** For an enterprise SaaS CRM that must support SSO (SAML 2.0, OIDC), SOC 2 compliance, and fine-grained RBAC, Spring Security's 20-year production track record is a compelling argument. AUD-F-05 (SOC 2 evidence collection) is significantly easier with Spring's existing audit infrastructure.

---

### 1.5 Ecosystem & Integration Libraries

| Integration Need | Java 21 + Spring Boot 3 | Node.js 22 + Fastify |
|----------------|------------------------|---------------------|
| Salesforce | `force-rest-api` (Java), or Spring Integration Salesforce adapter | `jsforce` library — mature, well-maintained, widely used |
| Excel (.xlsx) | Apache POI — the gold standard, used in every enterprise Java project | ExcelJS — excellent, purpose-built for Node.js |
| Background jobs | Spring Batch (for imports) + Spring Scheduler — extremely mature; `@Scheduled` for cron | BullMQ — modern, Redis-backed, excellent for queues but less mature than Spring Batch for large-volume ETL |
| Email | JavaMail / Spring Mail — mature; good for SMTP | Resend / Nodemailer — modern, excellent for transactional email |
| GraphQL | Spring for GraphQL (first-party, Netflix DGS) — excellent | Mercurius — good but smaller community |
| PDF generation | iText / JasperReports — enterprise-grade | Puppeteer / PDFKit — functional but less enterprise-polished |
| CSV/JSON processing | Jackson (JSON) — fastest JVM parser; OpenCSV — excellent | Native JSON; `papaparse` for CSV — both fast and lightweight |

**Verdict for OpsNext:** **Tie, with Java edge for batch processing.** For the Import/Export (TASK-045) and Salesforce sync (TASK-048) requirements involving 100K+ row processing, Spring Batch is architecturally superior to BullMQ + custom chunking. For real-time API and webhooks, Node.js libraries are equally capable.

---

### 1.6 Developer Availability & Team Velocity

| Dimension | Java 21 + Spring Boot 3 | Node.js 22 + Fastify |
|-----------|------------------------|---------------------|
| Global developer pool | Large — Java is the #1 enterprise language; Spring Boot is the dominant framework | Very large — Node.js/TypeScript is the most widely used web backend language in 2026 |
| Fullstack sharing | Backend Java, Frontend JavaScript/TypeScript — **two languages, two runtimes** | TypeScript end-to-end — shared types, shared validation schemas (Zod), shared business logic packages in monorepo |
| Time to first feature | Spring Boot startup, boilerplate, annotation learning curve adds ~2 weeks for a team new to it | Fastify is minimal; team familiar with TypeScript is productive day 1 |
| Code sharing in monorepo | Java backend cannot share code with Next.js frontend | `packages/shared` (Zod schemas, enums, utilities) consumed by both `apps/api` and `apps/web` — reduces duplication of validation and type definitions |
| Onboarding new developers | Senior Spring developers are well-trained but the framework is large and opinionated | TypeScript fullstack developers are easier to find and ramp up faster on a unified codebase |

**Verdict for OpsNext:** **Node.js wins on developer velocity and monorepo cohesion.** The ability to share TypeScript types, Zod validation schemas, and utility functions between the API server, web frontend, and worker processes eliminates an entire class of frontend-backend contract drift bugs. A Java backend introduces a hard language boundary that must be bridged by generated API clients.

---

### 1.7 Deployment & Operations

| Dimension | Java 21 + Spring Boot 3 | Node.js 22 + Fastify |
|-----------|------------------------|---------------------|
| Docker image size | 300–500 MB (JVM); ~80 MB (GraalVM native image) | 150–250 MB (Node.js + dependencies) |
| Container startup time | 5–15 seconds (JVM); < 1 second (GraalVM native) | 1–3 seconds |
| Kubernetes HPA responsiveness | Slower to scale out due to JVM warmup | Faster scale-out; new pods serve traffic within seconds |
| Observability (traces/metrics) | Micrometer + Spring Actuator — excellent, first-class Prometheus/Grafana integration | OpenTelemetry SDK — excellent, vendor-neutral; comparable quality |
| GraalVM native image | Eliminates cold start problem but requires all reflective code to be declared; can break Spring annotations silently | N/A — not applicable |
| Operational complexity | Spring Boot's auto-configuration is magic — debugging misconfiguration is harder for junior developers | Fastify plugins are explicit; simpler to reason about the startup sequence |

**Verdict for OpsNext:** **Node.js wins for cloud-native Kubernetes deployment** — faster pod startup means faster autoscaling response during traffic spikes (PIPE-F-01 Kanban board, CON-F-06 global search). If GraalVM native image is invested in, Java catches up, but that adds significant build complexity.

---

### 1.8 Real-Time Capabilities

| Dimension | Java 21 + Spring Boot 3 | Node.js 22 + Fastify |
|-----------|------------------------|---------------------|
| Server-Sent Events (SSE) | Spring WebFlux (reactive) handles SSE natively; Spring MVC with Virtual Threads also works | Native in Node.js HTTP — trivially simple, no additional framework needed |
| WebSockets | Spring WebSocket / STOMP — good but complex configuration | Fastify + `ws` — straightforward |
| Long-running connections | Virtual Threads handle thousands of concurrent SSE connections cheaply | Event loop handles SSE connections very efficiently |
| Reactive programming | Spring WebFlux (Project Reactor) — powerful but steep learning curve; not needed if using Virtual Threads | Async/await + event loop achieves same goals with less conceptual overhead |

**Verdict for OpsNext:** **Tie.** Both stacks handle the SSE notification stream (TASK-038) and webhook delivery (TASK-039) equally well. Node.js achieves it with less code.

---

### Summary Scorecard

| Decision Dimension | Java 21 + Spring Boot 3 | Node.js + Fastify | Weight |
|-------------------|------------------------|-------------------|--------|
| Performance (Phase 3 scale) | ✅ Win | ✅ Adequate | Medium |
| Multi-tenancy native support | ✅ **Clear Win** | ⚠️ Custom code | **High** |
| Type safety & correctness | ✅ **Win** | ✅ Adequate (TypeScript) | High |
| Security framework maturity | ✅ **Win** | ⚠️ Newer libraries | **High** |
| Enterprise integrations (batch) | ✅ Win (Spring Batch) | ✅ Adequate (BullMQ) | Medium |
| Developer velocity / monorepo | ⚠️ Language boundary | ✅ **Win** (shared TS) | **High** |
| Real-time (SSE/WS) | ✅ Adequate | ✅ **Win** | Medium |
| Cloud-native deployment | ⚠️ JVM cold start | ✅ **Win** | Medium |
| Hiring / team size | ✅ Adequate | ✅ **Win** | High |
| Operational simplicity | ⚠️ Spring magic | ✅ **Win** | Medium |

**The honest conclusion:** If OpsNext is targeting large enterprise customers (Fortune 500 Salesforce replacements), the team already has Java expertise, and security/compliance certifications (FedRAMP, SOC 2) are in scope — **Java 21 + Spring Boot 3 is the better backend choice.**

The Node.js stack was selected for OpsNext because the product starts as an **SMB-to-mid-market SaaS** (Phase 1: 500 tenants) where developer velocity, time-to-market, and monorepo code sharing outweigh the enterprise runtime advantages Java provides.

---

## Part 2 — Rationale for Every Technology in the Task Plan

### 2.1 Frontend

---

#### Next.js 15 (App Router)

**Chosen over:** Remix, SvelteKit, Nuxt (Vue), plain React + Vite

| Reason | Detail |
|--------|--------|
| **Server-side rendering** | CRM dashboards load data at request time — SSR eliminates the flash of empty content that hurts professional UX. With App Router, each page component can be a React Server Component, fetching data directly without a client-side waterfall |
| **Streaming & Suspense** | Large dashboards (RPT-F-01 dashboards with multiple chart widgets) can stream individual widgets as they resolve — the page feels responsive even when the Forecast chart query is slow |
| **API routes co-located** | `/app/api/` route handlers allow BFF (Backend For Frontend) patterns — aggregating multiple API calls server-side before returning to the browser, reducing client-side round trips |
| **Edge middleware** | Tenant resolution from subdomain, JWT validation, and redirect logic can run at Cloudflare edge (< 10ms) before the request even reaches the origin — critical for the multi-tenant routing (MT-02) |
| **Turbopack build** | Incremental builds across the 60-task codebase stay fast; Turbopack is significantly faster than Webpack for large TypeScript projects |
| **Why not Remix?** | Remix has excellent data loading patterns but smaller ecosystem, fewer UI library integrations, and less mature Edge runtime support as of 2026 |

---

#### React 19

**Chosen over:** Vue 3, Svelte, Solid.js, Angular

| Reason | Detail |
|--------|--------|
| **Concurrent rendering** | React 19's `useTransition` + `startTransition` keep the Kanban drag-and-drop (TASK-034) responsive while stage change API calls happen in background |
| **Server Components** | RSC model allows contact/account list pages to be rendered server-side with direct DB access — zero client JS hydration cost for the initial list render |
| **Ecosystem depth** | `@dnd-kit/core` (Kanban), TanStack Table, TanStack Virtual, React Hook Form, TanStack Query — all React-first; no equivalent quality exists for Vue/Svelte |
| **Shared logic with React Native** | Custom hooks, context providers, Zod validation schemas, and utility functions written for the web are directly reusable in the mobile app (TASK-053) — **this is the primary reason React over Vue** |
| **Team hire-ability** | React developers constitute 60%+ of the frontend job market; the talent pool for Vue and Svelte is significantly smaller |

---

#### shadcn/ui + Tailwind CSS v4

**Chosen over:** MUI (Material UI), Ant Design, Chakra UI, Radix only

| Reason | Detail |
|--------|--------|
| **Ownership of components** | shadcn/ui copies component source into the project — you own and customise the code. MUI and Ant Design wrap you in their opinionated styling system, making tenant branding (MT-04) difficult |
| **Zero runtime CSS** | Tailwind v4 uses CSS-only variables and layers; no JavaScript style injection; faster First Contentful Paint |
| **Radix UI primitives** | shadcn/ui is built on Radix UI which provides fully accessible primitives (WCAG 2.1 AA — C-02). Dialog, DropdownMenu, Tooltip all handle keyboard nav, focus trapping, and ARIA automatically |
| **Tenant theming** | CSS custom properties (`--primary`, `--background`) can be overridden per-tenant at runtime by injecting a `<style>` tag with tenant colour values (MT-04) — trivially simple with Tailwind v4 |
| **Why not MUI?** | MUI v6 is excellent but its bundle size (~400 KB) and opinionated Material Design aesthetic make it harder to produce a distinctive, professional CRM look |

---

#### Zustand + TanStack Query

**Chosen over:** Redux Toolkit + RTK Query, Jotai, React Context alone

| Reason | Detail |
|--------|--------|
| **Zustand for UI state** | Kanban column order, filter state, selected rows, sidebar open/close — purely local UI state that doesn't belong in server cache. Zustand's API is 5 lines; Redux for the same is 50 lines |
| **TanStack Query for server state** | Contacts list, pipeline data, user profile — all fetched from API. TanStack Query handles: caching, background refetch, stale-while-revalidate, optimistic updates (critical for Kanban drag), and pagination. Eliminates 80% of manual `useEffect` + loading state code |
| **Why not Redux Toolkit?** | RTK Query is excellent but Redux's mental model (actions, reducers, selectors) adds 3× the boilerplate for the same outcome. Unnecessary for a CRM that is largely read-heavy with discrete mutations |
| **Separation of concerns** | Zustand owns "what is the user doing right now"; TanStack Query owns "what does the server say the data is". Mixing them in Redux creates subtle cache invalidation bugs |

---

#### React Hook Form + Zod

**Chosen over:** Formik + Yup, native React forms

| Reason | Detail |
|--------|--------|
| **Performance** | React Hook Form uses uncontrolled inputs — form state is tracked in a ref, not React state. This means a 20-field contact form (CON-F-01 has 15+ fields including custom fields) doesn't trigger a re-render on every keystroke |
| **Zod end-to-end** | The same Zod schema defines: (1) TypeScript types, (2) API request validation in Fastify, (3) client-side form validation. One schema, three uses — schema drift between frontend and backend validation is eliminated |
| **Why not Formik?** | Formik re-renders on every field change by default and is significantly slower on large forms. It also lacks Zod integration at the same depth |

---

#### Recharts / Apache ECharts

**Chosen over:** D3.js, Chart.js, Victory, Highcharts

| Reason | Detail |
|--------|--------|
| **Recharts for standard charts** | Pre-built `BarChart`, `LineChart`, `PieChart` components with React-native API — the Sales Overview dashboard (RPT-F-01) charts are built in 1/10th the time of D3 |
| **ECharts for complex BI** | The custom report builder (RPT-F-03) needs heatmaps, scatter plots, and mixed-type charts. ECharts has 20+ chart types and a powerful declarative config model |
| **Why not D3.js?** | D3 gives maximum control but requires 5–10× more development time. A CRM doesn't need pixel-perfect custom visualisations — it needs reliable, readable business charts shipped fast |
| **Why not Highcharts?** | Highcharts is commercial (per-developer licence, ~$500/dev/year). Open source libraries are equivalent quality for OpsNext's use cases |

---

### 2.2 Backend

---

#### Node.js 22 LTS

**Chosen over:** Java 21, Python (FastAPI/Django), Go, .NET 9, Bun

| Reason | Detail |
|--------|--------|
| **TypeScript monorepo unity** | The #1 reason. Node.js + TypeScript allows `packages/shared` to export Zod schemas and types consumed directly by `apps/api`, `apps/web`, and `apps/worker`. A Java backend would require generating a TypeScript API client from OpenAPI — an extra build step that breaks type safety at the seam |
| **I/O-bound workload fit** | A CRM API server spends 90% of its time waiting for database responses, not computing. Node.js's async I/O model is optimal for this — while one request awaits a Postgres query, the event loop handles dozens of other requests |
| **JSON as first-class citizen** | CRM data is JSON-heavy: JSONB custom fields, activity metadata, workflow configs, address objects. Node.js processes JSON natively without deserialisation overhead |
| **NPM ecosystem for SaaS tooling** | `stripe`, `resend`, `@anthropic-ai/sdk`, `jsforce`, `opentelemetry` — all have JavaScript-first SDKs. Java has equivalents but JavaScript SDKs typically get new features and bug fixes first |
| **Why not Go?** | Go is excellent for high-throughput microservices but lacks the ORM ecosystem depth (GORM is nowhere near Prisma), has no comparable end-to-end TypeScript sharing, and would require a language context switch for fullstack developers |
| **Why not Python?** | Python (FastAPI) has excellent ergonomics and typing, but GIL limits true multi-core utilisation on the API tier, and the lack of monorepo sharing with the TypeScript frontend means maintaining two separate type systems |
| **Why not Bun?** | Bun 1.x is production-viable but the ecosystem maturity for enterprise features (Prisma compatibility, full OpenTelemetry instrumentation, all Fastify plugins) still lags Node.js LTS by ~12 months |

---

#### Fastify v5

**Chosen over:** Express, NestJS, Hono, Koa, Elysia

| Reason | Detail |
|--------|--------|
| **Throughput** | Fastify handles ~85,000 req/sec (simple route, Node.js 22) vs Express ~35,000. At Phase 3 (50,000 req/sec target), Express would require 2–3× more instances. Fastify's route compilation and schema serialisation are the key differentiators |
| **Schema-first serialisation** | Fastify uses `@fastify/ajv-compiler` to compile response schemas into optimised serialisation functions. A Contact response with 25 fields serialises 2–4× faster than `JSON.stringify` — this matters at 10,000 concurrent users (NFR) |
| **Type-safe plugins** | Fastify's plugin system with TypeScript generics allows `request.tenantContext` and `request.user` to be fully typed throughout the request lifecycle — the multi-tenancy middleware (TASK-012) is trivially implemented |
| **Why not NestJS?** | NestJS is the most popular Node.js enterprise framework but it wraps Express/Fastify with heavy decorator-based abstraction. For a team that understands the domain, NestJS adds boilerplate (modules, providers, decorators for every service) without proportional benefit. It also adds significant startup time and memory overhead. Fastify gives 90% of NestJS's structure with 30% of the ceremony |
| **Why not Express?** | Express is not maintained at the pace needed for production security patches. More critically, it has no native schema validation, no async error handling by default, and its middleware model is error-prone under concurrent async operations |
| **Why not Hono?** | Hono is excellent for edge functions but its ORM integration and middleware ecosystem for full application development is not as mature as Fastify in 2026 |

---

#### Prisma 6

**Chosen over:** Drizzle ORM, TypeORM, Sequelize, Kysely, raw `pg` driver

| Reason | Detail |
|--------|--------|
| **Schema-per-tenant support** | Prisma's `datasourceUrl` can be set dynamically per request context; combined with `SET search_path` in middleware, it implements schema-per-tenant cleanly. This directly maps to MT-01 through MT-03 |
| **Type-safe query client** | Every Prisma query is typed from the schema. `prisma.contact.findMany({ where: { accountId } })` returns `Contact[]` — no runtime type errors from ORM mismatches |
| **Migration tooling** | `prisma migrate dev` handles both the public platform schema and per-tenant schemas. The migration history is tracked in the `_prisma_migrations` table per schema, making the multi-schema migration strategy (TASK-012.6) tractable |
| **JSONB support** | Custom fields are stored as JSONB (`customFields` on Contact, Account, etc.). Prisma 6 has native JSONB path query support — `where: { customFields: { path: ['industry'], equals: 'SaaS' } }` — critical for CON-F-07 dynamic segmentation |
| **Why not Drizzle?** | Drizzle is faster (closer to raw SQL) and its schema definition is more composable than Prisma's. However, Drizzle's migration story for schema-per-tenant is less documented and its JSONB query support is less ergonomic. As of 2026, Prisma has more production deployments at scale |
| **Why not TypeORM?** | TypeORM has suffered from slow maintenance, known N+1 bugs in relation loading, and its decorator-based approach conflicts with Fastify's functional style. Not recommended for new projects |
| **Why not raw `pg`?** | Raw SQL gives maximum control and performance, but at the cost of type safety and maintainability. Every query for a 15-entity CRM with custom fields would require manual type mapping. The productivity loss far outweighs the performance gain for this workload |

---

#### Lucia Auth + Arctic

**Chosen over:** Auth.js (NextAuth), Passport.js, Keycloak, custom JWT

| Reason | Detail |
|--------|--------|
| **Framework-agnostic** | Lucia is not tied to Next.js or Express — it works identically in Fastify. Auth.js (NextAuth) is designed around Next.js's request/response model and requires significant adaptation for a standalone Fastify API server |
| **Full control** | Lucia provides the session management primitives (create session, validate session, invalidate session) but you control the database layer. The Lucia adapter for Prisma writes session rows using your existing Prisma client — no separate auth database |
| **Token rotation built-in** | Lucia's session model natively supports refresh token rotation (IAM-F-02) — each use of a session token issues a new one and invalidates the old, preventing replay attacks without custom code |
| **Arctic for OAuth** | Arctic is the companion library for OAuth 2.0 providers (Google, Microsoft, GitHub, etc.). It handles PKCE, state validation, token exchange, and token refresh in a consistent API across all providers (IAM-F-06) |
| **Why not Keycloak?** | Keycloak is a complete Identity Provider — excellent for large enterprises but introduces a separate service to deploy, configure, and maintain. Its complexity is disproportionate to OpsNext's Phase 1 needs and it complicates the per-tenant SSO configuration (MT-08) |
| **Why not Passport.js?** | Passport is 12 years old, was designed for Express's synchronous middleware model, and requires significant wrapping to work correctly with Fastify's async lifecycle. Its strategy-per-file architecture doesn't compose well with TypeScript |

---

#### BullMQ

**Chosen over:** Agenda, Bee-Queue, AWS SQS (direct), Inngest, Temporal

| Reason | Detail |
|--------|--------|
| **Redis-backed durability** | Jobs persist in Redis across worker restarts. For the import pipeline (TASK-045), workflow execution (TASK-036), and notification delivery (TASK-038) — if the worker pod restarts mid-job, BullMQ resumes from the last checkpoint |
| **Priority queues** | Notification delivery for task reminders (WF-F-01) needs to be higher priority than bulk search index sync. BullMQ supports multiple priority levels per queue |
| **Cron support** | `addRepeatableJob` with cron expression handles: stale deal detection (PIPE-F-05), scheduled report delivery (RPT-F-04), segment count refresh (TASK-025.5), data retention jobs (AUD-F-04) — all in one framework |
| **Delayed jobs** | `delay: milliseconds` enables task reminder notifications (TASK-035.5) and workflow date triggers (TASK-036.8) — a job scheduled for a specific future time |
| **Why not Temporal?** | Temporal is architecturally superior for complex long-running workflows but requires a separate Temporal server (significant ops overhead). BullMQ covers OpsNext's workflow complexity (linear action sequences) without the infrastructure cost |
| **Why not AWS SQS directly?** | SQS lacks: job priorities, delayed jobs with millisecond precision, built-in retry with back-off, job progress tracking, and a UI (Bull Board). BullMQ's Redis backing is simpler to operate than SQS for the job patterns OpsNext needs |

---

#### Resend (Email)

**Chosen over:** SendGrid, AWS SES, Mailgun, Nodemailer (SMTP only)

| Reason | Detail |
|--------|--------|
| **React Email templates** | Resend renders React Email components server-side — email templates are React components with full TypeScript type safety and component reuse. Tenant branding (logo, colours) is injected as props. Compared to Handlebars/Mustache templates in SendGrid, this is dramatically better developer experience |
| **Developer-first API** | Resend's API is one function call: `resend.emails.send({ from, to, subject, react: <WelcomeEmail /> })`. No arcane template editor, no API key per domain complexity |
| **Webhook for email events** | Resend fires webhooks for: delivered, opened, clicked, bounced, complained. These feed the email sequence analytics (TASK-037.5) |
| **Deliverability** | Resend is built by the team behind React Email; their sending infrastructure has excellent deliverability rates |
| **Nodemailer as fallback** | Enterprise tenants may require routing email through their own SMTP relay (compliance requirement). Nodemailer handles this case without replacing Resend for the standard path |

---

### 2.3 Data Layer

---

#### PostgreSQL 16

**Chosen over:** MySQL 8, MongoDB, CockroachDB, PlanetScale (MySQL)

| Reason | Detail |
|--------|--------|
| **JSONB for custom fields** | MT-05 requires custom fields on all core entities without schema changes. PostgreSQL's `JSONB` stores arbitrary structured data with GIN indexes for fast querying — `WHERE custom_fields @> '{"tier": "enterprise"}'` is indexed and fast. MySQL's JSON support is second-class; MongoDB's document model loses ACID |
| **Schema-per-tenant isolation** | PostgreSQL's schema namespace is purpose-built for the architecture. One cluster, thousands of schemas, each isolated by `search_path`. MySQL has no equivalent concept — tenant isolation requires separate databases or row-level discrimination |
| **ACID + complex transactions** | Lead conversion (TASK-027.3) creates Contact + Account + Opportunity atomically. Workflow execution (TASK-036) and audit logging (TASK-050) must be atomic with the entity mutation. PostgreSQL's MVCC provides this without table locks |
| **Full-text search (built-in)** | `tsvector` + `tsquery` provides good-enough full-text search for small tenants before Typesense is needed — deferrable optimisation |
| **Row-level security (RLS)** | Phase 3 option: PostgreSQL RLS policies can enforce tenant isolation at the database level as an additional safety layer beyond application-level middleware |
| **`pg_trgm` for duplicate detection** | CON-F-04 duplicate detection uses trigram similarity (`similarity(name, 'Acme Corp') >= 0.8`) — built into PostgreSQL, no external service needed |
| **Why not MongoDB?** | MongoDB's flexible document model is appealing for custom fields but sacrifices ACID transactions (needed for lead conversion, audit logging), and its query language is verbose for relational CRM data (contact → account → opportunity joins). The lack of schema-per-tenant namespace means tenant isolation is row-level, harder to enforce |
| **Why not CockroachDB?** | CockroachDB's distributed SQL is excellent for global data residency (C-01 EU tenants) but its distributed transaction overhead adds 2–5× latency on local operations vs PostgreSQL. OpsNext's Phase 1–2 scale doesn't justify this cost |

---

#### Redis 7

**Chosen over:** Memcached, DynamoDB (as cache), Valkey

| Reason | Detail |
|--------|--------|
| **Multiple data structures** | Redis serves 4 separate purposes in OpsNext: (1) Session/token store (Strings + TTL), (2) BullMQ job queues (Sorted Sets + Lists), (3) Rate limiting (counters with EXPIRE), (4) Pub/Sub for SSE notifications (TASK-038). Memcached only provides key-value strings |
| **Pub/Sub for real-time** | `PUBLISH notifications:{userId}` → `SUBSCRIBE notifications:{userId}` enables the SSE notification stream (TASK-038.1) without a separate WebSocket server. All API pod instances can publish; the subscribing pod sends SSE to the connected user |
| **BullMQ dependency** | BullMQ is architecturally coupled to Redis — it uses Redis data structures for queue state. This is not a separate concern; it is a design constraint |
| **Permission cache** | Role permissions loaded from DB are cached in Redis with `SET rbac:{tenantId}:{userId} {json} EX 300` — 5-minute TTL. This eliminates a DB query on every permission check (TASK-017.2), critical at 10,000 concurrent users (NFR) |

---

#### Typesense

**Chosen over:** Elasticsearch, Meilisearch, Algolia, PostgreSQL FTS

| Reason | Detail |
|--------|--------|
| **Operational simplicity** | Typesense is a single binary with zero dependencies (unlike Elasticsearch which requires JVM, significant RAM, and complex cluster configuration). Phase 1 runs on a single Typesense node with < 500 MB RAM |
| **Sub-100ms search** | CON-F-06 requires P95 < 500ms for global search. Typesense consistently delivers < 50ms for collections up to 10 million documents |
| **Typo tolerance** | CRM users search by partial name and misspell contacts. Typesense's built-in typo tolerance (edit distance) returns `"Smth"` results for query `"Smith"` — Postgres FTS requires explicit trigram setup for equivalent behaviour |
| **Multi-tenancy scoping** | Scoped API keys in Typesense enforce `filter_by: tenantId:=acme` at the search layer — a tenant can never see another tenant's search results even with a stolen API key |
| **Phase 3 migration path** | When Typesense reaches its single-node limits (~100M documents), the same query interface is preserved on a Typesense cluster or Elasticsearch replacement — the search service interface in OpsNext abstracts this |
| **Why not Algolia?** | Algolia is excellent but is SaaS-only pricing (per search operation) — at OpsNext Phase 3 scale (10,000 tenants × daily searches), the cost is prohibitive. Typesense is self-hosted with flat infrastructure cost |
| **Why not Elasticsearch?** | Elasticsearch is the industry standard at massive scale but its operational overhead (JVM, 3-node minimum for HA, complex index mapping) is unjustified for Phase 1–2. Typesense achieves equivalent search quality with 1/10th the ops effort |

---

#### ClickHouse

**Chosen over:** BigQuery, Redshift, PostgreSQL views, TimescaleDB

| Reason | Detail |
|--------|--------|
| **Columnar aggregation** | RPT-F-01 through RPT-F-05 require aggregations (SUM, COUNT, AVG) across millions of rows. ClickHouse's columnar storage returns these in < 100ms where PostgreSQL row storage takes seconds |
| **Self-hosted** | BigQuery and Redshift are SaaS with per-query costs. For a multi-tenant CRM with thousands of tenants running reports concurrently, self-hosted ClickHouse has predictable flat cost |
| **Append-only event store** | Audit logs (AUD-F-01), activity events, and stage history are append-only — they never UPDATE. ClickHouse's MergeTree engine is optimised for exactly this pattern |
| **Phase 2+ use only** | Phase 1 uses PostgreSQL views for reporting (adequate for < 1M records per tenant). ClickHouse is introduced in Phase 2 when query latency on PostgreSQL aggregations becomes measurable |
| **Why not TimescaleDB?** | TimescaleDB extends PostgreSQL with time-series optimisation. Good for Phase 2 but its compression and query planning don't match ClickHouse for multi-dimensional CRM analytics |

---

#### AWS S3 / Cloudflare R2

**Chosen over:** Azure Blob, GCS, on-disk storage

| Reason | Detail |
|--------|--------|
| **Import file staging** | CSV/XLSX import files (TASK-045.1) can be up to 50 MB. Uploading directly to S3 via pre-signed URL keeps the file off the API server's disk and memory |
| **Export delivery** | Report exports and GDPR data exports (TEN-F-08, AUD-F-03) are generated by workers and stored in S3; users download via pre-signed URL (24h expiry) — API server never streams large files |
| **Cloudflare R2 for cost** | R2 has zero egress fees (vs S3's $0.09/GB egress). For an attachment-heavy CRM with many tenants downloading exports, R2 reduces storage costs by 40–60% at scale. S3 is used for imports (inbound, no egress cost) |
| **Multi-region compliance** | EU tenants' data must be stored in EU regions (C-01). S3 bucket in `eu-west-1` for EU tenants; US tenants use `us-east-1` — tenant's region set at provisioning time |

---

### 2.4 Infrastructure & DevOps

---

#### Kubernetes (EKS)

**Chosen over:** ECS/Fargate, Fly.io, Railway, Render, Heroku

| Reason | Detail |
|--------|--------|
| **Horizontal Pod Autoscaling** | The NFR requires 10,000 concurrent users and 500 → 50,000 req/sec across phases. HPA scales API pods from 2 to 50 based on CPU/custom metrics (queue depth) — impossible on Heroku/Render |
| **Multi-tenancy isolation** | Kubernetes Namespaces, NetworkPolicies, and ResourceQuotas allow isolation of tenant workloads at the infrastructure level in Phase 3 (dedicated nodes for Enterprise tenants) |
| **StatefulSets for workers** | BullMQ workers need graceful shutdown (drain queue before terminating). Kubernetes StatefulSet lifecycle hooks (`preStop: sleep 30`) handle this |
| **Why not ECS/Fargate?** | Fargate is simpler but lacks: custom HPA metrics (queue depth scaling), `kubectl exec` for debugging, PodDisruptionBudget for zero-downtime deploys, and the Kubernetes ecosystem for service mesh and observability |
| **Why not Fly.io?** | Fly.io is excellent for smaller applications but its multi-region routing, database management, and enterprise support are not yet at the level OpsNext's SLA requires |

---

#### Terraform

**Chosen over:** Pulumi, AWS CDK, CloudFormation, Ansible

| Reason | Detail |
|--------|--------|
| **Declarative, provider-agnostic** | The FRD constraint A-01 (AWS Phase 1, multi-cloud Phase 2) means IaC cannot be AWS-specific. Terraform has providers for AWS, Azure, GCP, Cloudflare, Datadog, PagerDuty — all used in OpsNext's stack |
| **State management** | Terraform state in S3 + DynamoDB lock is the industry standard. `terraform plan` shows exactly what will change before `apply` — critical for a production system |
| **Module ecosystem** | `terraform-aws-modules` provides battle-tested VPC, EKS, RDS modules that encode best practices. Using these instead of raw `aws_` resources reduces the time to secure infrastructure by weeks |
| **Why not Pulumi?** | Pulumi (TypeScript IaC) is technically appealing for a TypeScript monorepo. However, its state management, provider coverage, and community size are smaller than Terraform. The incremental benefit doesn't justify the migration risk |

---

#### GitHub Actions + ArgoCD

**Chosen over:** GitLab CI, Jenkins, CircleCI, Argo Workflows, Flux

| Reason | Detail |
|--------|--------|
| **GitHub Actions** | Co-located with the source repository — no separate CI server to maintain. Native integration with GitHub PRs (status checks, deployment environments, manual approval gates). Marketplace actions for every step needed (pnpm, Docker buildx, Kubernetes, Terraform) |
| **ArgoCD (GitOps)** | ArgoCD watches the Git repository for Kubernetes manifest changes and syncs the cluster. This means: (1) the cluster state is always auditable from git history, (2) deployments are reversible by reverting a commit, (3) ArgoCD provides a visual diff of what changed between deploy |
| **Separation of CI and CD** | GitHub Actions builds and pushes images (CI); ArgoCD deploys them (CD). ArgoCD's sync policy is automated for staging, manual approval for production — matching the environment strategy in TASK-010.1 |
| **Why not Jenkins?** | Jenkins requires a server to maintain, plugin updates to manage, and a Groovy DSL that most TypeScript engineers find unfamiliar. In 2026, GitHub Actions has superseded Jenkins for new projects |

---

#### Cloudflare (CDN + WAF)

**Chosen over:** AWS CloudFront + WAF, Fastly, Akamai

| Reason | Detail |
|--------|--------|
| **Integrated DDoS protection** | Cloudflare's magic transit absorbs L3/L4 DDoS without the OpsNext team having to configure AWS Shield Advanced ($3,000/month) separately |
| **WAF at edge** | OWASP Core Rule Set runs at Cloudflare's edge — malicious requests are blocked before they consume any AWS egress or compute. Critical for an application with public-facing registration and import endpoints |
| **R2 integration** | Cloudflare R2 (object storage) integrates directly with Cloudflare CDN — attachments and export files served from edge with no egress fees |
| **Workers for edge logic** | Tenant subdomain resolution and JWT validation can be moved to Cloudflare Workers in Phase 3 — reducing API server load for auth overhead |
| **Cost** | Cloudflare Pro ($25/month) includes WAF + DDoS + CDN. AWS WAF + CloudFront equivalent is $100–500/month at OpsNext's traffic levels |

---

#### OpenTelemetry → Grafana Stack

**Chosen over:** Datadog, New Relic, AWS X-Ray, Dynatrace

| Reason | Detail |
|--------|--------|
| **Vendor lock-in avoidance** | OpenTelemetry is vendor-neutral. Instrumented code emits traces/metrics/logs in OTLP format — the backend can be swapped from Grafana to Datadog to Jaeger without changing application code |
| **Cost at scale** | Datadog costs $23+/host/month for infrastructure monitoring, additional for APM traces, logs, and custom metrics. At 20+ Kubernetes nodes, this is $5,000–10,000/month. Grafana OSS stack costs infrastructure only (~$200/month on EKS) |
| **Loki for tenant-aware logs** | Loki's label-based indexing allows `{tenantId="acme"}` log queries — essential for debugging tenant-specific issues without scanning all logs |
| **Tempo for distributed traces** | A single API request that triggers a workflow (TASK-036) that sends an email (TASK-038) and updates search index (TASK-013) touches 3 services. Tempo traces the full journey with parent-child span relationships |

---

## Part 3 — When to Choose Java 21 + Spring Boot 3 Instead

Override the Node.js decision and use Java 21 + Spring Boot 3 if **two or more** of the following are true:

| Condition | Reason |
|-----------|--------|
| The founding engineering team already has Java/Spring expertise | Retraining a Java team to Node.js costs more than the monorepo sharing benefit gains |
| The primary customers are Fortune 500 enterprises (not SMBs) | Enterprise procurement teams trust Java/Spring's compliance pedigree; sales cycles require it |
| FedRAMP or FISMA compliance is in scope | Spring Security's compliance certifications and audit trails are more mature |
| Planned team size is > 10 backend engineers | At scale, Java's compile-time type safety and refactoring tools reduce bugs in large codebases more than TypeScript does |
| The product roadmap includes heavy ML/data processing (not just LLM API calls) | Java's JVM performance and libraries (Apache Spark, Flink) are superior for analytical workloads |
| The mobile app is not React Native (e.g., native Swift/Kotlin) | If there is no shared TypeScript codebase, the monorepo unity argument disappears |

### If switching to Java 21 + Spring Boot 3, the following task plan changes apply:

| Task Plan Section | Node.js Choice | Java Replacement |
|-------------------|---------------|-----------------|
| TASK-006 (Monorepo) | Turborepo + pnpm | Gradle multi-project build; separate frontend repo or Nx |
| TASK-010/011 (Schema) | Prisma 6 | Spring Data JPA + Hibernate 6 (schema-per-tenant via `AbstractRoutingDataSource`) |
| TASK-012 (Multitenant MW) | Custom Prisma factory | `TenantContext` ThreadLocal + `AbstractRoutingDataSource` — less custom code |
| TASK-014–019 (IAM) | Lucia Auth + Arctic | Spring Security 6 + Spring Authorization Server |
| TASK-036 (Workflow Engine) | BullMQ | Spring Batch + Spring Integration or Temporal |
| TASK-041 (Reports) | Prisma queries | Spring Data JPA queries + JasperReports |
| TASK-043 (API Framework) | Fastify v5 | Spring Web MVC (Virtual Threads) or Spring WebFlux |
| TASK-050 (Audit) | Custom AuditService | Spring Data Envers (automatic entity versioning) |

---

*This document should be reviewed at the Phase 0 architecture sign-off meeting. The technology choices are binding for the chosen track but revisable at Phase 3 milestone for greenfield services.*

*Document Owner: Lead Technical Architect*  
*Review Required: CTO / Engineering Lead sign-off before TASK-001 commences*
