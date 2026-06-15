<!--
SYNC IMPACT REPORT
==================
Version Change: [TEMPLATE] → 1.0.0
Bump Type: MINOR — first-time population of all principles and sections from blank template.

Principles Added (all new — replacing blank template tokens):
  - I.   Multi-Tenancy First (NEW)
  - II.  API Contract Integrity (NEW)
  - III. Phase-Gate Delivery (NEW)
  - IV.  Security & Auth Discipline (NEW)
  - V.   Simplicity & Integration-Ready (NEW)
  - VI.  Observability by Default (NEW)

Sections Added:
  - Technology Constraints (replaces [SECTION_2_NAME])
  - Development Workflow (replaces [SECTION_3_NAME])

Templates Reviewed:
  - .specify/templates/plan-template.md  ✅ Compatible — Constitution Check gate already present
  - .specify/templates/spec-template.md  ✅ Compatible — FR/SC structure aligns with principles
  - .specify/templates/tasks-template.md ✅ Compatible — phase/checkpoint structure aligns
  - .specify/templates/commands/         ✅ No command templates exist — skipped

Deferred Items: None — all placeholders resolved.
-->

# OpsNext Constitution

## Core Principles

### I. Multi-Tenancy First

Every feature, data model, query, and API endpoint MUST be tenant-aware from day one.
The schema-per-tenant isolation model (`public` platform schema + `tenant_{slug}` per
organisation) is non-negotiable and MUST NOT be bypassed for convenience.

- All writes and reads to tenant data MUST flow through `TenantContext` (ThreadLocal) and
  `TenantJdbcTemplate`; direct datasource access bypassing tenant context is forbidden.
- Cross-tenant data leakage of any kind is a critical defect requiring immediate rollback.
- New entities destined for tenant schemas MUST NOT be placed in the platform (`public`) schema.
- Performance optimisations (caching, indexing) MUST preserve tenant isolation boundaries.

**Rationale**: Isolation is a contractual and legal obligation to tenants. Retrofitting
multi-tenancy is prohibitively expensive; it must be structural from the start.

### II. API Contract Integrity

All backend REST APIs MUST be versioned, contract-tested, and backward-compatible within
a major version. A breaking change MUST trigger a major version increment and a documented
migration plan before deployment.

- API responses MUST conform to a consistent envelope: `{ data, meta, errors }`.
- Error codes MUST be machine-readable (e.g., `TENANT_NOT_FOUND`) alongside human messages.
- Any change to a public endpoint's request/response shape is a breaking change unless it
  is purely additive (new optional field).
- Contract tests MUST live under `tests/contract/` and MUST run in CI before merge.

**Rationale**: External integrations (Zoho, Salesforce, PowerApps, Excel) and frontend
clients depend on stable contracts. Surprises at integration time are costly.

### III. Phase-Gate Delivery (NON-NEGOTIABLE)

No phase of development MAY begin until the prior phase has been reviewed and explicitly
approved by the Product Owner running the application on localhost.

- On phase completion: (1) the application MUST be fully running on localhost with Docker
  Compose, (2) a phase summary MUST be presented listing working endpoints and behaviours,
  (3) explicit "approved" or "proceed" confirmation MUST be received before any next-phase
  work starts.
- Partial implementations MUST NOT be presented as phase-complete.
- AI agent implementations MUST halt and present for review at every phase boundary.

**Rationale**: Prevents over-building in wrong directions. Discovered mid-build that a
full stack change (Fastify → Java 21 Spring Boot) was needed — early gates catch this
cheaply. Phase gates are the primary quality checkpoint for the Product Owner.

### IV. Security & Auth Discipline

JWT-based authentication with httpOnly cookies is the ONLY accepted authentication pattern.
All tenant-scoped operations MUST enforce tenant context via `TenantFilter`.

- Access tokens: 8-hour lifetime, signed with JJWT 0.12.6. Refresh tokens: 30-day
  opaque tokens stored server-side, delivered via httpOnly cookie only.
- JWT deny-list MUST be maintained in Redis 7 to support immediate revocation on logout.
- OWASP Top 10 compliance is mandatory for all endpoints.
- SQL queries through `TenantJdbcTemplate` MUST use parameterised statements — no string
  concatenation in query construction.
- Secrets MUST NOT be committed to source control; use environment variables or a secret
  manager.

**Rationale**: CRM data is sensitive commercial information. Auth weaknesses in a
multi-tenant system affect all tenants simultaneously.

### V. Simplicity & Integration-Ready

Architecture MUST favour integration over invention. When a well-supported library or
standard exists, it MUST be used rather than a custom implementation.

- Third-party CRM integrations (Zoho, Salesforce, Excel, PowerApps) MUST use adapter
  patterns with clean, testable boundaries. No integration logic may bleed into core
  domain services.
- YAGNI applies strictly: no feature is built speculatively. Complexity MUST be justified
  with a written rationale before introduction.
- New abstractions require at least three concrete use cases before extraction.
- The technology stack (Java 21 / Spring Boot 3.4.1 / Next.js 15 / PostgreSQL 16) MUST
  NOT change without a formal architecture decision recorded in the specs directory.

**Rationale**: Premature abstraction and speculative features are the primary sources of
codebase debt in CRM products. Integration-readiness from day one prevents expensive
rewrites when connecting to Salesforce or Zoho later.

### VI. Observability by Default

Every operation touching tenant data MUST produce a structured log entry containing at
minimum: `tenantId`, `userId`, `operation`, `durationMs`, and outcome (`SUCCESS`/`ERROR`).

- API response time budget: p95 ≤ 200 ms for standard CRUD; queries returning > 1000
  rows MUST use pagination.
- Errors surfaced to the client MUST be sanitised — stack traces and internal identifiers
  MUST NOT appear in API error responses.
- Virtual threads (`spring.threads.virtual.enabled: true`) MUST be the default execution
  model; blocking calls on carrier threads are a code-review failure.

**Rationale**: Multi-tenant systems have complex failure modes. Without tenant-scoped
structured logs, debugging production incidents is operationally impossible.

## Technology Constraints

The following technology choices are locked for this phase and MUST NOT be replaced
without a documented architecture decision and Product Owner approval.

| Layer       | Technology                          | Version      |
|-------------|-------------------------------------|--------------|
| Backend     | Java + Spring Boot + Gradle         | 21 / 3.4.1 / 8.11.1 |
| Frontend    | Next.js App Router + React + shadcn/ui | 15 / 19 / latest |
| State (FE)  | TanStack Query + Zustand            | latest       |
| Database    | PostgreSQL (schema-per-tenant)      | 16           |
| Cache       | Redis (Lettuce driver)              | 7            |
| Monorepo    | Turborepo                           | latest       |
| Local Dev   | Docker Compose (Postgres, Redis, Typesense, MinIO) | — |
| Auth        | JJWT                                | 0.12.6       |

Integration adapter targets (Phase 3+): Zoho CRM, Salesforce, Microsoft PowerApps, Excel.

## Development Workflow

- **Branch strategy**: Feature branches named `###-feature-name` off `main`; no direct
  commits to `main`.
- **Spec-first**: Every non-trivial feature MUST have a spec (`/speckit-specify`) and plan
  (`/speckit-plan`) before implementation begins.
- **Phase gates**: Strictly enforced per Principle III. No exceptions.
- **PR requirements**: PRs MUST reference the relevant spec, include a Constitution Check
  confirmation, and pass contract tests in CI.
- **Commit discipline**: Commits are atomic and describe *why*, not what. Format:
  `type(scope): description` (e.g., `feat(contacts): add pipeline stage transition`).
- **No silent migrations**: Any database schema change MUST include a reversible migration
  script reviewed by the Product Owner before merge.

## Governance

This constitution supersedes all other practices, conventions, and preferences in the
OpsNext project. Conflicting guidance in README files or tooling defaults defers to
this document.

**Amendment procedure**:
1. Author proposes change in a spec or PR description, citing the principle affected.
2. Product Owner reviews the rationale and approves or rejects.
3. On approval: update this file, increment the version, update `LAST_AMENDED_DATE`,
   and record the change in the Sync Impact Report comment at the top of this file.
4. All open specs and plans referencing the amended principle MUST be reviewed for
   alignment before the next phase begins.

**Versioning policy** (SemVer):
- MAJOR: Principle removals or redefinitions that invalidate existing implementations.
- MINOR: New principles, sections, or materially expanded guidance.
- PATCH: Clarifications, wording fixes, non-semantic refinements.

**Compliance review**: Each phase-gate review MUST include a verbal confirmation that the
implementation complies with all six core principles. Non-compliance blocks phase approval.

**Version**: 1.0.0 | **Ratified**: 2026-06-15 | **Last Amended**: 2026-06-15
