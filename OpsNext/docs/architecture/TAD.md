# OpsNext CRM — Technical Architecture Document (TAD)

**Document Version:** 1.0  
**Status:** APPROVED  
**Prepared By:** Lead Architect  
**Date:** 2026-06-13  
**Classification:** Internal — Confidential  
**Reference Documents:** FUNCTIONAL_REQUIREMENTS.md, EXECUTION_TASK_PLAN.md, TECHNOLOGY_DECISION_RATIONALE.md

> **Note:** The backend runtime was changed from Node.js/Fastify to Java 21 + Spring Boot 3.4.1 before Phase 1 implementation commenced. All architecture decisions in this document reflect the implemented stack. See `adr/ADR-001-backend-runtime.md` for the full decision record.

---

## Table of Contents

1. [System Context Diagram (C4 Level 1)](#1-system-context-diagram)
2. [Container Diagram (C4 Level 2)](#2-container-diagram)
3. [Component Diagram — API Server (C4 Level 3)](#3-component-diagram--api-server)
4. [Data Flow Diagrams](#4-data-flow-diagrams)
5. [Sequence Diagrams](#5-sequence-diagrams)
6. [Architecture Decision Records](#6-architecture-decision-records)
7. [Technology Matrix](#7-technology-matrix)
8. [API Versioning Strategy](#8-api-versioning-strategy)
9. [Error Handling Standard](#9-error-handling-standard)
10. [Logging & Observability Standard](#10-logging--observability-standard)

---

## 1. System Context Diagram

**C4 Level 1 — OpsNext in relation to external systems**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             EXTERNAL ACTORS                                  │
│                                                                               │
│   [Browser User]      [Mobile User]      [Integration Partner]               │
│   Sales Rep / Admin   iOS / Android App  PowerApps / Zapier / Custom         │
└──────────┬───────────────────┬──────────────────────┬────────────────────────┘
           │ HTTPS             │ HTTPS                 │ REST / Webhooks
           ▼                   ▼                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│                         ┌─────────────────┐                                  │
│                         │                 │                                  │
│                         │   OpsNext CRM   │                                  │
│                         │  SaaS Platform  │                                  │
│                         │                 │                                  │
│                         └─────────────────┘                                  │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
           │
           │ Outbound connections
           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                                     │
│                                                                               │
│  [Stripe]          Payment processing, subscription management                │
│  [Resend]          Transactional email delivery                               │
│  [Twilio]          SMS OTP for MFA                                            │
│  [Salesforce API]  CRM data sync (Phase 14)                                  │
│  [Zoho CRM API]    CRM data sync (Phase 14)                                  │
│  [Google APIs]     Gmail sync, Calendar sync, OAuth SSO                      │
│  [Microsoft Graph] Outlook sync, M365 Calendar sync, Entra SSO               │
│  [AWS S3]          Import/export file storage, attachments                    │
│  [Cloudflare]      CDN, WAF, DDoS protection, DNS                            │
│  [PagerDuty]       Incident alerting                                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Actors

| Actor | Type | Interaction |
|-------|------|-------------|
| Sales Representative | Internal user (tenant) | CRUD contacts, accounts, leads, opportunities; log activities |
| Sales Manager | Internal user (tenant) | All Rep permissions + view team pipelines, assign leads, run reports |
| Tenant Administrator | Internal user (tenant) | User management, custom fields, SSO config, billing |
| Platform Administrator | OpsNext staff | Cross-tenant visibility, tenant suspension, usage monitoring |
| External Integration System | Machine | REST API or webhook consumer (PowerApps, Zapier, custom apps) |
| Mobile User | Internal user (tenant) | React Native app — same operations as browser, optimised for mobile |

---

## 2. Container Diagram

**C4 Level 2 — All running processes and data stores**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         OPSNEXT PLATFORM BOUNDARY                             │
│                                                                               │
│  ┌──────────────────┐      ┌──────────────────────────────────────────────┐  │
│  │                  │      │              KUBERNETES CLUSTER               │  │
│  │   Web App        │      │                                               │  │
│  │   Next.js 15     │─────►│  ┌─────────────────────────────────────┐    │  │
│  │   React 19       │ HTTPS│  │         API Server                   │    │  │
│  │   (apps/web)     │      │  │  Java 21 + Spring Boot 3.4.1        │    │  │
│  │   Port: 3000     │      │  │  HikariCP + Spring Security 6        │    │  │
│  │                  │      │  │  JJWT 0.12.6 + Virtual Threads       │    │  │
│  └──────────────────┘      │  │  Port: 8080                          │    │  │
│                             │  └──────────┬──────────────────────────┘    │  │
│  ┌──────────────────┐      │             │                                │  │
│  │                  │      │  ┌──────────┴──────────────────────────┐    │  │
│  │   Mobile App     │      │  │         Worker Service               │    │  │
│  │   React Native   │─────►│  │  Spring Batch + @Scheduled           │    │  │
│  │   (apps/mobile)  │ HTTPS│  │  BullMQ-equivalent job queues        │    │  │
│  │                  │      │  │  Port: 8081                          │    │  │
│  └──────────────────┘      │  └──────────┬──────────────────────────┘    │  │
│                             │             │                                │  │
│                             │  ┌──────────▼──────────────────────────┐    │  │
│                             │  │       Search Service                 │    │  │
│                             │  │  Typesense (self-hosted)             │    │  │
│                             │  │  Port: 8108                          │    │  │
│                             │  └──────────┬──────────────────────────┘    │  │
│                             └─────────────┼──────────────────────────────┘  │
│                                           │                                  │
│  ┌────────────────────────────────────────▼─────────────────────────────┐   │
│  │                         DATA STORES                                   │   │
│  │                                                                        │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │  PostgreSQL 16 (AWS RDS Multi-AZ)                               │ │   │
│  │  │  Schema: public (platform)  +  tenant_{slug} (per tenant)       │ │   │
│  │  │  Port: 5432                                                      │ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                        │   │
│  │  ┌──────────────────────┐   ┌──────────────────────────────────────┐ │   │
│  │  │  Redis 7             │   │  AWS S3 / Cloudflare R2              │ │   │
│  │  │  (ElastiCache)       │   │  opsnext-imports-{env}               │ │   │
│  │  │  Sessions, BullMQ,   │   │  opsnext-exports-{env}               │ │   │
│  │  │  Rate limit, Cache   │   │  opsnext-attachments-{env}           │ │   │
│  │  │  Port: 6379           │   └──────────────────────────────────────┘ │   │
│  │  └──────────────────────┘                                              │   │
│  │                                                                        │   │
│  │  ┌──────────────────────┐   ┌──────────────────────────────────────┐ │   │
│  │  │  ClickHouse          │   │  AWS Secrets Manager                 │ │   │
│  │  │  (Phase 2+ reporting)│   │  opsnext/{env}/db                    │ │   │
│  │  │  Port: 8123          │   │  opsnext/{env}/jwt                   │ │   │
│  │  └──────────────────────┘   └──────────────────────────────────────┘ │   │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Container Descriptions

| Container | Technology | Responsibility |
|-----------|-----------|----------------|
| **Web App** | Next.js 15, React 19, shadcn/ui, TanStack Query, Zustand | Browser-served SPA + SSR. Multi-tenant UI with tenant-specific branding. |
| **API Server** | Java 21, Spring Boot 3.4.1, Spring Security 6, JJWT | All business logic, auth, multi-tenancy enforcement, REST endpoints. |
| **Worker Service** | Java 21, Spring Batch, Spring @Scheduled | Background jobs: import processing, search sync, workflow execution, notifications, scheduled reports. |
| **Search Service** | Typesense (self-hosted binary) | Full-text search with typo tolerance. Per-tenant collection isolation. |
| **PostgreSQL 16** | AWS RDS Multi-AZ | Primary OLTP store. Schema-per-tenant isolation. JSONB for custom fields. |
| **Redis 7** | AWS ElastiCache | Token deny-list, rate limiting counters, RBAC permission cache, job queue backing store. |
| **AWS S3** | AWS S3 (eu-west-1, us-east-1) | Import file staging, export delivery, attachment storage. |
| **ClickHouse** | Self-hosted (Phase 2+) | OLAP reporting — audit logs, pipeline aggregations, activity trends. |
| **AWS Secrets Manager** | AWS | Runtime secrets: DB credentials, JWT keys, third-party API keys. |

### Container Communication Protocols

| From | To | Protocol | Auth |
|------|----|----------|------|
| Web App | API Server | HTTPS REST (JSON) | Bearer JWT |
| Mobile App | API Server | HTTPS REST (JSON) | Bearer JWT |
| External Systems | API Server | HTTPS REST (JSON) | API Key or Bearer JWT |
| API Server | PostgreSQL | TCP/IP (JDBC via HikariCP) | DB user/password (Secrets Manager) |
| API Server | Redis | RESP protocol (Lettuce client) | Redis AUTH token |
| API Server | Typesense | HTTPS REST | Typesense API Key |
| API Server | Resend | HTTPS REST | API Key |
| API Server | Stripe | HTTPS REST | API Key (Secrets Manager) |
| Worker Service | PostgreSQL | TCP/IP (JDBC) | DB user/password |
| Worker Service | Redis | RESP (Lettuce) | Redis AUTH token |
| Worker Service | AWS S3 | HTTPS (AWS SDK) | IAM Role (IRSA) |

---

## 3. Component Diagram — API Server

**C4 Level 3 — Internal breakdown of `apps/api`**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      SPRING BOOT API SERVER (apps/api)                        │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                     INBOUND REQUEST PIPELINE                             │ │
│  │                                                                           │ │
│  │  HTTP Request                                                             │ │
│  │      │                                                                    │ │
│  │      ▼                                                                    │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │ │
│  │  │  Spring Security Filter Chain                                      │   │ │
│  │  │  1. CorsFilter          — CORS header enforcement                  │   │ │
│  │  │  2. RateLimitFilter     — per-tenant, per-tier rate limiting       │   │ │
│  │  │  3. JwtAuthFilter       — extract + validate Bearer JWT            │   │ │
│  │  │  4. TenantFilter        — resolve tenantId, set TenantContext      │   │ │
│  │  │  5. SecurityContextHolder — attach SecurityPrincipal               │   │ │
│  │  └──────────────────────────────────────────────────────────────────┘   │ │
│  │      │                                                                    │ │
│  │      ▼                                                                    │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │ │
│  │  │  Controller Layer  (@RestController)                               │   │ │
│  │  │  AuthController  ContactController  AccountController             │   │ │
│  │  │  LeadController  OpportunityController  PipelineController        │   │ │
│  │  │  ActivityController  TaskController  TenantController             │   │ │
│  │  │  HealthController                                                  │   │ │
│  │  │                                                                    │   │ │
│  │  │  Responsibilities: HTTP binding, input validation (@Valid),        │   │ │
│  │  │  response wrapping in ApiResponse<T>                               │   │ │
│  │  └──────────────────────────────────────────────────────────────────┘   │ │
│  │      │                                                                    │ │
│  │      ▼                                                                    │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │ │
│  │  │  Service Layer  (@Service)                                         │   │ │
│  │  │  AuthService  ContactService  AccountService  LeadService         │   │ │
│  │  │  OpportunityService  ActivityService  TaskService                 │   │ │
│  │  │  TenantProvisioningService                                         │   │ │
│  │  │                                                                    │   │ │
│  │  │  Responsibilities: business logic, RBAC enforcement,              │   │ │
│  │  │  AuditLog writes, domain event emission, transaction boundaries   │   │ │
│  │  └──────────────────────────────────────────────────────────────────┘   │ │
│  │      │                                                                    │ │
│  │      ▼                                                                    │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │ │
│  │  │  Repository / Data Access Layer                                    │   │ │
│  │  │                                                                    │   │ │
│  │  │  Platform schema  ──►  Spring Data JPA (Hibernate 6)             │   │ │
│  │  │  (Tenant entity)        TenantRepository extends JpaRepository    │   │ │
│  │  │                                                                    │   │ │
│  │  │  Tenant schema    ──►  TenantJdbcTemplate (custom)               │   │ │
│  │  │  (all CRM entities)     Wraps JdbcTemplate, injects schema prefix  │   │ │
│  │  │                         Uses DataSourceUtils for transaction       │   │ │
│  │  │                         participation                              │   │ │
│  │  └──────────────────────────────────────────────────────────────────┘   │ │
│  │      │                                                                    │ │
│  │      ▼                                                                    │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │ │
│  │  │  Infrastructure Layer                                              │   │ │
│  │  │                                                                    │   │ │
│  │  │  HikariCP Connection Pool  ──►  PostgreSQL 16 (via JDBC)         │   │ │
│  │  │  Lettuce Redis Client      ──►  Redis 7 (token store, cache)     │   │ │
│  │  │  Typesense REST Client     ──►  Typesense (search)               │   │ │
│  │  │  AWS SDK v2 S3 Client      ──►  S3 (file storage)               │   │ │
│  │  │  Resend HTTP Client        ──►  Resend (transactional email)      │   │ │
│  │  └──────────────────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                     CROSS-CUTTING CONCERNS                               │ │
│  │                                                                           │ │
│  │  TenantContext       — ThreadLocal<String> holding current tenantId      │ │
│  │  SecurityPrincipal   — record(userId, tenantId, email, roles)            │ │
│  │  GlobalExceptionHandler — @ControllerAdvice → standard error envelope   │ │
│  │  AppProperties       — typed config binding (@ConfigurationProperties)   │ │
│  │  OpenApiConfig       — Springdoc OpenAPI 3.1 + Swagger UI               │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Package Structure

```
io.opsnext.api
├── OpsNextApplication.java          — @SpringBootApplication entry point
├── config/
│   ├── SecurityConfig.java          — Spring Security filter chain config
│   ├── RedisConfig.java             — Lettuce connection factory
│   ├── OpenApiConfig.java           — Springdoc configuration
│   └── AppProperties.java           — @ConfigurationProperties (jwt, cookie, app)
├── security/
│   ├── JwtService.java              — token generation + validation (JJWT 0.12.6)
│   ├── JwtAuthFilter.java           — OncePerRequestFilter: extract + validate JWT
│   └── SecurityPrincipal.java       — record: userId, tenantId, email, roles
├── tenant/
│   ├── TenantContext.java           — ThreadLocal<String> for current tenantId
│   ├── TenantFilter.java            — OncePerRequestFilter: resolves tenant, sets context
│   └── TenantJdbcTemplate.java      — schema-aware JdbcTemplate wrapper
├── auth/
│   ├── AuthController.java          — /api/v1/auth/* endpoints
│   ├── AuthService.java             — login, logout, register, refresh, me logic
│   ├── UserDetailsServiceImpl.java  — Spring Security UserDetailsService
│   └── dto/                         — LoginRequest, RegisterRequest, LoginResponse
├── platform/
│   ├── TenantController.java        — /api/v1/platform/tenants/* endpoints
│   ├── entity/Tenant.java           — @Entity, public schema
│   ├── entity/TenantConfig.java     — @Entity, tenant configuration
│   ├── repository/TenantRepository.java — JpaRepository<Tenant, String>
│   ├── service/TenantProvisioningService.java — schema creation + seeding
│   └── dto/TenantRegisterRequest.java
├── contact/
│   ├── ContactController.java       — /api/v1/contacts/* CRUD
│   ├── ContactService.java          — business logic via TenantJdbcTemplate
│   └── dto/ContactRequest.java
├── account/, lead/, opportunity/,
│   pipeline/, activity/, task/      — same pattern as contact
├── common/
│   ├── dto/ApiResponse.java         — { success, data, error, traceId }
│   ├── dto/PageResponse.java        — { content[], page, size, totalElements, totalPages }
│   └── exception/
│       ├── AppException.java        — domain exception with HTTP status + error code
│       └── GlobalExceptionHandler.java — @ControllerAdvice → ApiResponse<Void>
└── health/
    └── HealthController.java        — /health, /api/v1/health
```

---

## 4. Data Flow Diagrams

### 4.1 Tenant Onboarding

```
Client                API Server              PostgreSQL           Redis
  │                       │                       │                  │
  │──POST /platform/tenants/register──►           │                  │
  │                       │                       │                  │
  │             Validate request (Bean Validation)│                  │
  │                       │                       │                  │
  │                       │──BEGIN TRANSACTION────►                  │
  │                       │──INSERT public.tenants►                  │
  │                       │──INSERT public.tenant_configs─────────── │
  │                       │                       │                  │
  │                       │  Create tenant_{slug} schema             │
  │                       │──CREATE SCHEMA tenant_{slug}─────────────│
  │                       │──CREATE TABLE users───►                  │
  │                       │──CREATE TABLE roles───►                  │
  │                       │──CREATE TABLE permissions─────────────── │
  │                       │  (all 20+ entity tables)                 │
  │                       │──INSERT default roles + permissions       │
  │                       │──INSERT default pipeline + stages─────── │
  │                       │──INSERT admin user────►                  │
  │                       │──COMMIT TRANSACTION───►                  │
  │                       │                       │                  │
  │                       │                       │──Cache tenant slug│
  │                       │                       │  (SET tenant_slug:│
  │                       │                       │  {slug} {id})────►│
  │                       │                       │                  │
  │◄──201 Created { tenantId, slug, adminUserId }─│                  │
  │                       │                       │                  │
```

### 4.2 User Authentication

```
Client                API Server              PostgreSQL           Redis
  │                       │                       │                  │
  │──POST /api/v1/auth/login──►                   │                  │
  │   { email, password, tenantId }               │                  │
  │                       │                       │                  │
  │             TenantFilter: resolve tenant       │                  │
  │                       │──GET tenant_slug:id───►                  │
  │                       │◄──tenantId─────────── │                  │
  │                       │                       │                  │
  │             SET search_path = tenant_{slug}    │                  │
  │                       │──SELECT user WHERE email──►              │
  │                       │◄──User record──────── │                  │
  │                       │                       │                  │
  │             BCrypt verify password            │                  │
  │             Check lockedUntil                 │                  │
  │             Check status = ACTIVE             │                  │
  │                       │                       │                  │
  │                       │──UPDATE failedAttempts = 0──►            │
  │                       │                       │                  │
  │             Generate access JWT (8h, RS256)   │                  │
  │             Generate refresh token (opaque, 30d)                 │
  │                       │                       │                  │
  │                       │──INSERT refresh token hash──►            │
  │                       │                       │                  │
  │                       │──SET refresh:{jti} EX 2592000──────────►│
  │                       │                       │                  │
  │◄──200 { accessToken } + Set-Cookie: refresh── │                  │
  │   (httpOnly, Secure, SameSite=Strict)         │                  │
```

### 4.3 Multi-Tenant CRUD Entity Lifecycle

```
Client                JwtAuthFilter    TenantFilter     ContactController    ContactService        TenantJdbcTemplate     PostgreSQL
  │                       │                │                   │                   │                       │                   │
  │──POST /api/v1/contacts─►               │                   │                   │                       │                   │
  │                       │                │                   │                   │                       │                   │
  │             Validate JWT               │                   │                   │                       │                   │
  │             Set SecurityPrincipal      │                   │                   │                       │                   │
  │                       │──────────────►│                   │                   │                       │                   │
  │             Extract tenantId from JWT  │                   │                   │                       │                   │
  │             TenantContext.set(tenantId)│                   │                   │                       │                   │
  │                       │──────────────────────────────────►│                   │                       │                   │
  │             @Valid ContactRequest      │                   │                   │                       │                   │
  │                       │               │                   │──create(req)─────►│                       │                   │
  │                       │               │                   │                   │                       │                   │
  │                       │               │                   │   Check RBAC permission (CREATE_CONTACT)   │                   │
  │                       │               │                   │   Load from Redis cache or DB              │                   │
  │                       │               │                   │                   │                       │                   │
  │                       │               │                   │                   │──getSchema()──────────►│                   │
  │                       │               │                   │                   │◄──"tenant_{slug}"──── │                   │
  │                       │               │                   │                   │                       │                   │
  │                       │               │                   │                   │──INSERT INTO tenant_{slug}.contacts──────►│
  │                       │               │                   │                   │◄──Contact row──────── │◄──────────────────│
  │                       │               │                   │                   │                       │                   │
  │                       │               │                   │   Write AuditLog  │                       │                   │
  │                       │               │                   │   Enqueue search-sync job (Redis)         │                   │
  │                       │               │                   │◄──ContactResponse─│                       │                   │
  │◄──201 { data: Contact }───────────────────────────────────│                   │                       │                   │
```

### 4.4 Import Pipeline

```
Client          API Server         S3             Worker Service     PostgreSQL      Typesense
  │                 │               │                  │                  │              │
  │──POST /imports/upload──►        │                  │                  │              │
  │   multipart (CSV/XLSX)          │                  │                  │              │
  │                 │──Upload file──►                  │                  │              │
  │                 │◄──S3 key──────│                  │                  │              │
  │                 │──INSERT ImportJob (PENDING)──────►                  │              │
  │◄──202 { jobId }─│               │                  │                  │              │
  │                 │               │                  │                  │              │
  │                 │               │──Notify Worker (Redis job)─────────►│              │
  │                 │               │                  │                  │              │
  │                 │               │◄──Download file──│                  │              │
  │                 │               │                  │                  │              │
  │                 │               │         Parse + validate rows       │              │
  │                 │               │         Chunk into 500-row batches  │              │
  │                 │               │         For each chunk:             │              │
  │                 │               │                  │──INSERT batch────►             │
  │                 │               │                  │──UPDATE processedRows──────────│
  │                 │               │                  │                  │              │
  │                 │               │                  │──Batch upsert search docs──────►│
  │                 │               │                  │                  │              │
  │                 │               │                  │──UPDATE ImportJob (COMPLETED)──►│
  │                 │               │                  │──Send completion email          │
  │                 │               │                  │                  │              │
  │──GET /imports/{jobId}/status──►│                  │                  │              │
  │◄──200 { status, processed, total, errors }─────────│                  │              │
```

### 4.5 Workflow Execution

```
ContactService      EventBus         WorkflowEvalWorker      ActionExecutor      External Services
      │                 │                    │                      │                   │
      │ contact.updated │                    │                      │                   │
      │──publish event──►                    │                      │                   │
      │                 │                    │                      │                   │
      │     Redis Pub/Sub: events:{tenantId} │                      │                   │
      │                 │──dispatch job──────►                      │                   │
      │                 │                    │                      │                   │
      │                 │  Load active workflows for tenant+entityType+event            │
      │                 │                    │──query workflows──────────────────────── │
      │                 │                    │                      │                   │
      │                 │         Evaluate conditions against event payload             │
      │                 │                    │                      │                   │
      │                 │         Condition match → enqueue workflow-execute job        │
      │                 │                    │──enqueue────────────►│                   │
      │                 │                    │                      │                   │
      │                 │                    │           Execute actions sequentially:  │
      │                 │                    │                      │──CREATE_TASK──────►│
      │                 │                    │                      │──SEND_EMAIL───────►│ Resend
      │                 │                    │                      │──SEND_NOTIF───────►│ In-app
      │                 │                    │                      │──CALL_WEBHOOK─────►│ Client URL
      │                 │                    │                      │                   │
      │                 │                    │           Log each result to WorkflowExecution.actionResults
      │                 │                    │                      │                   │
```

### 4.6 Notification Dispatch

```
NotificationService       PostgreSQL         Redis          API Server (SSE)    Client Browser
        │                     │               │                    │                  │
        │──create notification─►              │                    │                  │
        │──INSERT notifications─►             │                    │                  │
        │                     │               │                    │                  │
        │──PUBLISH notifications:{userId}─────►                    │                  │
        │                     │               │──event──────────────►                 │
        │                     │               │  SSE: data:{json}  │──data: {json}────►│
        │                     │               │                    │                  │
        │──Enqueue email job (if user has email pref enabled)       │                  │
        │──30s delay (batch window)           │                    │                  │
        │──Send email via Resend              │                    │                  │
```

---

## 5. Sequence Diagrams

### 5.1 Login + Refresh Token

```
Browser                        API Server                    PostgreSQL              Redis
  │                                │                              │                    │
  │─POST /api/v1/auth/login───────►│                              │                    │
  │  { email, password }           │                              │                    │
  │                                │─SET search_path──────────────►                    │
  │                                │─SELECT * FROM users WHERE email=?──────────────── │
  │                                │◄─User record────────────────│                    │
  │                                │                              │                    │
  │                                │  BCrypt.checkpw(password, hash)                   │
  │                                │  Check lockedUntil > now → 401                    │
  │                                │                              │                    │
  │                                │  Generate JWT (8h, RS256, sub=userId)             │
  │                                │  Generate refreshTokenId (UUID)                   │
  │                                │─INSERT session (tokenHash, expiresAt)─────────── │
  │                                │─SET refresh:{jti} "valid" EX 2592000────────────►│
  │                                │                              │                    │
  │◄─200 { accessToken }──────────│                              │                    │
  │  Set-Cookie: refresh={token}   │                              │                    │
  │  (httpOnly, Secure, SameSite=Strict, MaxAge=2592000)         │                    │
  │                                │                              │                    │
  │  ... 8 hours later ...         │                              │                    │
  │─POST /api/v1/auth/refresh─────►│                              │                    │
  │  Cookie: refresh={token}       │                              │                    │
  │                                │─GET refresh:{jti}──────────────────────────────►│
  │                                │◄─"valid"──────────────────────────────────────── │
  │                                │                              │                    │
  │                                │  Issue new access JWT        │                    │
  │                                │  Rotate refresh token (new UUID)                  │
  │                                │─DEL refresh:{old_jti}──────────────────────────►│
  │                                │─SET refresh:{new_jti} "valid" EX 2592000────────►│
  │                                │─UPDATE session────────────────►                   │
  │                                │                              │                    │
  │◄─200 { accessToken }──────────│                              │                    │
  │  Set-Cookie: refresh={newToken}│                              │                    │
```

### 5.2 Create Contact

```
Browser            JwtAuthFilter   TenantFilter   ContactController  ContactService  TenantJdbcTemplate  PostgreSQL
  │                     │              │               │                  │                │               │
  │─POST /contacts─────►│              │               │                  │                │               │
  │  Authorization: Bearer {jwt}       │               │                  │                │               │
  │                     │              │               │                  │                │               │
  │          Verify JWT signature      │               │                  │                │               │
  │          Check expiry              │               │                  │                │               │
  │          Check JTI deny-list       │               │                  │                │               │
  │          Set SecurityPrincipal     │               │                  │                │               │
  │                     │─────────────►│               │                  │                │               │
  │          Extract tenantId from JWT │               │                  │                │               │
  │          Set TenantContext         │               │                  │                │               │
  │                     │             │──────────────►│                  │                │               │
  │          @Valid ContactRequest     │               │                  │                │               │
  │                     │             │               │─create(req)──────►                │               │
  │                     │             │               │                  │                │               │
  │                     │             │               │   checkPermission(CREATE,CONTACT)  │               │
  │                     │             │               │   (Redis cache hit: rbac:{t}:{u})  │               │
  │                     │             │               │                  │                │               │
  │                     │             │               │                  │─getSchema()────►               │
  │                     │             │               │                  │◄─"tenant_acme"─│               │
  │                     │             │               │                  │                │               │
  │                     │             │               │                  │─INSERT INTO tenant_acme.contacts─►│
  │                     │             │               │                  │◄─contact row───│◄──────────────│
  │                     │             │               │                  │                │               │
  │                     │             │               │   auditLog.write(CREATE, contact) │               │
  │                     │             │               │   searchSync.enqueue(contact)     │               │
  │                     │             │               │◄─ContactResponse─│                │               │
  │◄─201 { data: Contact }────────────────────────────│                  │                │               │
```

### 5.3 Convert Lead

```
Browser         LeadController    LeadService          ContactService  AccountService  OpportunityService  PostgreSQL
  │                 │                 │                      │               │               │                │
  │─POST /leads/:id/convert──────────►                      │               │               │                │
  │  { createContact, createAccount, createOpportunity }    │               │               │                │
  │                 │─convert(id, req)►                      │               │               │                │
  │                 │                 │                      │               │               │                │
  │                 │  BEGIN TRANSACTION──────────────────────────────────────────────────────►               │
  │                 │                 │                      │               │               │                │
  │                 │                 │─createFromLead(lead)─►               │               │                │
  │                 │                 │◄─Contact { id }──────│               │               │                │
  │                 │                 │                      │               │               │                │
  │                 │                 │─createFromLead(lead)───────────────►│               │                │
  │                 │                 │◄─Account { id }────────────────────│               │                │
  │                 │                 │                      │               │               │                │
  │                 │                 │─createFromLead(lead, contactId, accountId)──────────►                │
  │                 │                 │◄─Opportunity { id }────────────────────────────────│                │
  │                 │                 │                      │               │               │                │
  │                 │  UPDATE lead SET convertedAt=now, convertedToContactId, ..────────────────────────────►│
  │                 │  COMMIT TRANSACTION──────────────────────────────────────────────────►                 │
  │                 │                 │                      │               │               │                │
  │                 │  emit(lead.converted)                  │               │               │                │
  │◄─200 { contactId, accountId, opportunityId }─────────────│               │               │                │
```

### 5.4 Trigger Workflow

```
EntityService   EventPublisher    Redis        WorkflowWorker    ActionExecutor    Resend / Task DB
     │               │              │               │                 │                  │
     │─emit event────►              │               │                 │                  │
     │ {type, entity, before,after} │               │                 │                  │
     │               │─PUBLISH events:{tenantId}────►                 │                  │
     │               │              │──Job enqueued─►                 │                  │
     │               │              │               │                 │                  │
     │               │              │   Load matching workflows from DB                  │
     │               │              │   Evaluate conditions (field ops)                  │
     │               │              │   Conditions match → execute                       │
     │               │              │               │─execute(workflow,entity)────────── │
     │               │              │               │                 │                  │
     │               │              │               │     For each action:               │
     │               │              │               │                 │─send_email────────►│
     │               │              │               │                 │─create_task───────►│
     │               │              │               │                 │◄─results──────────│
     │               │              │               │                 │                  │
     │               │              │   UPDATE WorkflowExecution (status=SUCCESS, actionResults)
```

### 5.5 Bulk Import

```
Browser     API Server          S3              ImportWorker         PostgreSQL          Typesense
  │             │               │                   │                    │                  │
  │─POST /imports/upload────────►                   │                    │                  │
  │             │─PUT object────►                   │                    │                  │
  │             │◄─S3 key───────│                   │                    │                  │
  │             │─INSERT ImportJob(PENDING)──────────────────────────────►                  │
  │◄─202 {jobId}│               │                   │                    │                  │
  │             │               │                   │                    │                  │
  │             │ Enqueue import job (Redis)         │                    │                  │
  │             │               │──Fetch file───────►                   │                  │
  │             │               │◄──stream──────────│                   │                  │
  │             │               │                   │                    │                  │
  │             │               │  Parse headers, infer types            │                  │
  │             │               │  Validate each row                     │                  │
  │             │               │  Chunk 500 rows at a time:             │                  │
  │             │               │                   │─INSERT batch──────►                  │
  │             │               │                   │─UPDATE processedRows───────────────── │
  │             │               │                   │─Upsert docs───────────────────────── ►│
  │             │               │                   │                    │                  │
  │─GET /imports/{jobId}/status─►                   │                    │                  │
  │◄─200 { processed:500/1000, status:PROCESSING }──│                    │                  │
```

### 5.6 Salesforce Sync

```
SyncScheduler   SalesforceConnector     Salesforce API     ContactService     PostgreSQL
     │                  │                    │                  │                 │
     │─triggerSync()────►                    │                  │                 │
     │                  │─GET /queryAll?q=..─►                  │                 │
     │                  │  (modified since lastSyncAt)          │                 │
     │                  │◄─{ records[], done, nextRecordsUrl }──│                 │
     │                  │                    │                  │                 │
     │                  │  Map SF fields → OpsNext fields       │                 │
     │                  │                   │                   │                 │
     │                  │  For each record:  │                  │                 │
     │                  │                   │─upsert(contact)──►                  │
     │                  │                   │    conflictStrategy(NEWEST_WINS)    │
     │                  │                   │                   │─INSERT/UPDATE──►│
     │                  │                   │                   │                 │
     │                  │─UPDATE lastSyncAt──────────────────────────────────────►│
     │                  │─nextRecordsUrl?───►                   │                 │
     │                  │  (paginate until done=true)           │                 │
     │◄─SyncResult { synced, skipped, errors }──────────────────│                 │
```

---

## 6. Architecture Decision Records

All ADRs are stored in `/docs/architecture/adr/`. See index below.

| ADR | Title | Status |
|-----|-------|--------|
| ADR-001 | Backend runtime: Java 21 + Spring Boot vs Node.js + Fastify | Accepted |
| ADR-002 | Database: PostgreSQL schema-per-tenant vs row-level isolation | Accepted |
| ADR-003 | ORM: Spring Data JPA + Hibernate 6 vs Prisma 6 | Accepted |
| ADR-004 | Queue: Spring Batch + @Scheduled vs BullMQ | Accepted |
| ADR-005 | Auth: Spring Security 6 + JJWT vs Lucia Auth | Accepted |
| ADR-006 | Search: Typesense vs Elasticsearch | Accepted |
| ADR-007 | Frontend: Next.js 15 + React 19 (unchanged from original plan) | Accepted |
| ADR-008 | JWT signing: RS256 (asymmetric) vs HS256 (symmetric) | Accepted |
| ADR-009 | Multi-tenancy middleware: ThreadLocal TenantContext vs request scope | Accepted |
| ADR-010 | Cache: Redis 7 (Lettuce) vs Caffeine (local) | Accepted |

Full ADR documents are in `/docs/architecture/adr/ADR-00N.md`.

---

## 7. Technology Matrix

### 7.1 Backend

| Package | Version | Licence | Purpose | Security Advisory | Upgrade Path |
|---------|---------|---------|---------|------------------|--------------|
| `spring-boot` | 3.4.1 | Apache 2.0 | Application framework | No active CVEs | 3.5.x (Spring 7) |
| `spring-security` | 6.4.x | Apache 2.0 | Auth, RBAC, filter chain | No active CVEs | 6.5.x |
| `hibernate-core` | 6.6.x | LGPL 2.1 | JPA ORM for platform schema | No active CVEs | 7.x (Jakarta EE 11) |
| `jjwt` | 0.12.6 | Apache 2.0 | JWT generation + validation | No active CVEs | 0.13.x |
| `HikariCP` | 5.1.0 | Apache 2.0 | JDBC connection pool | No active CVEs | Bundled with Spring Boot |
| `postgresql (JDBC)` | 42.7.x | BSD 2-Clause | PostgreSQL JDBC driver | No active CVEs | 42.8.x |
| `lettuce-core` | 6.3.x | Apache 2.0 | Redis async client | No active CVEs | 6.4.x |
| `springdoc-openapi` | 2.6.x | Apache 2.0 | OpenAPI 3.1 + Swagger UI | No active CVEs | 2.7.x |
| `jackson-databind` | 2.17.x | Apache 2.0 | JSON serialisation | No active CVEs | Bundled with Spring Boot |
| `bcrypt (spring-security)` | Built-in | Apache 2.0 | Password hashing | N/A | N/A |
| `micrometer` | 1.13.x | Apache 2.0 | Metrics + Prometheus | No active CVEs | 1.14.x |
| `opentelemetry-java` | 1.40.x | Apache 2.0 | Distributed tracing | No active CVEs | 1.41.x |
| `flyway` | 10.x | Apache 2.0 | DB migrations | No active CVEs | 11.x |

### 7.2 Frontend

| Package | Version | Licence | Purpose | Security Advisory | Upgrade Path |
|---------|---------|---------|---------|------------------|--------------|
| `next` | 15.x | MIT | SSR framework | No active CVEs | 16.x |
| `react` | 19.x | MIT | UI library | No active CVEs | N/A (latest) |
| `@tanstack/react-query` | 5.x | MIT | Server state management | No active CVEs | 6.x |
| `zustand` | 5.x | MIT | UI state management | No active CVEs | N/A |
| `react-hook-form` | 7.x | MIT | Form handling | No active CVEs | N/A |
| `zod` | 3.x | MIT | Schema validation | No active CVEs | 4.x |
| `@dnd-kit/core` | 6.x | MIT | Drag-and-drop (Kanban) | No active CVEs | N/A |
| `@tanstack/react-virtual` | 3.x | MIT | Virtual scrolling | No active CVEs | N/A |
| `@tanstack/react-table` | 8.x | MIT | Table component | No active CVEs | N/A |
| `tailwindcss` | 4.x | MIT | Utility CSS | No active CVEs | N/A |
| `@radix-ui/*` | 2.x | MIT | Accessible UI primitives | No active CVEs | N/A |
| `recharts` | 2.x | MIT | Standard charts | No active CVEs | 3.x |
| `echarts` | 5.x | Apache 2.0 | Complex BI charts | No active CVEs | N/A |

### 7.3 Infrastructure

| Component | Version | Managed By | Purpose |
|-----------|---------|-----------|---------|
| PostgreSQL | 16 | AWS RDS | Primary OLTP datastore |
| Redis | 7.x | AWS ElastiCache | Cache, session, queues |
| Typesense | 27.x | Self-hosted (Kubernetes) | Full-text search |
| ClickHouse | 24.x | Self-hosted (Phase 2+) | OLAP analytics |
| Kubernetes | 1.30 | AWS EKS | Container orchestration |
| Terraform | 1.9.x | CI/CD (GitHub Actions) | IaC |
| ArgoCD | 2.12.x | Kubernetes | GitOps CD |

---

## 8. API Versioning Strategy

### URL Prefix

All API endpoints use a version prefix:

```
/api/v1/contacts
/api/v1/auth/login
/api/v1/platform/tenants/register
```

The version is part of the URL path, not a header. This ensures:
- Reverse proxy routing can be version-aware without header inspection
- Browser URLs are bookmarkable and debuggable
- No ambiguity when multiple versions run simultaneously

### Version Header (Informational)

Every response includes:
```
X-API-Version: 1.0.0
```

### Deprecation Lifecycle

1. New version `/api/v2/` is deployed alongside `/api/v1/`
2. `/api/v1/` responses include `Sunset: {date}` and `Deprecation: true` headers
3. Deprecation notice sent to all API key holders via email (90 days notice)
4. `/api/v1/` returns HTTP 410 Gone after sunset date

### Breaking vs Non-Breaking Changes

| Change Type | Classification | Version Bump |
|------------|---------------|-------------|
| Add optional request field | Non-breaking | Minor (1.1) |
| Add response field | Non-breaking | Minor (1.1) |
| Remove request field | Breaking | Major (v2) |
| Remove response field | Breaking | Major (v2) |
| Change field type | Breaking | Major (v2) |
| Change URL structure | Breaking | Major (v2) |
| Add new endpoint | Non-breaking | Minor (1.1) |
| Change HTTP status code | Breaking | Major (v2) |
| Change auth mechanism | Breaking | Major (v2) |

### Internal Versioning

Services communicate internally using the current version; no versioning overhead on internal calls. Only the public-facing REST API is versioned.

---

## 9. Error Handling Standard

### Error Envelope

All API errors return the same JSON structure:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "CONTACT_NOT_FOUND",
    "message": "Contact with id 'abc123' was not found",
    "details": [
      {
        "field": "id",
        "message": "No contact exists with this identifier"
      }
    ],
    "traceId": "4bf92f3577b34da6a3ce929d0e0e4736"
  }
}
```

### Java Implementation

```java
// AppException.java
public class AppException extends RuntimeException {
    private final HttpStatus status;
    private final String errorCode;
    private final List<FieldError> details;
    // ...
}

// GlobalExceptionHandler.java (@ControllerAdvice)
@ExceptionHandler(AppException.class)
public ResponseEntity<ApiResponse<Void>> handleAppException(AppException ex, HttpServletRequest request) {
    return ResponseEntity.status(ex.getStatus())
        .body(ApiResponse.error(ex.getErrorCode(), ex.getMessage(), ex.getDetails(), getTraceId(request)));
}
```

### HTTP Status Mapping

| Error Code Prefix | HTTP Status | Meaning |
|------------------|-------------|---------|
| `*_NOT_FOUND` | 404 | Entity does not exist in this tenant's schema |
| `*_ALREADY_EXISTS` | 409 | Duplicate constraint violation |
| `VALIDATION_*` | 422 | Bean validation failure |
| `AUTH_*` | 401 | Authentication failure |
| `PERMISSION_*` | 403 | Authorization failure |
| `TENANT_*` | 403 or 404 | Tenant resolution failure |
| `RATE_LIMIT_*` | 429 | Rate limit exceeded |
| `IMPORT_*` | 400 | Import processing failure |
| `INTERNAL_*` | 500 | Unexpected server error |

### Error Code Registry

Error codes follow the pattern `{DOMAIN}_{VERB}_{NOUN}`:

```
AUTH_INVALID_CREDENTIALS
AUTH_ACCOUNT_LOCKED
AUTH_TOKEN_EXPIRED
AUTH_TOKEN_REVOKED
TENANT_NOT_FOUND
TENANT_SUSPENDED
CONTACT_NOT_FOUND
CONTACT_DUPLICATE_EMAIL
LEAD_INVALID_STATUS_TRANSITION
PERMISSION_INSUFFICIENT
VALIDATION_REQUIRED_FIELD
RATE_LIMIT_EXCEEDED
IMPORT_FILE_TOO_LARGE
IMPORT_INVALID_FORMAT
```

### Validation Errors

Bean Validation failures (`@Valid`) return 422 with field-level detail:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request validation failed",
    "details": [
      { "field": "email", "message": "must be a well-formed email address" },
      { "field": "firstName", "message": "must not be blank" }
    ],
    "traceId": "..."
  }
}
```

### Error Logging Rule

- 4xx errors: log at WARN level (client error, expected)
- 5xx errors: log at ERROR level with full stack trace
- Include `traceId` in all log entries to correlate with request logs

---

## 10. Logging & Observability Standard

### Structured Log Schema

All log entries are JSON (Logback JSON encoder) with the following fields:

```json
{
  "timestamp": "2026-06-13T10:30:00.123Z",
  "level": "INFO",
  "service": "opsnext-api",
  "version": "1.0.0",
  "environment": "production",
  "tenantId": "tenant_acme",
  "userId": "usr_01j2k3...",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7",
  "requestId": "req_01j2k3...",
  "message": "Contact created successfully",
  "duration": 47,
  "httpMethod": "POST",
  "httpPath": "/api/v1/contacts",
  "httpStatus": 201,
  "class": "io.opsnext.api.contact.ContactController"
}
```

### Field Definitions

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `timestamp` | ISO 8601 UTC | Logback | Always UTC |
| `level` | TRACE/DEBUG/INFO/WARN/ERROR | Logger | |
| `service` | String | `application.yml` | Identifies the container |
| `version` | String | Build-time injection | Git tag / build number |
| `environment` | String | Env var `APP_ENV` | dev/staging/production |
| `tenantId` | String | `TenantContext` | Set by `TenantFilter`; `null` for platform endpoints |
| `userId` | String | `SecurityContext` | Set after JWT auth; `null` for public endpoints |
| `traceId` | String | OpenTelemetry | W3C Trace Context ID |
| `spanId` | String | OpenTelemetry | W3C Span ID |
| `requestId` | String | Generated per request | Correlates all logs for one HTTP request |
| `message` | String | Log statement | Human-readable description |
| `duration` | Integer (ms) | Request interceptor | Present on request completion log |
| `httpMethod` | String | Request | Present on HTTP logs |
| `httpPath` | String | Request | URL path, no query string |
| `httpStatus` | Integer | Response | Present on request completion log |

### Log Levels

| Level | When to Use |
|-------|-------------|
| `ERROR` | Unexpected failures that require immediate attention (5xx, DB connection failure) |
| `WARN` | Expected failure paths (4xx errors, retries, deprecated usage) |
| `INFO` | Significant business events (tenant provisioned, user logged in, import completed) |
| `DEBUG` | Detailed flow tracing (SQL queries in dev, cache hits/misses) |
| `TRACE` | Very fine-grained (only enabled per-request in production for debugging) |

**Production default:** INFO for `io.opsnext`, WARN for all others.  
**Staging default:** DEBUG for `io.opsnext`, INFO for all others.

### PII Masking Rules

The following fields must never appear in logs:
- `password`, `passwordHash` — never logged
- `email` — masked as `s**@domain.com` in logs
- `phone` — masked as `+1***1234`
- `mfaSecret` — never logged
- `refreshToken` — never logged (only the tokenId/hash)
- `stripeCustomerId` — obfuscated
- Request bodies on auth endpoints (`/auth/login`, `/auth/register`) — body not logged

### Sampling Rates

| Environment | Trace Sampling | Log Sampling |
|-------------|---------------|-------------|
| Production | 1% (100% for errors) | All WARN+ always; INFO sampled 10% for high-volume paths |
| Staging | 100% | All levels |
| Development | 100% | All levels |

### Observability Stack

```
Application (OpenTelemetry Java Agent auto-instrumentation)
    │
    ▼
OpenTelemetry Collector (DaemonSet)
    ├─► Prometheus (metrics) ──► Grafana dashboards
    ├─► Loki (logs) ──────────► Grafana log explorer
    └─► Tempo (traces) ────────► Grafana trace explorer

Alerts: Prometheus AlertManager → PagerDuty
```

### Key Metrics to Alert

| Metric | Threshold | Action |
|--------|-----------|--------|
| API error rate (5xx) | > 1% over 5min | Page on-call |
| DB connection pool saturation | > 80% used | Page on-call |
| API P99 latency | > 2000ms over 5min | Notify on-call |
| Pod restart count | > 3 in 10min | Notify on-call |
| Job queue depth | > 1000 | Notify on-call |
| Redis memory usage | > 80% | Notify on-call |

---

## Acceptance Criteria

- [x] TAD reviewed by Lead Architect *(Author sign-off)*
- [ ] TAD reviewed by Product Owner
- [ ] TAD reviewed by Security Lead
- [x] All ADRs have context, decision, and consequences sections
- [x] Document version-controlled in `/docs/architecture/`
- [x] All 10 sub-tasks (001.1 – 001.10) addressed in this document

---

*Document Owner: Lead Architect*  
*Next Review: Phase 1 milestone completion*  
*Related: [ADR Index](adr/index.md) | [Database Design](../database/DATABASE_DESIGN.md) | [Security Architecture](../security/SECURITY_ARCHITECTURE.md)*
