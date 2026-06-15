# OpsNext CRM — Deployment Guide

**Document Version:** 1.0  
**Date:** 2026-06-11

---

## Local Development Setup

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Java JDK | 21 LTS | `winget install Microsoft.OpenJDK.21` (Windows) or `brew install openjdk@21` (Mac) |
| Node.js | 22 LTS | https://nodejs.org |
| pnpm | 9+ | `npm install -g pnpm` |
| Docker Desktop | Latest | https://www.docker.com/products/docker-desktop |

### Step 1 — Start Infrastructure Services

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

Services started:

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL 16 | 5432 | Primary database |
| Redis 7 | 6379 | Cache, queues, sessions |
| Typesense 26 | 8108 | Full-text search |
| MinIO | 9000 / 9001 | S3-compatible file storage (console: 9001) |

Verify all healthy:
```bash
docker compose -f infra/docker/docker-compose.yml ps
```

### Step 2 — Environment Variables

**Backend:**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env — minimum required for local:
# DATABASE_URL, REDIS_URL, JWT_SECRET, COOKIE_SECRET
```

**Frontend:**
```bash
cp frontend/.env.example frontend/.env.local
```

### Step 3 — Install Node.js Dependencies

```bash
# From monorepo root
pnpm install
```

### Step 4 — Database Migrations

```bash
cd packages/db
pnpm prisma migrate dev --name init
pnpm prisma db seed
```

### Step 5 — Start the API

```bash
cd backend

# Mac/Linux:
./gradlew bootRun --args="--spring.profiles.active=dev"

# Windows:
gradlew.bat bootRun --args="--spring.profiles.active=dev"
```

API available at: **http://localhost:3001**  
Swagger UI: **http://localhost:3001/swagger-ui.html**

### Step 6 — Start the Frontend

```bash
cd frontend
pnpm dev
```

Frontend available at: **http://localhost:3000**

### Default Local Credentials

| Service | Credentials |
|---------|------------|
| PostgreSQL | user: `opsnext` / pass: `opsnext_dev_password` / db: `opsnext_platform` |
| Redis | pass: `opsnext_redis_password` |
| Typesense | API key: `opsnext_typesense_key` |
| MinIO Console | user: `opsnext_minio` / pass: `opsnext_minio_password` |

---

## All Commands Reference

### Monorepo Root

```bash
pnpm install            # Install all Node.js dependencies
pnpm build              # Build all packages and apps
pnpm lint               # Lint all workspaces
pnpm typecheck          # TypeScript check all workspaces
```

### Backend (`backend/`)

```bash
./gradlew bootRun --args="--spring.profiles.active=dev"   # Dev server
./gradlew test                                              # Run all tests
./gradlew bootJar                                           # Build fat JAR
./gradlew compileJava                                       # Compile only
./gradlew checkstyleMain                                    # Lint
```

### Frontend (`frontend/`)

```bash
pnpm dev            # Dev server (Turbopack)
pnpm build          # Production build
pnpm start          # Start production build
pnpm typecheck      # tsc --noEmit
pnpm lint           # ESLint
```

### Database (`packages/db/`)

```bash
pnpm prisma migrate dev --name <migration-name>   # Create + apply migration
pnpm prisma migrate deploy                         # Apply migrations (CI/CD)
pnpm prisma migrate status                         # Check migration status
pnpm prisma studio                                 # Open GUI browser
pnpm prisma generate                               # Regenerate Prisma client
pnpm prisma db seed                                # Seed development data
pnpm prisma db push                                # Push schema without migration (prototype only)
```

### Docker

```bash
docker compose -f infra/docker/docker-compose.yml up -d        # Start all services
docker compose -f infra/docker/docker-compose.yml down         # Stop all services
docker compose -f infra/docker/docker-compose.yml down -v      # Stop + delete data volumes
docker compose -f infra/docker/docker-compose.yml logs -f      # Tail all service logs
docker compose -f infra/docker/docker-compose.yml ps           # Service status
```

---

## CI/CD Pipeline

### GitHub Actions Workflows

| Workflow | Trigger | Steps |
|----------|---------|-------|
| `pr-checks.yml` | PR open/sync | lint → typecheck → unit tests → build |
| `merge.yml` | Push to `main` | Full integration tests → Docker build → push to ECR → deploy staging |
| `release.yml` | Manual (version input) | Tag → staging smoke test → manual gate → canary → production |

### ArgoCD (GitOps)

- Staging: automatic sync on ECR image push
- Production: manual sync with approval gate in ArgoCD UI

---

## Staging Environment

| Component | Config |
|-----------|--------|
| Cluster | AWS EKS |
| Database | RDS PostgreSQL 16 (Multi-AZ disabled for staging) |
| Cache | ElastiCache Redis 7 |
| Search | Typesense EC2 instance |
| Storage | S3 (`opsnext-*-staging` buckets) |
| CDN/WAF | Cloudflare Pro |
| Secrets | AWS Secrets Manager (`opsnext/staging/*`) |
| Observability | Grafana Cloud (Loki + Tempo + Prometheus) |

---

## Production Environment

| Component | Config |
|-----------|--------|
| Cluster | AWS EKS (multi-AZ, m5.xlarge nodes) |
| Database | RDS PostgreSQL 16 Multi-AZ, 7-day automated backups |
| Cache | ElastiCache Redis 7 cluster mode disabled → cluster mode enabled at 5K tenants |
| Search | Typesense single node → cluster at Phase 3 |
| Storage | S3 (`opsnext-*-prod`) + Cloudflare R2 (exports/attachments) |
| CDN/WAF | Cloudflare Pro (OWASP WAF + DDoS) |
| Secrets | AWS Secrets Manager (`opsnext/prod/*`) |
| Observability | Self-hosted Grafana Stack on EKS |
| Error tracking | Sentry (per-service DSNs) |

---

## Runbooks

### Apply Migrations to All Tenant Schemas

```bash
# Run from packages/db/ with DATABASE_URL pointing to production cluster
pnpm prisma migrate deploy --schema ./prisma/schema.prisma

# Apply migrations to each tenant schema (custom script)
node scripts/migrate-all-tenants.js --env production
```

### Scale API Pods

```bash
kubectl scale deployment opsnext-api --replicas=10 -n opsnext-prod
```

### Emergency Rollback

```bash
# Rollback to previous ArgoCD sync
argocd app rollback opsnext-prod

# Or via kubectl (revert deployment image)
kubectl set image deployment/opsnext-api api=<previous-ecr-image> -n opsnext-prod
```

### Suspend a Tenant

```bash
# Via Platform Admin API
curl -X PATCH https://api.opsnext.io/api/v1/platform/tenants/{tenantId}/status \
  -H "Authorization: Bearer <platform-admin-token>" \
  -d '{"status": "SUSPENDED"}'
```
