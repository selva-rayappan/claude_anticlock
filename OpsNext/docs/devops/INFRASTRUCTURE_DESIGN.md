# OpsNext CRM — DevOps & Infrastructure Design Document

**Document Version:** 1.0  
**Status:** APPROVED  
**Prepared By:** DevOps Lead  
**Date:** 2026-06-14  
**Classification:** Internal — Confidential  
**Reference Documents:** TAD.md, ADR-001-backend-runtime.md  
**Traceability:** TASK-005

---

## Table of Contents

1. [Monorepo Structure](#1-monorepo-structure)
2. [Local Development Environment](#2-local-development-environment)
3. [CI/CD Pipeline Design](#3-cicd-pipeline-design)
4. [Container Build Strategy](#4-container-build-strategy)
5. [Kubernetes Resource Design](#5-kubernetes-resource-design)
6. [Terraform Module Structure](#6-terraform-module-structure)
7. [Environment Parity Checklist](#7-environment-parity-checklist)
8. [Observability Stack Design](#8-observability-stack-design)
9. [Security Controls (Infrastructure Level)](#9-security-controls-infrastructure-level)

---

## 1. Monorepo Structure

OpsNext uses **Turborepo** for monorepo task orchestration with pnpm workspaces.

```
OpsNext/
├── apps/
│   ├── api/                          ← Java 21 + Spring Boot 3.4.1 (Gradle)
│   │   ├── src/main/java/com/opsnext/
│   │   │   ├── OpsNextApplication.java
│   │   │   ├── auth/
│   │   │   ├── config/
│   │   │   ├── common/
│   │   │   ├── health/
│   │   │   ├── platform/
│   │   │   ├── security/
│   │   │   └── tenant/
│   │   ├── src/main/resources/
│   │   │   ├── application.yml
│   │   │   ├── application-dev.yml
│   │   │   └── db/
│   │   │       ├── migration/V1__platform_schema.sql
│   │   │       └── tenant-schema-template.sql
│   │   ├── build.gradle.kts
│   │   ├── settings.gradle.kts
│   │   ├── gradlew / gradlew.bat
│   │   └── Dockerfile
│   │
│   ├── web/                          ← Next.js 15 + React 19 (pnpm)
│   │   ├── src/
│   │   │   ├── app/                  ← App Router pages
│   │   │   ├── components/
│   │   │   └── lib/
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   └── worker/                       ← Java Spring Batch + @Scheduled (Phase 9)
│       └── (planned)
│
├── packages/                         ← Shared pnpm packages
│   ├── shared/                       ← Shared TypeScript types & utilities
│   └── config/                       ← Shared ESLint, TypeScript, Tailwind configs
│
├── infra/
│   ├── terraform/                    ← IaC (AWS)
│   │   ├── modules/
│   │   │   ├── vpc/
│   │   │   ├── eks/
│   │   │   ├── rds/
│   │   │   ├── elasticache/
│   │   │   ├── s3/
│   │   │   └── secrets/
│   │   ├── envs/
│   │   │   ├── staging/
│   │   │   └── prod/
│   │   └── main.tf
│   │
│   └── k8s/
│       ├── base/                     ← Kustomize base manifests
│       └── overlays/
│           ├── staging/
│           └── prod/
│
├── docs/
│   ├── architecture/                 ← TAD, ADRs
│   ├── api/                          ← API design, OpenAPI spec
│   ├── database/                     ← DB design, ERD
│   ├── security/                     ← Security architecture, threat model
│   └── devops/                       ← This document, DR runbook
│
├── docker-compose.yml                ← Local dev infrastructure
├── turbo.json                        ← Turborepo task pipeline
├── pnpm-workspace.yaml
├── .env.example
└── CLAUDE.md
```

### Turborepo Pipeline (turbo.json)

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", "build/libs/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["build/reports/**", "coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

---

## 2. Local Development Environment

### Docker Compose Services

```yaml
# docker-compose.yml (summary)
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: opsnext
      POSTGRES_USER: opsnext
      POSTGRES_PASSWORD: opsnext_dev
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U opsnext"]
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]

  typesense:
    image: typesense/typesense:26.0
    ports: ["8108:8108"]
    environment:
      TYPESENSE_API_KEY: opsnext_typesense_key
      TYPESENSE_DATA_DIR: /data
    volumes: ["typesense_data:/data"]

  minio:
    image: minio/minio:latest
    ports: ["9000:9000", "9001:9001"]
    environment:
      MINIO_ROOT_USER: opsnext
      MINIO_ROOT_PASSWORD: opsnext_dev
    command: server /data --console-address :9001
```

### Startup Sequence

```powershell
# Step 1: Start infrastructure
docker compose up -d

# Step 2: Start Java API (port 3001)
cd apps/api
.\gradlew.bat bootRun --args="--spring.profiles.active=dev"

# Step 3: Start Web frontend (port 3000, new terminal)
pnpm install
pnpm dev
```

### Environment Variables (.env.example)

```bash
# Database
DATABASE_URL=jdbc:postgresql://localhost:5432/opsnext
DATABASE_USERNAME=opsnext
DATABASE_PASSWORD=opsnext_dev

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT (RS256 key pair — generate with: openssl genrsa -out private.pem 2048)
JWT_PRIVATE_KEY=<base64-encoded PEM>
JWT_PUBLIC_KEY=<base64-encoded PEM>

# App
APP_BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:3001
APP_ENV=development

# Typesense
TYPESENSE_HOST=localhost
TYPESENSE_PORT=8108
TYPESENSE_API_KEY=opsnext_typesense_key

# MinIO / S3
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=opsnext
S3_SECRET_KEY=opsnext_dev
S3_BUCKET_IMPORTS=opsnext-imports
S3_BUCKET_ATTACHMENTS=opsnext-attachments

# Email (use a dev SMTP service like Mailtrap)
RESEND_API_KEY=re_dev_key_here
EMAIL_FROM=noreply@opsnext.local
```

---

## 3. CI/CD Pipeline Design

### GitHub Actions Workflows

#### 3.1 PR Checks Workflow (.github/workflows/pr-checks.yml)

Triggers on: `pull_request` (opened, synchronize, reopened)

```yaml
jobs:
  api-checks:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup Java 21 (Temurin) + Gradle cache
      - ./gradlew compileJava compileTestJava
      - ./gradlew test (unit only, no Docker)
      - ./gradlew spotbugsMain (static analysis)
      - ./gradlew dependencyCheckAnalyze (OWASP CVE scan)

  web-checks:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup pnpm + Node 20 + cache
      - pnpm install --frozen-lockfile
      - pnpm lint
      - pnpm typecheck
      - pnpm test (Vitest unit tests)
      - pnpm build (Next.js build validation)

  post-summary:
    needs: [api-checks, web-checks]
    steps:
      - Post check summary as PR comment
```

**Required to merge:** Both jobs green. PR cannot be merged without.

#### 3.2 Merge Workflow (.github/workflows/merge-to-main.yml)

Triggers on: `push` to `main`

```yaml
jobs:
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres: { image: postgres:16-alpine, options: --health-cmd pg_isready }
      redis: { image: redis:7-alpine }
    steps:
      - Start Java API with spring.profiles.active=test
      - Run integration test suite (RestAssured)
      - Run Playwright smoke tests (register tenant, login, dashboard)
      - If all pass → continue

  build-and-push:
    needs: integration-tests
    steps:
      - Docker buildx setup
      - Login to ECR (via OIDC — no long-lived AWS keys in GitHub)
      - Build multi-platform (linux/amd64, linux/arm64) images
      - Tag: sha-${GITHUB_SHA:0:8}, latest
      - Push to ECR: opsnext/api, opsnext/web

  deploy-staging:
    needs: build-and-push
    steps:
      - Update Kustomize image tag in k8s/overlays/staging/
      - kubectl apply -k k8s/overlays/staging/
      - kubectl rollout status deployment/api --timeout=300s
      - Run smoke tests against staging API
```

#### 3.3 Release Workflow (.github/workflows/release.yml)

Triggers on: manual dispatch with `version` input (e.g. `1.2.0`)

```yaml
jobs:
  release:
    steps:
      - Create git tag v{version}
      - Build and push Docker images tagged v{version}
      - Deploy to staging with v{version} images
      - Run full regression suite on staging
      - Post deployment summary (requires manual approval in GitHub UI)

  deploy-prod:
    needs: release
    environment: production  ← GitHub Environment with required reviewers
    steps:
      - Update Kustomize image tag in k8s/overlays/prod/
      - kubectl apply -k k8s/overlays/prod/
      - kubectl rollout status deployment/api --timeout=600s
      - Run smoke tests against prod
      - Notify Slack #deployments channel
```

---

## 4. Container Build Strategy

### API Dockerfile (apps/api/Dockerfile)

```dockerfile
# Stage 1: Build
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace
COPY gradle/ gradle/
COPY gradlew build.gradle.kts settings.gradle.kts ./
RUN ./gradlew dependencies --no-daemon  # Cache dependency layer
COPY src/ src/
RUN ./gradlew bootJar --no-daemon -x test

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S opsnext && adduser -S opsnext -G opsnext
WORKDIR /app
COPY --from=builder /workspace/build/libs/opsnext-api.jar app.jar
USER opsnext
EXPOSE 3001
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
```

**Target image size:** < 200 MB (JRE-only base).

### Web Dockerfile (apps/web/Dockerfile)

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod=false

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# Stage 3: Runtime
FROM node:20-alpine
RUN addgroup -g 1001 nodejs && adduser -S nextjs -u 1001 -G nodejs
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

**Target image size:** < 150 MB.

---

## 5. Kubernetes Resource Design

### Namespace Layout

```
opsnext-staging         ← all staging workloads
opsnext-prod            ← all prod workloads
opsnext-monitoring      ← Prometheus, Grafana, Loki, Tempo
opsnext-ingress         ← NGINX Ingress Controller
opsnext-secrets         ← External Secrets Operator
```

### API Deployment (base)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: opsnext-{env}
spec:
  replicas: 2                          # staging; 4 in prod overlay
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0                # Zero-downtime
      maxSurge: 1
  selector:
    matchLabels: { app: api }
  template:
    spec:
      containers:
      - name: api
        image: opsnext/api:sha-xxxxxxx  # Updated by CI
        ports: [{ containerPort: 3001 }]
        resources:
          requests: { cpu: "500m", memory: "512Mi" }
          limits:   { cpu: "2000m", memory: "1Gi" }
        readinessProbe:
          httpGet: { path: /health, port: 3001 }
          initialDelaySeconds: 20
          periodSeconds: 10
          failureThreshold: 3
        livenessProbe:
          httpGet: { path: /health, port: 3001 }
          initialDelaySeconds: 30
          periodSeconds: 30
          failureThreshold: 5
        envFrom:
        - secretRef: { name: opsnext-secrets }  # From External Secrets
      terminationGracePeriodSeconds: 60
```

### HorizontalPodAutoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef: { kind: Deployment, name: api }
  minReplicas: 2   # staging: 1
  maxReplicas: 10  # staging: 3
  metrics:
  - type: Resource
    resource:
      name: cpu
      target: { type: Utilization, averageUtilization: 70 }
  - type: Resource
    resource:
      name: memory
      target: { type: Utilization, averageUtilization: 80 }
```

### PodDisruptionBudget

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
spec:
  minAvailable: 1     # Always keep at least 1 API pod during node drain
  selector:
    matchLabels: { app: api }
```

### Kustomize Overlays

| Setting | Base | Staging | Production |
|---------|------|---------|------------|
| Replicas | 2 | 1 | 4 |
| CPU request | 500m | 250m | 1000m |
| Memory limit | 1Gi | 512Mi | 2Gi |
| Image tag | placeholder | sha-{CI} | v{version} |
| Config | base | staging values | prod values |

---

## 6. Terraform Module Structure

```
infra/terraform/
├── modules/
│   ├── vpc/
│   │   ├── main.tf          ← 3-AZ VPC, public/private/isolated subnets
│   │   ├── variables.tf
│   │   └── outputs.tf       ← subnet IDs, VPC ID, NAT GW IPs
│   │
│   ├── eks/
│   │   ├── main.tf          ← EKS cluster, managed node groups, IRSA
│   │   └── ...              ← cluster autoscaler, AWS CNI, CoreDNS
│   │
│   ├── rds/
│   │   ├── main.tf          ← PostgreSQL 16 Multi-AZ (prod) / Single-AZ (staging)
│   │   └── ...              ← parameter group, subnet group, security group
│   │
│   ├── elasticache/
│   │   ├── main.tf          ← Redis 7, cluster mode disabled (staging)
│   │   └── ...              ← auth token, TLS enabled
│   │
│   ├── s3/
│   │   ├── main.tf          ← imports, exports, attachments buckets
│   │   └── ...              ← versioning, lifecycle rules, no public access
│   │
│   └── secrets/
│       ├── main.tf          ← Secrets Manager skeleton secrets
│       └── ...              ← IAM policies for IRSA
│
└── envs/
    ├── staging/
    │   ├── main.tf          ← Module instantiation (smaller sizes)
    │   ├── backend.tf       ← S3 state: opsnext-terraform-state/staging.tfstate
    │   └── terraform.tfvars
    │
    └── prod/
        ├── main.tf          ← Module instantiation (production sizes)
        ├── backend.tf       ← S3 state: opsnext-terraform-state/prod.tfstate
        └── terraform.tfvars
```

### Key Resource Sizing

| Resource | Staging | Production |
|----------|---------|------------|
| EKS nodes | 2× t3.medium | 3× m5.xlarge (min) |
| RDS instance | db.t3.medium, single-AZ | db.r6g.xlarge, Multi-AZ |
| RDS storage | 100 GB gp3 | 500 GB gp3, autoscale to 2TB |
| Redis | cache.t3.micro, 1 node | cache.r6g.large, 2 nodes |
| S3 import bucket | versioning off | versioning on |

### State Backend

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "opsnext-terraform-state"
    key            = "staging/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "opsnext-terraform-locks"
    encrypt        = true
  }
}
```

---

## 7. Environment Parity Checklist

| Setting | Dev (local) | Staging | Production |
|---------|-------------|---------|------------|
| PostgreSQL | Docker Compose (local) | RDS t3.medium | RDS r6g.xlarge Multi-AZ |
| Redis | Docker Compose (local) | ElastiCache t3.micro | ElastiCache r6g.large |
| Typesense | Docker Compose (local) | Dedicated node | Dedicated cluster |
| S3 | MinIO (local) | AWS S3 (staging bucket) | AWS S3 (prod bucket) |
| Email | Mailtrap / console log | Resend (test domain) | Resend (opsnext.io) |
| Feature flags | All enabled via .env | Controlled per TenantConfig | Same as staging |
| Log level | DEBUG | INFO | WARN |
| SQL logging | Enabled (Hibernate) | Disabled | Disabled |
| API rate limits | Disabled | Enabled (relaxed) | Enabled (strict) |
| Replicas | 1 (local) | 1 | 4 (min) |
| TLS | Self-signed / none | Let's Encrypt / ACM | ACM |
| Observability | Console only | Full OTEL stack | Full OTEL stack |

---

## 8. Observability Stack Design

### Architecture

```
App Pods → OTEL Java Agent → OTEL Collector (DaemonSet)
                                    ↓
           ┌────────────────────────┼──────────────────────────┐
           ▼                        ▼                          ▼
      Prometheus               Loki (logs)               Tempo (traces)
           │                        │                          │
           └──────────────── Grafana ───────────────────────────
                             (dashboards, alerts)
                                    │
                               PagerDuty
```

### OpenTelemetry Java Agent

Added to API container via `JAVA_OPTS`:
```
-javaagent:/opt/otel/opentelemetry-javaagent.jar
-Dotel.service.name=opsnext-api
-Dotel.resource.attributes=deployment.environment=${APP_ENV}
-Dotel.exporter.otlp.endpoint=http://otel-collector:4317
-Dotel.logs.exporter=otlp
-Dotel.metrics.exporter=prometheus
-Dotel.traces.exporter=otlp
-Dotel.traces.sampler=parentbased_traceidratio
-Dotel.traces.sampler.arg=0.01  # 1% in prod; 1.0 in staging
```

### Structured Log Schema

Every log line emitted as JSON:

```json
{
  "timestamp": "2026-06-14T10:23:45.123Z",
  "level": "INFO",
  "service": "opsnext-api",
  "env": "production",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7",
  "tenantId": "tenant-acme",
  "userId": "usr-abc123",
  "method": "POST",
  "path": "/api/v1/contacts",
  "statusCode": 201,
  "durationMs": 47,
  "message": "Contact created"
}
```

PII fields (`email`, `phone`, `name`) are **never** logged in structured logs. Log lines referencing contact data use IDs only.

### Grafana Dashboards

| Dashboard | Key Metrics |
|-----------|-------------|
| API Overview | Request rate, P50/P95/P99 latency, error rate by endpoint |
| Database | Active connections, query latency histogram, slow query log |
| Cache (Redis) | Hit rate, evictions, memory usage, pub/sub backlog |
| JVM | Heap usage, GC pause time, thread count, virtual thread saturation |
| Tenant Activity | Top 10 tenants by API calls, new tenant registrations |
| Import Jobs | Jobs in progress, error rate, average rows/second |

### Alerting Rules

| Alert | Condition | Severity | Route |
|-------|-----------|----------|-------|
| API Error Rate High | error_rate > 1% for 5m | P2 | PagerDuty |
| API Latency P99 High | p99_latency > 2s for 5m | P2 | PagerDuty |
| DB Connections Saturated | active_conns > 80% pool for 3m | P1 | PagerDuty |
| Pod Restart Loop | restart_count > 3 in 10m | P2 | Slack #alerts |
| Disk Usage High | disk_used > 85% | P3 | Slack #alerts |
| Import Job Failed | job_status=FAILED | P3 | Email to tenant admin |

---

## 9. Security Controls (Infrastructure Level)

| Control | Implementation |
|---------|----------------|
| Network isolation | EKS nodes in private subnets; RDS in isolated subnets; only ALB in public subnet |
| Pod network policy | Kubernetes NetworkPolicy: API pods can only reach RDS, Redis, Typesense; no pod-to-pod by default |
| IAM least privilege | IRSA (IAM Roles for Service Accounts): API SA only has S3 Get/Put, Secrets Manager read |
| Node security | Bottlerocket OS (hardened container OS); automatic security updates |
| Image scanning | Amazon ECR image scanning (Enhanced — powered by Inspector) on every push |
| Runtime security | Falco (planned Phase 17) — anomaly detection in container syscalls |
| Secrets | External Secrets Operator; secrets never in environment variables in Kubernetes manifests |
| Audit | AWS CloudTrail enabled for all API calls; EKS audit logs to CloudWatch |
