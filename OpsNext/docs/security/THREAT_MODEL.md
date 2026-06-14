# OpsNext CRM — Threat Model

**Document Version:** 1.0  
**Status:** APPROVED  
**Prepared By:** Security Lead  
**Date:** 2026-06-14  
**Classification:** Internal — Confidential  
**Methodology:** STRIDE  
**Reference:** SECURITY_ARCHITECTURE.md, FUNCTIONAL_REQUIREMENTS.md  
**Traceability:** TASK-004

---

## Threat Model Scope

This document covers the following attack surfaces:

1. User authentication flows (login, register, token refresh, MFA)
2. Tenant registration and provisioning
3. REST API endpoints (CRM data access)
4. Data import pipeline (file upload)
5. Webhook delivery (outbound HTTP)
6. Admin operations (platform admin, tenant admin)
7. Infrastructure (network, container, database)

---

## STRIDE Analysis

STRIDE categories: **S**poofing, **T**ampering, **R**epudiation, **I**nformation Disclosure, **D**enial of Service, **E**levation of Privilege.

---

## 1. Authentication Flows

### 1.1 Login Endpoint (POST /api/v1/auth/login)

| ID | Threat | STRIDE | Likelihood | Impact | Mitigation | Status |
|----|--------|--------|------------|--------|------------|--------|
| T-001 | Attacker submits stolen credentials (credential stuffing) | S | High | High | Account lockout after 5 failures; rate limit 10/min per IP; MFA (Phase 3) | Implemented |
| T-002 | Brute-force password against single account | S | Medium | High | Account lockout (15 min after 5 failures); bcrypt(12) makes each attempt slow | Implemented |
| T-003 | Email enumeration via different error messages for "user not found" vs "wrong password" | I | Medium | Low | Both cases return identical 401 response and timing (constant-time compare) | Implemented |
| T-004 | JWT token forged by attacker | S | Low | Critical | RS256 asymmetric signing — only private key (in Secrets Manager) can sign; public key used for verification | Implemented |
| T-005 | JWT stolen from localStorage (XSS) | I | Medium | Critical | Access token in memory only (not localStorage); refresh token in httpOnly cookie (JS cannot access) | Implemented |
| T-006 | Refresh token stolen from cookie | S | Low | High | SameSite=Strict prevents CSRF; Secure flag prevents non-HTTPS; rotation invalidates stolen token after one use | Implemented |
| T-007 | Replay of revoked access token | S | Low | High | JTI deny-list in Redis with TTL = remaining token expiry | Implemented |

### 1.2 Tenant Registration (POST /api/v1/platform/tenants/register)

| ID | Threat | STRIDE | Likelihood | Impact | Mitigation | Status |
|----|--------|--------|------------|--------|------------|--------|
| T-010 | Mass automated tenant creation (abuse free trial) | DoS | Medium | Medium | Rate limit 5/hour per IP; Cloudflare bot score challenge | Planned (Phase 12) |
| T-011 | Slug squatting (reserve all good slugs) | DoS | Low | Medium | Reserved words list; rate limit on registration | Partial |
| T-012 | Schema injection via malicious org name / slug | T | Low | Critical | Slug validated as `^[a-z0-9-]{3,63}$` in service layer; schema name derived from slug (never from raw input) | Implemented |
| T-013 | Tenant schema creation fails midway, leaving partial state | T | Low | Medium | `TenantProvisioningService` uses transactions; partial schema cleaned up on failure | Implemented |

### 1.3 Token Refresh

| ID | Threat | STRIDE | Likelihood | Impact | Mitigation | Status |
|----|--------|--------|------------|--------|------------|--------|
| T-015 | Refresh token replay after logout | S | Low | High | Revoked tokens have `revoked_at` set; lookup checks `revoked_at IS NULL` | Implemented |
| T-016 | Parallel refresh race condition (two simultaneous refresh requests with same token) | T | Low | Medium | DB-level unique constraint on `token_hash`; second insert fails → 401 | Implemented |

---

## 2. API Endpoints (CRM Data Access)

### 2.1 Cross-Tenant Data Access

| ID | Threat | STRIDE | Likelihood | Impact | Mitigation | Status |
|----|--------|--------|------------|--------|------------|--------|
| T-020 | Authenticated user accesses another tenant's data (IDOR) | E | Low | Critical | `search_path` set to requesting tenant's schema per-request; impossible to query cross-schema via TenantJdbcTemplate without explicit schema prefix | Implemented |
| T-021 | JWT with manipulated `tenantId` claim | S/E | Low | Critical | JWT is RS256-signed; any modification invalidates signature | Implemented |
| T-022 | A user within a tenant accesses another user's records (OWN scope bypass) | E | Medium | High | `scope=OWN` enforced at query layer with `AND owner_id = ?` appended by service | Planned (Phase 5) |

### 2.2 Injection Attacks

| ID | Threat | STRIDE | Likelihood | Impact | Mitigation | Status |
|----|--------|--------|------------|--------|------------|--------|
| T-025 | SQL injection via API parameters | T | Low | Critical | All queries use `TenantJdbcTemplate.query(sql, params)` with `?` placeholders; never string-concatenated SQL | Implemented |
| T-026 | NoSQL injection via JSONB custom_fields filter | T | Low | High | JSONB operators (`@>`, `?`) use parameterised values; filter tree parsed as typed AST, not raw SQL | Planned (Phase 5) |
| T-027 | XSS via stored rich-text fields (activity body, notes) | T | Medium | Medium | Frontend: React auto-escapes; API: HTML sanitised via OWASP Java HTML Sanitizer before storage | Planned (Phase 7) |
| T-028 | Path traversal in file download | T | Low | High | File URLs are pre-signed S3 URLs generated server-side; no user-controlled file path | Planned (Phase 7) |

### 2.3 SSRF

| ID | Threat | STRIDE | Likelihood | Impact | Mitigation | Status |
|----|--------|--------|------------|--------|------------|--------|
| T-030 | SSRF via webhook delivery URL pointing to internal services | T | Medium | High | Webhook URLs validated: HTTPS only, DNS resolved, RFC 1918 / loopback addresses blocked, no redirects followed | Planned (Phase 10) |
| T-031 | SSRF via SSO callback URL manipulation | T | Low | Medium | OAuth callback URL is pre-registered, not user-supplied | Planned (Phase 3) |

---

## 3. Data Import Pipeline

| ID | Threat | STRIDE | Likelihood | Impact | Mitigation | Status |
|----|--------|--------|------------|--------|------------|--------|
| T-035 | Malicious file upload (CSV with embedded macros, zip bomb) | T | Medium | Medium | File type validated by magic bytes (not extension); size limited to 50 MB; parsed as plain text by worker | Planned (Phase 13) |
| T-036 | CSV injection (formulas in cells targeting spreadsheet clients) | T | Medium | Low | Export: prepend tab `\t` before `=`, `+`, `-`, `@` at start of cell values | Planned (Phase 13) |
| T-037 | DoS via extremely large import triggering OOM | DoS | Low | Medium | File size limit 50 MB; worker processes in chunks of 500 rows; memory limits on worker pod | Planned (Phase 13) |
| T-038 | Import job enqueued by user then user deactivated; job runs with elevated data | E | Low | Low | Import job records `created_by`; permissions checked at job creation time, not execution | Planned (Phase 13) |

---

## 4. Admin Operations

### 4.1 Tenant Admin Panel

| ID | Threat | STRIDE | Likelihood | Impact | Mitigation | Status |
|----|--------|--------|------------|--------|------------|--------|
| T-040 | Tenant admin creates a SUPER_ADMIN role with all permissions and assigns it to themselves maliciously | E | Low | High | System roles (`is_system=true`) cannot be modified; only role assignments can change; audit log tracks all role changes | Implemented |
| T-041 | Tenant admin invites a user with the wrong role by mistake | E | High | Low | Invite shows role preview before sending; audit log records the assignment | Planned (Phase 4) |

### 4.2 Platform Admin Panel

| ID | Threat | STRIDE | Likelihood | Impact | Mitigation | Status |
|----|--------|--------|------------|--------|------------|--------|
| T-045 | Platform admin account compromised → access to all tenants | E | Low | Critical | Platform admin requires MFA (enforced); platform admins stored in `public.platform_admins` (separate table, separate auth path); impersonation actions triple-logged | Planned (Phase 4) |
| T-046 | Impersonation audit log bypass | R | Low | High | Audit log is append-only; no DELETE permissions granted on audit_logs table in database | Implemented |

---

## 5. Infrastructure Threats

| ID | Threat | STRIDE | Likelihood | Impact | Mitigation | Status |
|----|--------|--------|------------|--------|------------|--------|
| T-050 | Attacker gains shell access to API pod | E | Low | Critical | Non-root container user; read-only root filesystem; no ssh; ECR image scanning; Falco (Phase 17) | Partial |
| T-051 | Database credential leak via environment variable | I | Low | Critical | Secrets injected via External Secrets Operator into Kubernetes Secret; not visible in pod spec | Planned |
| T-052 | Redis cache poisoning (attacker injects false tenant slug cache) | T | Very Low | High | Redis auth token required; accessible only within private VPC; VPC NetworkPolicy restricts pod access | Planned |
| T-053 | Cross-tenant cache collision (Redis key clash) | T | Very Low | Critical | All Redis keys are namespaced: `perm:{tenantId}:{userId}`, `tenant:slug:{slug}`, `jti_deny:{jti}` — no overlap possible | Implemented |
| T-054 | Stolen JWT public key → forge tokens against other services | I | Very Low | Low | Public key is at known JWKS endpoint; forged tokens still fail tenant validation and Redis deny-list | Implemented |
| T-055 | Supply chain attack via compromised Gradle/npm dependency | T | Low | Critical | OWASP Dependency-Check in CI; Renovate for updates; Gradle dependency verification checksums | Partial |

---

## 6. Non-Repudiation Controls

| Action | Audit Trail | Immutability |
|--------|-------------|--------------|
| User login / logout | Auth events in `audit_logs` (action=LOGIN) | Append-only table |
| Entity CREATE / UPDATE / DELETE | `audit_logs` with before/after JSONB | Append-only |
| Role assignment changes | `audit_logs` | Append-only |
| Platform admin impersonation | `audit_logs` with impersonator ID | Append-only |
| API key issuance | `audit_logs` | Append-only |
| Tenant provisioning | `audit_logs` | Append-only |

The `audit_logs` table grants only INSERT to the application service account. SELECT is granted for audit queries. UPDATE and DELETE are never granted.

---

## 7. Trust Boundary Map

```
[Internet / Untrusted]
        │
  [Cloudflare WAF]          ← Rate limiting, OWASP rules, bot management
        │
  [AWS ALB]                 ← TLS termination (ACM certificate)
        │
[Private VPC — Trusted]
        │
  [NGINX Ingress] ──────────[EKS Pods: API / Web]
                                     │
                            [Private Subnet]
                                     │
                    ┌────────────────┼─────────────────┐
                    │                │                  │
               [RDS PostgreSQL] [ElastiCache Redis] [Typesense]
                    │
             [Isolated Subnet]
```

**Trust levels:**
- Everything outside Cloudflare WAF: Untrusted (zero trust)
- Inside VPC, within pod-to-service NetworkPolicy: Trusted (but still authenticated at app layer)
- RDS/Redis/Typesense: Trusted with network-level access control only (IAM auth for RDS planned Phase 17)

---

## 8. Residual Risks & Accepted Risks

| Risk | Rationale for Acceptance | Owner | Review Date |
|------|--------------------------|-------|-------------|
| No MFA on initial launch (Phase 1) | MFA planned Phase 3; access token expiry (8h) + account lockout provide baseline | Security Lead | Phase 3 launch |
| Single-region initially | Multi-region DR planned Phase 17; RTO 4h acceptable for early customers | DevOps Lead | Phase 17 |
| Platform admin MFA not yet enforced | Platform admins are internal team only during phases 1-4 | Security Lead | Phase 4 |
| SAML 2.0 not yet supported | Enterprise SSO customer requirement; planned Phase 3 | Product | Phase 3 |
