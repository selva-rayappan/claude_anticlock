# OpsNext CRM

Cloud-native, multi-tenant CRM SaaS platform built for SMB and mid-market sales teams.

---

## Repository Structure

```
OpsNext/
├── .claude/                    ← Claude Code instructions and prompts
│   ├── CLAUDE.md               ← Start here (master Claude instructions)
│   ├── project-context.md
│   ├── coding-standards.md
│   ├── architecture-principles.md
│   ├── workflow-rules.md
│   ├── task-backlog.md
│   ├── decisions.md
│   ├── prompts/                ← Reusable Claude prompts
│   └── templates/              ← Code templates
│
├── docs/                       ← All project documentation
│   ├── BRD.md                  ← Business Requirements Document
│   ├── FRD.md                  ← Functional Requirements Document
│   ├── ARCHITECTURE.md         ← Architecture decisions & tech rationale
│   ├── DATABASE.md             ← Database design & schema guide
│   ├── API_SPEC.md             ← REST API specification
│   ├── EXECUTION_PLAN.md       ← Phased task plan (18 phases)
│   ├── RELEASE_PLAN.md         ← Release milestones & versioning
│   └── DEPLOYMENT.md           ← Local dev & production deployment
│
├── frontend/                   ← Next.js 15 + React 19 web app
├── backend/                    ← Java 21 + Spring Boot 3 API server
├── packages/
│   ├── db/                     ← Prisma schema + migrations
│   ├── shared/                 ← Zod schemas, TypeScript types
│   └── config/                 ← Shared ESLint / TS / Tailwind config
├── infrastructure/             ← Docker Compose, K8s manifests, Terraform
│
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, shadcn/ui, Tailwind CSS, TanStack Query, Zustand |
| Backend | Java 21, Spring Boot 3, Spring Security 6, JPA/Hibernate |
| Database | PostgreSQL 16 (schema-per-tenant), Prisma (migrations) |
| Cache | Redis 7 (sessions, queues, pub/sub, rate limiting) |
| Search | Typesense 26 (full-text, typo-tolerant) |
| File Storage | MinIO / AWS S3 / Cloudflare R2 |
| Monorepo | Turborepo + pnpm workspaces |
| Infrastructure | Docker, Kubernetes (EKS), Terraform, Cloudflare |
| Observability | OpenTelemetry → Grafana Stack (Loki + Tempo + Prometheus) |

---

## Quick Start

**Prerequisites:** Java 21, Node.js 22, pnpm 9+, Docker Desktop

```bash
# 1. Start local infrastructure
docker compose -f infra/docker/docker-compose.yml up -d

# 2. Install dependencies
pnpm install

# 3. Run database migrations
cd packages/db && pnpm prisma migrate dev && cd ../..

# 4. Start the API (Java — new terminal)
cd backend && ./gradlew bootRun --args="--spring.profiles.active=dev"

# 5. Start the frontend (new terminal)
cd frontend && pnpm dev
```

- **Frontend:** http://localhost:3000
- **API:** http://localhost:3001
- **Swagger UI:** http://localhost:3001/swagger-ui.html

Full setup guide: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

---

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/BRD.md](docs/BRD.md) | Business requirements, goals, market context |
| [docs/FRD.md](docs/FRD.md) | All functional requirements with IDs |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Technology decisions and rationale |
| [docs/DATABASE.md](docs/DATABASE.md) | Database design, schema, index strategy |
| [docs/API_SPEC.md](docs/API_SPEC.md) | REST API endpoints, auth, pagination |
| [docs/EXECUTION_PLAN.md](docs/EXECUTION_PLAN.md) | 18-phase implementation task plan |
| [docs/RELEASE_PLAN.md](docs/RELEASE_PLAN.md) | Release milestones and versioning |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Local dev and production deployment |

---

## Current Status

**Phases 0–1:** ✅ Complete &nbsp;|&nbsp; **Phases 2–4:** ⚠️ Partial &nbsp;|&nbsp; **Phases 5–18:** ❌ Not started  
**Overall:** ~35% of started phases (0–4). Priority next: RBAC enforcement, Typesense integration, auth tests.

See [`docs/EXECUTION_PLAN.md`](docs/EXECUTION_PLAN.md) for the full 18-phase roadmap.  
See [`.claude/task-backlog.md`](.claude/task-backlog.md) for current task status and next priorities.

---

## Contributing

Working with Claude Code? Read [`.claude/CLAUDE.md`](.claude/CLAUDE.md) first.

Branch naming: `phase-{N}/{task-id}-{short-description}`  
Commit convention: [Conventional Commits](https://www.conventionalcommits.org/)  
All PRs require one reviewer and passing CI before merge.
