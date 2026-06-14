# OpsNext — Phase 1 Build Status

**Last Updated:** 2026-06-12  
**Phase:** Phase 1 — Monorepo, Infrastructure & Core Auth/IAM  
**Status:** ✅ READY FOR LOCALHOST REVIEW

---

## Architecture Decision: Java 21 + Spring Boot 3 Backend

The backend was rebuilt from Fastify/TypeScript to **Java 21 + Spring Boot 3.4.1 + Gradle 8.11.1**.

Key technology choices confirmed:
- **Java 21 virtual threads** (`spring.threads.virtual.enabled: true`) — replaces reactive/WebFlux
- **JJWT 0.12.6** — access tokens (8h) + opaque refresh tokens (30d, httpOnly cookie)
- **Spring Data JPA + Hibernate 6** — platform (public) schema entities only
- **Custom `TenantJdbcTemplate`** — `SET search_path TO tenant_{slug}` for tenant data isolation
- **Flyway** — platform schema migrations (`V1__platform_schema.sql`)
- **Spring Data Redis (Lettuce)** — JWT deny-list, tenant slug cache (5 min TTL)
- **bcrypt rounds=12** for password hashing
- **Account lockout** — 5 failed attempts → 15 min lock

---

## File Inventory

### Infrastructure
| File | Status | Notes |
|------|--------|-------|
| `docker-compose.yml` | ✅ Done | PostgreSQL 16, Redis 7, Typesense 26, MinIO |
| `apps/api/build.gradle.kts` | ✅ Done | All deps including commons-codec:1.17.1 |
| `apps/api/settings.gradle.kts` | ✅ Done | |
| `apps/api/gradle/wrapper/gradle-wrapper.properties` | ✅ Done | Gradle 8.11.1 |
| `apps/api/gradle/wrapper/gradle-wrapper.jar` | ✅ Done | Downloaded 43KB bootstrap JAR |
| `apps/api/gradlew.bat` | ✅ Done | Windows wrapper |
| `apps/api/gradlew` | ✅ Done | Unix wrapper |

### Configuration
| File | Status | Notes |
|------|--------|-------|
| `apps/api/src/main/resources/application.yml` | ✅ Done | All env vars with dev defaults |
| `apps/api/src/main/resources/application-dev.yml` | ✅ Done | SQL logging, debug mode |

### Database
| File | Status | Notes |
|------|--------|-------|
| `apps/api/src/main/resources/db/migration/V1__platform_schema.sql` | ✅ Done | Flyway: tenants, configs, subscriptions, metrics, platform_admins |
| `apps/api/src/main/resources/db/tenant-schema-template.sql` | ✅ Done | All tenant tables: users, roles, contacts, accounts, leads, opportunities, pipelines, activities, tasks, workflows, notifications, audit_logs, refresh_tokens, + more |

### Java — Application Core
| File | Status | Notes |
|------|--------|-------|
| `OpsNextApplication.java` | ✅ Done | `@SpringBootApplication` + `@EnableAsync` + `@EnableScheduling` |
| `config/AppProperties.java` | ✅ Done | `@ConfigurationProperties(prefix="app")` — Jwt, Cookie, Mail, AccountLockout, S3, Typesense |
| `config/SecurityConfig.java` | ✅ Done | Stateless JWT, CORS, public route allowlist |
| `config/RedisConfig.java` | ✅ Done | Jackson JSON serialiser |
| `config/OpenApiConfig.java` | ✅ Done | Springdoc Bearer JWT scheme |

### Java — Security
| File | Status | Notes |
|------|--------|-------|
| `security/JwtService.java` | ✅ Done | JJWT 0.12.6, Redis deny-list |
| `security/JwtAuthFilter.java` | ✅ Done | Bearer token extraction, SecurityContext + TenantContext population |
| `security/SecurityPrincipal.java` | ✅ Done | `record(userId, tenantId, email, roles, tier, jti)` |

### Java — Multi-Tenancy
| File | Status | Notes |
|------|--------|-------|
| `tenant/TenantContext.java` | ✅ Done | ThreadLocal tenant ID + schema name (virtual-thread safe) |
| `tenant/TenantFilter.java` | ✅ Done | Resolves slug from X-Tenant-Slug header or subdomain; Redis cache (5 min) |
| `tenant/TenantJdbcTemplate.java` | ✅ Done | `DataSourceUtils` for transaction participation; `Instant→OffsetDateTime` conversion |

### Java — Platform
| File | Status | Notes |
|------|--------|-------|
| `platform/entity/Tenant.java` | ✅ Done | JPA entity — `schema="public"` |
| `platform/entity/TenantConfig.java` | ✅ Done | JPA entity — `schema="public"` |
| `platform/repository/TenantRepository.java` | ✅ Done | Spring Data JPA |
| `platform/dto/TenantRegisterRequest.java` | ✅ Done | Jakarta validation |
| `platform/service/TenantProvisioningService.java` | ✅ Done | Creates schema, executes template, seeds roles+pipeline+admin |
| `platform/TenantController.java` | ✅ Done | `/api/v1/platform/tenants/register`, `check-slug`, `me`, `branding` |

### Java — Auth
| File | Status | Notes |
|------|--------|-------|
| `auth/UserDetailsServiceImpl.java` | ✅ Done | Loads user from tenant schema |
| `auth/dto/LoginRequest.java` | ✅ Done | |
| `auth/dto/RegisterRequest.java` | ✅ Done | |
| `auth/dto/LoginResponse.java` | ✅ Done | |
| `auth/AuthService.java` | ✅ Done | Login with lockout, register, logout (JTI deny-list), getCurrentUser |
| `auth/AuthController.java` | ✅ Done | `POST /login`, `/register`, `/logout`, `GET /me`, `/forgot-password`, `/reset-password`, `/verify-email` |

### Java — Common
| File | Status | Notes |
|------|--------|-------|
| `common/dto/ApiResponse.java` | ✅ Done | Generic `{ data, error }` envelope |
| `common/dto/PageResponse.java` | ✅ Done | Pagination wrapper |
| `common/exception/AppException.java` | ✅ Done | Typed exceptions with HTTP status |
| `common/exception/GlobalExceptionHandler.java` | ✅ Done | `@RestControllerAdvice` |
| `health/HealthController.java` | ✅ Done | `GET /health` + `GET /api/v1/health` (DB + Redis check) |

### Frontend (apps/web) — Partially Complete
| Area | Status | Notes |
|------|--------|-------|
| Next.js 15 App Router setup | ✅ Done | Tailwind, shadcn/ui configured |
| Auth pages (login, register, forgot-password) | ✅ Done | |
| App shell (sidebar, topbar) | ✅ Done | |
| Dashboard page (KPI cards + charts) | ✅ Done | |
| Contacts list + detail pages | ✅ Done | TanStack Table |
| Remaining pages | ⏳ Phase 2+ | Accounts, Leads, Opportunities, Kanban, Tasks, Notifications |

---

## Compile Status

```
[2026-06-12] .\gradlew.bat compileJava → BUILD SUCCESSFUL ✅
```

**Bugs found and fixed during Phase 1 build:**
1. `commons-codec` missing from build.gradle.kts → Added `1.17.1`
2. `AppProperties.mail` was `String`, bound to YAML nested object → Fixed to `Mail` record
3. `hikari.auto-commit: false` → Removed; `TenantJdbcTemplate` uses `DataSourceUtils` for proper transaction participation
4. `JwtAuthFilter.afterFilterExecution` doesn't exist in `OncePerRequestFilter` → Rewrote with try-finally
5. TenantProvisioningService: comment-prefixed SQL chunks were skipped → Fixed to strip comments per-line before emptiness check
6. `Instant` parameter binding → Added explicit `Instant→OffsetDateTime` conversion in `TenantJdbcTemplate.bindParams()`
7. `tenant-schema-template.sql` missing `deleted_at`, `last_login_at`, `email_verification_token`, `email_verification_expires_at` on users table → Added
8. `-XX:+EnableVirtualThreads` not a valid JVM flag → Removed; virtual threads enabled via `spring.threads.virtual.enabled: true`
9. `SET search_path TO tenant_xxx` missing `, public` → `gin_trgm_ops` not found for GIN indexes → Fixed to include `, public`
10. `TenantConfig.featureFlags` (String → jsonb) → Added `@JdbcTypeCode(SqlTypes.JSON)`

**Phase 1 Live Validation (2026-06-12):**
- ✅ `GET /health` → `{"status":"ok","service":"opsnext-api"}`
- ✅ `GET /api/v1/health` → `{"database":"ok","redis":"ok"}`
- ✅ `POST /api/v1/platform/tenants/register` → Schema provisioned, roles seeded, admin created
- ✅ `POST /api/v1/auth/login` → JWT access token issued, refresh cookie set
- ✅ `GET /api/v1/auth/me` → User profile returned with roles
- ✅ `GET /api/v1/platform/tenants/check-slug` → Slug availability check works
- ✅ Wrong password → 401 UNAUTHORIZED returned correctly

---

## Phase 1 — Localhost Startup Instructions

### Prerequisites
- Docker Desktop running
- Java 21 installed (`java -version` → 21.x)
- Node.js 20+ + pnpm 9+ installed

### Step 1 — Start Infrastructure
```powershell
# From OpsNext root directory
docker compose up -d

# Wait for healthy status (~30s)
docker compose ps
```

### Step 2 — Start the Java API
```powershell
cd apps\api

# First run: downloads Gradle 8.11.1 (~200MB, cached after first download)
.\gradlew.bat bootRun

# The API is ready when you see:
# Started OpsNextApplication in X.XXX seconds
# Server is listening on http://localhost:3001
```

**Or use the Gradle daemon for faster restarts:**
```powershell
.\gradlew.bat bootRun --args="--spring.profiles.active=dev"
```

### Step 3 — Start the Web Frontend
```powershell
# From OpsNext root (in a new terminal)
pnpm install
pnpm dev
```

### Step 4 — Verify Phase 1 Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `http://localhost:3001/health` | GET | None | Basic health check |
| `http://localhost:3001/api/v1/health` | GET | None | Health check with DB + Redis status |
| `http://localhost:3001/swagger-ui.html` | GET | None | Interactive API documentation |
| `http://localhost:3001/api-docs` | GET | None | OpenAPI JSON spec |
| `http://localhost:3000` | GET | None | Web frontend |

### Step 5 — Register First Tenant (via Swagger or cURL)

```bash
curl -X POST http://localhost:3001/api/v1/platform/tenants/register \
  -H "Content-Type: application/json" \
  -d '{
    "orgName": "Acme Corp",
    "adminEmail": "admin@acme.com",
    "adminPassword": "Admin@1234",
    "adminFirstName": "Admin",
    "adminLastName": "User"
  }'
```

### Step 6 — Login

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: acme-corp" \
  -d '{
    "email": "admin@acme.com",
    "password": "Admin@1234"
  }'
```

---

## What's NOT in Phase 1 (deferred to Phase 2+)

- Contacts, Accounts, Leads, Opportunities API controllers
- Pipeline/Kanban board
- Task management
- Workflow automation engine
- Notifications (SSE + push)
- Reporting & analytics
- Admin panel
- Import wizard
- Email sequences
- Webhooks
- Background job worker (`apps/worker`)

---

## Phase 2 Preview — Contact & Account Management

Next phase will add:
- `ContactController` + `AccountController` (Spring Boot, TenantJdbcTemplate)
- Contact list page with TanStack Table (already in web app)
- Contact detail with activity timeline
- Account list + detail
- Accounts list in web frontend