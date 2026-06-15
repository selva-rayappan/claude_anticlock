# OpsNext CRM — AI Agent Instructions

> This file is the single entry point for all AI coding agents (Claude, Copilot, Gemini, Cursor, etc.).
> Agent-specific configuration lives in `.claude/CLAUDE.md`, `.github/copilot-instructions.md`, etc.

---

## What is OpsNext?

**OpsNext** is a cloud-native, multi-tenant CRM SaaS platform targeting SMB-to-mid-market organisations. It manages contacts, accounts, leads, opportunities, pipelines, and workflows across fully isolated customer tenants on shared infrastructure.

| Dimension | Value |
|---|---|
| Backend | Java 21 + Spring Boot 3 (`backend/`) |
| Frontend | Next.js 15 + React 19 (`frontend/`) |
| Database | PostgreSQL — schema-per-tenant isolation |
| Shared packages | `packages/shared` (Zod + types), `packages/config`, `packages/db` |
| Infrastructure | Docker Compose (local) · Kubernetes EKS (prod) |
| Current phase | Phase 3 (IAM) + Phase 5 (Contact & Account) in progress |

---

## Read Before Touching Any Code

In order:

1. **[`specs/constitution.md`](specs/constitution.md)** — non-negotiable architecture principles + coding standards
2. **[`specs/tasks.md`](specs/tasks.md)** — active task backlog (what to work on now)
3. **[`specs/product-spec.md`](specs/product-spec.md)** — functional requirements summary
4. **[`specs/technical-plan.md`](specs/technical-plan.md)** — tech stack and architectural decisions

For full detail:
- Full functional requirements: [`docs/FRD.md`](docs/FRD.md)
- Full execution plan: [`docs/EXECUTION_PLAN.md`](docs/EXECUTION_PLAN.md)
- Full architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- API contract: [`specs/api/openapi.yaml`](specs/api/openapi.yaml)
- Architecture decisions: [`specs/adr/`](specs/adr/)

---

## Absolute Rules (Never Violate)

1. **Never cross tenant schemas.** Every DB query must execute within the current tenant's schema via `TenantContext`/`TenantJdbcTemplate`.
2. **Audit every mutation.** CREATE / UPDATE / DELETE on core entities writes to `audit_logs` in the same transaction.
3. **Soft-delete only.** Set `deletedAt`; never issue a physical `DELETE` on mutable entities.
4. **Phase gate.** Do not start Phase N+1 until Phase N is reviewed running on localhost.
5. **No comments unless the WHY is non-obvious.** Never comment what the code does.
6. **No feature flags, backwards-compatibility shims, or speculative abstractions.**
7. **Validate only at system boundaries** — HTTP request, import file, external API. Trust internal code.
8. **Update `specs/api/openapi.yaml` before implementing any API change.** Spec first.

---

## Dev Quick-Start

```bash
# 1 — Start local infrastructure
docker compose -f infra/docker/docker-compose.yml up -d

# 2 — Install Node.js deps
pnpm install

# 3 — Start API (Java)
cd backend && ./gradlew bootRun --args="--spring.profiles.active=dev"

# 4 — Start frontend (Next.js)
cd frontend && pnpm dev
```

Full setup: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

---

## Spec-Driven Workflow

This project follows **Spec-Driven Development** (Spec Kit). Before implementing any feature:

1. Create `specs/features/{feature-name}/spec.md` — what & why (product)
2. Create `specs/features/{feature-name}/plan.md` — how (technical)
3. Create `specs/features/{feature-name}/tasks.md` — step-by-step tasks
4. Update `specs/api/openapi.yaml` if the feature touches the API
5. Implement according to the tasks list
6. Archive the feature spec to `specs/features/archive/{feature-name}/` on completion

### Slash Commands (Claude)

| Command file | Purpose |
|---|---|
| `.claude/commands/speckit.specify.md` | Write a feature spec (what & why) |
| `.claude/commands/speckit.plan.md` | Write a technical plan (how) |
| `.claude/commands/speckit.tasks.md` | Break a plan into actionable tasks |
| `.claude/commands/speckit.implement.md` | Execute implementation from tasks |
| `.claude/commands/speckit.fix.md` | Investigate and fix a bug |
| `.claude/commands/speckit.refactor.md` | Structured refactoring |
| `.claude/commands/speckit.constitution.md` | Review/update project constitution |
