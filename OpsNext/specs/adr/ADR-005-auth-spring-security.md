# ADR-005 — Auth: Spring Security 6 + JJWT vs Lucia Auth

**Date:** 2026-06-11  
**Status:** Accepted  
**Deciders:** Lead Architect, Security Lead  
**Depends On:** ADR-001 (Java runtime)

---

## Context

OpsNext requires:
- Email/password login with account lockout
- JWT-based session management (access token + refresh token rotation)
- MFA (TOTP + backup codes)
- OAuth 2.0 / OIDC SSO (Google, Microsoft Entra ID)
- SAML 2.0 SSO for enterprise tenants
- API key authentication for machine-to-machine integrations
- RBAC permission enforcement on every endpoint

The original plan used Lucia Auth + Arctic (TypeScript). With a Java backend, Spring Security is the natural choice.

---

## Decision

**Use Spring Security 6.4 + JJWT 0.12.6 for all authentication and authorisation.**

- Spring Security filter chain: `CorsFilter → RateLimitFilter → JwtAuthFilter → TenantFilter`
- JJWT 0.12.6 for JWT generation (`RS256`, 8h access token) and validation
- Spring Security's `BCryptPasswordEncoder` (rounds=12) for password hashing
- `OncePerRequestFilter` implementations for JWT auth and tenant resolution
- `SecurityContextHolder` holds `SecurityPrincipal` record per request
- Redis token deny-list for logout and refresh token revocation
- Spring Security OAuth2 Client for SSO flows (Phase 3)
- `spring-security-saml2` for SAML 2.0 (Phase 3)

---

## Consequences

**Positive:**
- 20-year production track record at enterprise scale; used in banking, government, and Fortune 500 systems
- Built-in BCrypt, password encoding, security context propagation
- Method-level security (`@PreAuthorize`) available for declarative RBAC in Phase 3
- Spring Security OAuth2 Client handles Google, Microsoft PKCE flows with minimal custom code
- `spring-security-saml2` is first-party SAML support — no third-party adapter risk
- Spring's security test support (`@WithMockUser`, `SecurityMockMvcRequestPostProcessors`) makes auth integration testing straightforward

**Negative:**
- More boilerplate than Lucia for simple username/password flows: filter chain configuration, `UserDetailsService` implementation, `AuthenticationManager` wiring
- RS256 key management: asymmetric key pair (private key for signing, public key for verification at `/api/v1/.well-known/jwks.json`); key rotation requires coordinated deployment
- `SecurityContextHolder` uses `ThreadLocal` by default; with Virtual Threads, `InheritableThreadLocal` propagation must be verified

**Mitigations:**
- RS256 key pair stored in AWS Secrets Manager; JWKS endpoint enables external services to verify tokens without shared secret
- Virtual thread compatibility: Spring Boot 3.2+ configures `SecurityContextHolder` with `MODE_INHERITABLETHREADLOCAL` when virtual threads are enabled — verified in implementation

---

## Implementation Details

```
JWT Payload:
{
  "sub": "usr_01j2k3...",
  "tenantId": "tenant_acme",
  "email": "user@example.com",
  "roles": ["SALES_REP"],
  "iat": 1749000000,
  "exp": 1749028800,   // +8h
  "jti": "jwt_01j2k3..." // for deny-list on logout
}

Refresh Token:
- Opaque UUID stored in HttpOnly, Secure, SameSite=Strict cookie
- Server-side record in tenant schema `sessions` table (hashed)
- Redis: SET refresh:{jti} "valid" EX 2592000 (30 days)
- Rotated on every use (old token invalidated, new token issued)
```

---

## Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| Lucia Auth (Java port) | No Java port exists; Lucia is TypeScript-only |
| Keycloak | Complete IdP — powerful but adds a separate service to deploy, configure, and maintain; disproportionate complexity for Phase 1; complicates per-tenant SSO config |
| Auth0 / Okta | SaaS costs are prohibitive at 10,000 tenant scale; also loses control over per-tenant isolation |
| Nimbus JOSE + JWT | Valid JWT library but lacks Spring Security's filter chain integration; would require same amount of custom code as JJWT |
