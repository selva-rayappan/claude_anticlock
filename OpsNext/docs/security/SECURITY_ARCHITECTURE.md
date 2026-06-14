# OpsNext CRM — Security Architecture Document

**Document Version:** 1.0  
**Status:** APPROVED  
**Prepared By:** Security Lead  
**Date:** 2026-06-14  
**Classification:** Internal — Confidential  
**Reference Documents:** TAD.md, ADR-005-auth-spring-security.md, ADR-008-jwt-rs256.md  
**Traceability:** TASK-004

---

## Table of Contents

1. [Security Principles](#1-security-principles)
2. [Authentication Flow Specification](#2-authentication-flow-specification)
3. [Authorisation (RBAC)](#3-authorisation-rbac)
4. [Secrets Management Plan](#4-secrets-management-plan)
5. [Encryption-at-Rest Plan](#5-encryption-at-rest-plan)
6. [Transport Security](#6-transport-security)
7. [OWASP Top 10 Mitigation Checklist](#7-owasp-top-10-mitigation-checklist)
8. [GDPR Compliance Checklist](#8-gdpr-compliance-checklist)
9. [Security Headers](#9-security-headers)
10. [Rate Limiting & DDoS Protection](#10-rate-limiting--ddos-protection)
11. [Penetration Test Plan](#11-penetration-test-plan)

---

## 1. Security Principles

| Principle | Implementation |
|-----------|----------------|
| **Defence in depth** | Network → WAF → App → DB — multiple independent layers |
| **Least privilege** | RBAC with scope=OWN by default for SALES_REP; service accounts have minimal DB grants |
| **Fail secure** | Unknown tenant → 401; expired token → 401; permission denied → 403; never leak which failed |
| **Zero trust** | Every request is re-authenticated; no implicit trust based on network location |
| **Immutable audit** | Audit logs are append-only, partitioned, never deletable by tenant |
| **Tenant isolation** | Schema-per-tenant in PostgreSQL; one schema cannot reference another |

---

## 2. Authentication Flow Specification

### 2.1 Password Login

```
Client                         API Server                        PostgreSQL / Redis
  │                                │                                    │
  │  POST /api/v1/auth/login       │                                    │
  │  { email, password }           │                                    │
  │  X-Tenant-Slug: acme           │                                    │
  │ ─────────────────────────────► │                                    │
  │                                │  TenantFilter: resolve slug        │
  │                                │ ──────────────────────────────────►│
  │                                │  ◄── tenant_id, schema_name ───── │
  │                                │  SET search_path TO tenant_acme    │
  │                                │  SELECT * FROM users WHERE email=? │
  │                                │ ──────────────────────────────────►│
  │                                │  ◄── user row (hash, lockout) ─── │
  │                                │  bcrypt.verify(password, hash)     │
  │                                │  [if fail: increment attempts]     │
  │                                │  [if 5 fails: set locked_until]    │
  │                                │  generate JWT (RS256, 8h)          │
  │                                │  generate refresh token (UUID)     │
  │                                │  store refresh_token hash in DB    │
  │                                │ ──────────────────────────────────►│
  │  200 { accessToken }           │                                    │
  │  Set-Cookie: refresh=...(30d)  │                                    │
  │ ◄───────────────────────────── │                                    │
```

**Access Token (JWT):**
- Algorithm: RS256 (asymmetric — see ADR-008)
- Expiry: 8 hours
- Payload: `{ sub: userId, tenantId, email, roles: string[], tier, jti, iat, exp }`
- `jti` (JWT ID): UUID used to add token to Redis deny-list on logout

**Refresh Token:**
- Opaque UUID (not JWT)
- Stored hashed (SHA-256) in `refresh_tokens` table
- Set as `httpOnly; Secure; SameSite=Strict` cookie
- Expiry: 30 days; rotated on every refresh (old token revoked atomically)
- Not stored in Redis — DB lookup required for revocation check

### 2.2 Token Refresh

```
Client                         API Server                  DB / Redis
  │                                │                           │
  │  POST /api/v1/auth/refresh     │                           │
  │  Cookie: refresh=<opaque>      │                           │
  │ ─────────────────────────────► │                           │
  │                                │  Hash the refresh token   │
  │                                │  SELECT * FROM refresh_tokens WHERE token_hash=? │
  │                                │ ──────────────────────────►│
  │                                │  ◄── row (not revoked, not expired) ─────────── │
  │                                │  Issue new access token (JWT, 8h)               │
  │                                │  Issue new refresh token (rotated)              │
  │                                │  INSERT new refresh_token                       │
  │                                │  UPDATE old: revoked_at=NOW()                   │
  │                                │ ──────────────────────────►│
  │  200 { accessToken }           │                           │
  │  Set-Cookie: refresh=<new>     │                           │
  │ ◄───────────────────────────── │                           │
```

### 2.3 Logout

```
  POST /api/v1/auth/logout
  Bearer: <accessToken>
  Cookie: refresh=<opaque>
  
  API Server:
  1. Extract JTI from access token
  2. Add JTI to Redis deny-list: SET jti_deny:{jti} "" EX {remaining_ttl_seconds}
  3. Hash refresh token → SET refresh_tokens.revoked_at = NOW()
  4. Clear Set-Cookie (Max-Age=0)
```

The access token deny-list entry uses TTL = remaining time until access token's own expiry. After expiry, the entry is auto-evicted — no manual cleanup needed.

### 2.4 Account Lockout

- **Threshold:** 5 consecutive failed login attempts (configurable per tenant via `TenantConfig`)
- **Lock duration:** 15 minutes (configurable)
- **Reset:** Automatic after lock duration expires; or admin unlock via `POST /api/v1/admin/users/:id/unlock`
- **Action on lock:** `locked_until = NOW() + interval '15 minutes'`; email alert sent to user
- **Counter reset:** On successful login, `failed_login_attempts = 0`

### 2.5 Email Verification

- Token: 32 random bytes (hex-encoded), stored SHA-256 hashed in `email_verification_token`
- Expiry: 24 hours (`email_verification_expires_at`)
- Rate limit: 3 resend requests per hour per email
- User status remains `INVITED` until verified; login blocked until `ACTIVE`

### 2.6 Password Reset

- Token: 32 random bytes, stored SHA-256 hashed, 30-minute expiry
- Rate limit: 3 requests per hour per email (same response for existing and non-existing email — prevents email enumeration)
- On successful reset: all existing refresh tokens for that user are revoked; password change email sent
- Password policy: min 8 chars, 1 uppercase, 1 number, 1 special char; not in last 10 hashes (configurable per tenant)

### 2.7 MFA (Planned Phase 3)

**TOTP (RFC 6238):**
1. Enrol: generate TOTP secret (speakeasy/JJWT); return QR code URI; store encrypted secret
2. Verify: validate 6-digit code with ±30s window tolerance; mark `mfa_enabled=true`; generate 10 backup codes (bcrypt each)
3. Login: on password success with `mfa_enabled=true`, return `202 { mfaPending: true, sessionToken: <scoped-JWT> }` requiring a second call to `POST /api/v1/auth/mfa/challenge`
4. Backup codes: each code usable once; invalidated after use; alert sent when < 3 remaining

**SMS OTP (optional, Twilio):**
- Twilio Verify API integration
- Fallback when TOTP is unavailable

### 2.8 SSO — OAuth 2.0 / OIDC PKCE (Planned Phase 3)

```
1. GET /api/v1/auth/sso/:provider/authorize
   → Generate PKCE code_verifier (random 128 bytes, stored in Redis 10 min)
   → Redirect to provider with: response_type=code, scope=openid profile email,
     code_challenge, code_challenge_method=S256, state (CSRF token)

2. GET /api/v1/auth/sso/callback?code=...&state=...
   → Validate state matches Redis entry (CSRF check)
   → Exchange code + code_verifier for tokens
   → Decode id_token; validate iss, aud, exp, nonce
   → Look up user by email in tenant schema; create if JIT provisioning enabled
   → Issue OpsNext session (JWT + refresh token)
```

Supported providers: Microsoft Entra ID, Google Workspace. SAML 2.0 (Phase 3 P2).

---

## 3. Authorisation (RBAC)

### 3.1 Permission Model

Every protected action checks: `(resource, action, scope)`.

- `resource`: one of 9 CRM resource types
- `action`: CREATE, READ, UPDATE, DELETE, EXPORT
- `scope`: ALL (any tenant record) or OWN (only records where `owner_id = current_user_id`)

### 3.2 Request Pipeline

```
Request → JwtAuthFilter → SecurityPrincipal in SecurityContext
                             ↓
Controller → @PreAuthorize("hasRole('TENANT_ADMIN')")  [for Spring Security method security]
                             ↓
Service layer → PermissionService.check(resource, action, scope)
              → loads role→permission matrix from Redis cache (5 min TTL)
              → throws AppException(FORBIDDEN) if not permitted
                             ↓
Repository layer → if scope=OWN: append "AND owner_id = ?" to all queries
```

### 3.3 Built-in Role Permission Matrix

| Resource → Action | SUPER_ADMIN | TENANT_ADMIN | SALES_MANAGER | SALES_REP | READ_ONLY |
|-------------------|-------------|--------------|---------------|-----------|-----------|
| CONTACT:CREATE | ALL | ALL | ALL | OWN | — |
| CONTACT:READ | ALL | ALL | ALL | ALL | ALL |
| CONTACT:UPDATE | ALL | ALL | ALL | OWN | — |
| CONTACT:DELETE | ALL | ALL | ALL | — | — |
| CONTACT:EXPORT | ALL | ALL | ALL | — | — |
| ACCOUNT:* | (same pattern as CONTACT) | | | | |
| LEAD:* | (same pattern) | | | | |
| OPPORTUNITY:* | (same pattern) | | | | |
| PIPELINE:CREATE/UPDATE/DELETE | ALL | ALL | — | — | — |
| REPORT:READ | ALL | ALL | ALL | OWN | ALL |
| WORKFLOW:* | ALL | ALL | SALES_MANAGER | — | — |
| USER:* | ALL | ALL | READ only | — | — |
| SETTING:* | ALL | ALL | — | — | — |

### 3.4 Permission Cache

Role permissions are cached in Redis: key `perm:{tenantId}:{userId}`, serialised as a compact bitmask or JSON set, TTL 5 minutes.

Cache is invalidated when:
- A role's permission set is changed
- A user's role assignment is changed
- `AuthService.logout()` is called

---

## 4. Secrets Management Plan

### 4.1 Production — AWS Secrets Manager

| Secret Path | Contents | Rotation |
|-------------|----------|----------|
| `opsnext/{env}/db` | PostgreSQL host, port, name, username, password | 30 days (automated via Lambda) |
| `opsnext/{env}/redis` | Redis auth token, TLS cert | 90 days |
| `opsnext/{env}/jwt-private-key` | RS256 PKCS#8 private key (PEM) | Annual |
| `opsnext/{env}/jwt-public-key` | RS256 public key (PEM) | Annual |
| `opsnext/{env}/stripe` | Stripe API key, webhook secret | On compromise |
| `opsnext/{env}/resend` | Resend API key | On compromise |
| `opsnext/{env}/typesense` | Typesense admin API key | On compromise |
| `opsnext/{env}/minio` | MinIO access/secret key | 90 days |

Injected into pods via **External Secrets Operator** (syncs Kubernetes Secret from AWS Secrets Manager on pod start; re-syncs every 15 minutes).

### 4.2 Local Development

Developers use `.env` files from a shared password-manager vault (1Password). A template `.env.example` documents all required variables without values.

**Never committed to git:** `.env`, `.env.local`, any file containing a real password, key, or token. Gitignore enforces this.

### 4.3 Fields Requiring Application-Layer Encryption

Some fields require encryption beyond at-rest disk encryption (e.g., for field-level isolation):

| Field | Table | Encryption | Key Management |
|-------|-------|------------|----------------|
| `mfa_secret` | users | AES-256-GCM | Per-tenant key in Secrets Manager |
| `sso_config` | tenant_configs | AES-256-GCM | Per-tenant key |
| oauth `refresh_token` (planned) | oauth_connections | AES-256-GCM | Per-user key |

Application-layer encryption uses Java `javax.crypto.Cipher` with a key derived from the tenant's encryption key + a per-field salt.

---

## 5. Encryption-at-Rest Plan

| Layer | Mechanism |
|-------|-----------|
| PostgreSQL RDS | AWS RDS at-rest encryption (AES-256) via AWS KMS |
| Redis (ElastiCache) | At-rest encryption enabled + TLS in-transit |
| S3 (imports, attachments, exports) | SSE-S3 (AES-256) on all buckets; no public access |
| Kubernetes Secrets | etcd encrypted at rest (AWS EKS default) |
| Developer workstations | Full-disk encryption required (FileVault/BitLocker) |

---

## 6. Transport Security

- **TLS 1.3** enforced on all external endpoints (Cloudflare terminates, then re-encrypts to origin)
- **HSTS** header: `max-age=31536000; includeSubDomains; preload`
- Internal pod-to-pod: mTLS via Istio service mesh (planned Phase 17)
- Redis: TLS enabled, auth token required
- PostgreSQL: `sslmode=require` in JDBC URL

---

## 7. OWASP Top 10 Mitigation Checklist

| # | Risk | OpsNext Mitigation |
|---|------|--------------------|
| A01 | Broken Access Control | RBAC on every endpoint; scope=OWN enforced at query layer; tenant isolation via schema search_path |
| A02 | Cryptographic Failures | RS256 JWT; bcrypt(12) passwords; AES-256-GCM for sensitive fields; TLS 1.3 everywhere; no MD5/SHA-1 |
| A03 | Injection | All SQL via `TenantJdbcTemplate.query()` with `?` placeholders (no string concatenation); JPA parameterised queries; Jakarta Bean Validation on all DTOs |
| A04 | Insecure Design | STRIDE threat model (see THREAT_MODEL.md); phase-gate security review before each GA release |
| A05 | Security Misconfiguration | Spring Security stateless config; CORS strict allowlist; no default credentials; Docker Compose uses non-root users |
| A06 | Vulnerable Components | Gradle dependency scanning via `./gradlew dependencyCheckAnalyze` (OWASP Dependency-Check); npm audit in CI; Renovate for automated dependency updates |
| A07 | Auth & Session Failures | JWT deny-list on logout; refresh token rotation; account lockout; httpOnly cookies; MFA (Phase 3) |
| A08 | Software & Data Integrity | Signed Docker images (Cosign); Gradle dependency checksum verification; GitHub Actions OIDC (no long-lived secrets in CI) |
| A09 | Security Logging & Monitoring | All auth events logged to audit_logs; Sentry error tracking; Prometheus alerts on auth error spikes; OpenTelemetry trace IDs in all logs |
| A10 | SSRF | No user-supplied URLs are fetched server-side except webhook delivery (allowlist: HTTPS only, no private IP ranges, 10s timeout, no redirects) |

---

## 8. GDPR Compliance Checklist

| GDPR Article | Requirement | OpsNext Implementation |
|--------------|-------------|----------------------|
| Art. 5 | Lawful basis for processing | `consent_given_at` + `consent_source` on contacts; email opt-out flag |
| Art. 13/14 | Privacy notice | Privacy Policy linked from registration page and login footer |
| Art. 15 | Right of access (export) | `GET /api/v1/users/me/export` — JSON export of all user data (Phase 15) |
| Art. 17 | Right to erasure | `POST /api/v1/users/me/delete` — anonymises user PII; retains pseudonymised audit logs |
| Art. 18 | Right to restrict processing | Account deactivation pauses data processing (Phase 15) |
| Art. 20 | Data portability | Export endpoints produce standard JSON and CSV formats |
| Art. 25 | Data protection by design | Schema-per-tenant isolation; `deleted_at` soft deletes; minimal data collection |
| Art. 30 | Records of processing | Internal DPA register maintained (separate document) |
| Art. 32 | Security of processing | See Sections 4, 5, 6 of this document |
| Art. 33 | Breach notification | Incident response plan (72h notification SLA); Sentry alerting |
| Art. 37 | DPO designation | Named DPO required for EU operations (to be appointed pre-GA) |

### Data Residency

- EU tenants: deployed to eu-central-1 (Frankfurt)
- US tenants: deployed to us-east-1 (Virginia)
- Data residency setting in `TenantConfig`; enforced at tenant provisioning time

### Data Retention

| Data Type | Retention | After Expiry |
|-----------|-----------|--------------|
| Active tenant data | Until account deletion | Soft delete → anonymise after 90 days |
| Audit logs | 7 years | Monthly partition drop |
| Email logs (Resend) | 30 days | Auto-purged by Resend |
| Webhook delivery logs | 30 days | Deleted by cleanup job |
| Import files (S3) | 90 days | S3 lifecycle rule to Glacier, then delete |
| Session tokens | Until expiry | Auto-deleted by cleanup job |

---

## 9. Security Headers

All API responses include:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Cache-Control: no-store (on authenticated endpoints)
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

Frontend (Next.js) additionally sets:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}';
  img-src 'self' data: https://opsnext-attachments-*.s3.amazonaws.com;
  connect-src 'self' https://api.opsnext.io;
  font-src 'self';
  style-src 'self' 'unsafe-inline';
  frame-ancestors 'none'
```

---

## 10. Rate Limiting & DDoS Protection

### Layer 1 — Cloudflare WAF

- Bot management (JS challenge on suspicious traffic)
- OWASP managed ruleset enabled
- Rate limit: 1,000 requests/minute per IP on all API endpoints; 10/minute on auth endpoints

### Layer 2 — Spring Application Rate Limiter (Planned Phase 12)

Redis-backed bucket-per-tenant-per-tier:

| Tier | Requests/minute | Burst |
|------|----------------|-------|
| BASIC | 100 | 200 |
| PROFESSIONAL | 500 | 1000 |
| ENTERPRISE | 2000 | 4000 |

Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`.

### Layer 3 — Specific Endpoint Limits

| Endpoint | Limit |
|----------|-------|
| POST /auth/login | 10/min per IP |
| POST /auth/forgot-password | 3/hour per email |
| POST /auth/resend-verification | 3/hour per email |
| POST /platform/tenants/register | 5/hour per IP |

---

## 11. Penetration Test Plan

### Scope

- API: `https://api.opsnext.io/api/v1/**`
- Frontend: `https://app.opsnext.io`
- Authentication flows, RBAC enforcement, multi-tenant isolation

### Timeline

- Phase 1 (internal): OWASP ZAP automated scan + manual review before Phase 5 completion
- Phase 2 (external pentest): Before GA launch (week 35-36); external firm TBD
- Ongoing: Monthly automated scans via OWASP ZAP in CI; quarterly manual review

### Tooling

| Tool | Purpose |
|------|---------|
| OWASP ZAP | Automated web app scan |
| Burp Suite Professional | Manual web app testing |
| SQLMap | SQL injection testing |
| JWT_Tool | JWT attack simulation |
| Metasploit | Exploitation framework (controlled env) |

### Findings Remediation SLA

| Severity | Remediation Target |
|----------|--------------------|
| Critical | 24 hours |
| High | 7 days |
| Medium | 30 days |
| Low | 90 days / next release |
