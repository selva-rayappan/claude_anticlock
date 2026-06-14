# ADR-008 — JWT Signing: RS256 Asymmetric vs HS256 Symmetric

**Date:** 2026-06-11  
**Status:** Accepted  
**Deciders:** Lead Architect, Security Lead  

---

## Context

JWTs must be signed so that the API server can verify they haven't been tampered with. Two primary options:

1. **HS256** — symmetric HMAC-SHA256: same secret used to sign and verify; simple, fast
2. **RS256** — asymmetric RSA-SHA256: private key signs, public key verifies; enables external verification

---

## Decision

**Use RS256 (asymmetric RSA-SHA256) for all JWT signing.**

- 2048-bit RSA key pair stored in AWS Secrets Manager
- Private key: only held by the API server (injected at startup)
- Public key: exposed at `/api/v1/.well-known/jwks.json` (JWKS endpoint)
- Key rotation: new key pair created, both keys active during rotation window (grace period), old key retired after all active tokens expire

---

## Consequences

**Positive:**
- External services (Excel Add-in, PowerApps Connector, Salesforce sync) can verify OpsNext JWTs independently using the public JWKS endpoint — no shared secret required
- If a service is compromised, the private key is not exposed from the verifying service's side
- Standard OIDC-compatible — enables OpsNext to act as an identity provider in Phase 3
- Key rotation is possible without requiring all users to re-login (dual-key JWKS window)

**Negative:**
- RS256 signature verification is ~4–10× slower than HS256 (RSA math vs HMAC)
- Key pair management is more complex than a shared secret
- Private key must be carefully secured in Secrets Manager and injected only into the API server

**Performance impact:** At 10,000 req/sec with cached JWT verification (public key loaded at startup), the additional latency is negligible. JJWT caches the parsed key internally.

---

## Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| HS256 | Adequate for services with no external verifiers, but OpsNext's integration requirements (Excel Add-in, PowerApps, third-party webhooks) require external JWT verification capability |
| ES256 (ECDSA) | More compact signatures and faster than RSA, but Java ecosystem support is slightly less mature than RS256; RSA is universally supported by all JWT libraries |
