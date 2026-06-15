# OpsNext CRM — Claude Instructions

## Read First

You are working on **OpsNext**, a cloud-native multi-tenant CRM SaaS platform. Before touching any code, read these files in order:

1. [`.claude/project-context.md`](project-context.md) — what the product is and where it stands
2. [`.claude/architecture-principles.md`](architecture-principles.md) — non-negotiable architectural rules
3. [`.claude/coding-standards.md`](coding-standards.md) — language-specific conventions
4. [`.claude/workflow-rules.md`](workflow-rules.md) — how to implement features and submit work
5. [`docs/FRD.md`](../docs/FRD.md) — full functional requirements (IDs: `IAM-F-01`, `CON-F-01`, etc.)
6. [`docs/EXECUTION_PLAN.md`](../docs/EXECUTION_PLAN.md) — phased task breakdown with subtasks

For architecture decisions and technology rationale: [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)  
For database schema design: [`docs/DATABASE.md`](../docs/DATABASE.md)  
For API design: [`docs/API_SPEC.md`](../docs/API_SPEC.md)

---

## Project at a Glance

| Dimension | Value |
|-----------|-------|
| Product | Multi-tenant CRM SaaS |
| Tenancy model | Schema-per-tenant (PostgreSQL) |
| Backend | Java 21 + Spring Boot 3 (`backend/`) |
| Frontend | Next.js 15 + React 19 (`frontend/`) |
| Shared packages | `packages/db`, `packages/shared`, `packages/config` |
| Infrastructure | Docker Compose (local), Kubernetes EKS (prod) |
| Current phase | Phase 3 completion + Phase 5 start (RBAC, Typesense, Contact API) |

---

## Absolute Rules

1. **Never cross tenant schemas.** Every query must execute within the current tenant's schema via `TenantContext`.
2. **Audit every mutation.** CREATE / UPDATE / DELETE on core entities writes to `audit_logs`.
3. **Soft-delete only.** Set `deletedAt`; never run `DELETE` on mutable entities.
4. **Phase gate.** Do not start a new phase until the current phase is reviewed running on localhost.
5. **No comments unless the WHY is non-obvious.** Never write what the code does — only why.
6. **No feature flags, backwards-compatibility shims, or speculative abstractions.**
7. **Validate only at system boundaries** (HTTP request, import file, external API). Trust internal code.

---

## Repository Layout

```
OpsNext/
├── .claude/            ← Claude instructions (you are here)
├── docs/               ← All project documentation
├── frontend/           ← Next.js 15 web app
├── backend/            ← Java 21 + Spring Boot 3 API
├── packages/
│   ├── db/             ← Prisma schema + migrations
│   ├── shared/         ← Zod schemas, TS types (used by frontend)
│   └── config/         ← Shared ESLint / TS / Tailwind config
├── infra/              ← Docker Compose (docker/), K8s manifests (k8s/), Terraform (terraform/)
├── README.md
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Dev Commands (Quick Reference)

```bash
# Start local infrastructure (run first)
docker compose -f infra/docker/docker-compose.yml up -d

# Install Node.js deps (monorepo root)
pnpm install

# Run DB migrations
cd packages/db && pnpm prisma migrate dev

# Start API (Java)
cd backend && ./gradlew bootRun --args="--spring.profiles.active=dev"

# Start web (Next.js)
cd frontend && pnpm dev
```

Full setup: [`docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md)

---

## Reusable Prompts

When working on a specific task type, start with the matching prompt file:

- **New feature:** [`.claude/prompts/implement-feature.md`](prompts/implement-feature.md)
- **New API endpoint:** [`.claude/prompts/create-api.md`](prompts/create-api.md)
- **New UI component/page:** [`.claude/prompts/create-ui.md`](prompts/create-ui.md)
- **Bug fix:** [`.claude/prompts/fix-bug.md`](prompts/fix-bug.md)
- **Refactor:** [`.claude/prompts/refactor.md`](prompts/refactor.md)
