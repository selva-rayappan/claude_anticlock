# OpsNext CRM — API Specification

**Document Version:** 1.0  
**Status:** Draft  
**Date:** 2026-06-11  
**Reference:** EXECUTION_PLAN.md TASK-003, TASK-043

Live Swagger UI (local): http://localhost:3001/swagger-ui.html  
Live OpenAPI JSON (local): http://localhost:3001/api-docs

---

## 1. API Design Principles

- All routes under `/api/v1/`
- REST (primary) + GraphQL (Phase 2 via Mercurius/Spring for GraphQL)
- JSON request and response bodies
- Standard response envelope on all endpoints
- Cursor-based pagination for entity lists
- Semantic versioning; `Sunset` header on deprecated endpoints

---

## 2. Authentication

### JWT Bearer Token

```
Authorization: Bearer <access_token>
```

Access tokens are RS256-signed JWTs. Obtain via login or refresh.

Payload:
```json
{
  "sub": "user-id",
  "tenantId": "tenant-id",
  "email": "user@acme.com",
  "roles": ["SALES_REP"],
  "tier": "PROFESSIONAL",
  "iat": 1718000000,
  "exp": 1718028800
}
```

### API Key (Machine-to-Machine)

```
X-API-Key: on_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

API keys are scoped to a tenant and a set of permissions. Created by Tenant Admins.

### JWKS Endpoint

```
GET /api/v1/.well-known/jwks.json
```

Returns the public key set for external JWT verification.

---

## 3. Standard Response Envelope

### Success

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 142,
    "nextCursor": "eyJpZCI6Inh4eCJ9"
  }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "CONTACT_NOT_FOUND",
    "message": "Contact abc123 does not exist in this tenant",
    "details": [],
    "traceId": "4f3a2b1c-..."
  }
}
```

### Validation Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "email", "message": "must be a valid email address" },
      { "field": "firstName", "message": "must not be blank" }
    ],
    "traceId": "4f3a2b1c-..."
  }
}
```

---

## 4. Pagination

All list endpoints use cursor-based pagination:

```
GET /api/v1/contacts?limit=25&cursor=eyJpZCI6Inh4eCJ9
```

Response includes `meta.nextCursor` (null when no more pages) and `meta.total`.

Default `limit`: 25. Maximum `limit`: 100.

---

## 5. Filtering & Sorting

```
GET /api/v1/contacts?filter[status]=ACTIVE&filter[tags][]=vip&sort=createdAt&order=desc
```

Operators for field filters (via `filter[field][op]=value`):

| Operator | Meaning |
|----------|---------|
| `eq` | Equals (default) |
| `neq` | Not equals |
| `contains` | Substring match |
| `starts_with` | Prefix match |
| `gt` / `lt` | Greater / less than |
| `gte` / `lte` | Greater/less than or equal |
| `in` | Value in list |
| `between` | Range (two values) |
| `is_null` / `is_not_null` | Null check |

---

## 6. Rate Limiting

Headers on every response:

```
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 487
X-RateLimit-Reset: 1718000060
```

When exceeded:

```
HTTP 429 Too Many Requests
Retry-After: 45
```

Limits per subscription tier:

| Tier | Limit |
|------|-------|
| Basic | 500 req/min |
| Professional | 2,000 req/min |
| Enterprise | 5,000 req/min |

---

## 7. Endpoint Reference

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | None | Register new user |
| POST | `/api/v1/auth/login` | None | Login, get JWT |
| POST | `/api/v1/auth/refresh` | Cookie | Rotate refresh token |
| POST | `/api/v1/auth/logout` | Bearer | Revoke session |
| POST | `/api/v1/auth/forgot-password` | None | Send reset email |
| POST | `/api/v1/auth/reset-password` | None | Reset via token |
| GET | `/api/v1/auth/verify-email` | None | Verify email link |
| POST | `/api/v1/auth/mfa/enrol/totp` | Bearer | Begin TOTP enrolment |
| POST | `/api/v1/auth/mfa/verify-totp` | Bearer | Activate TOTP |
| POST | `/api/v1/auth/mfa/challenge` | Partial | Complete MFA step |

### Tenant Registration

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/platform/tenants/register` | None | Self-service tenant signup |
| GET | `/api/v1/platform/tenants/check-slug` | None | Check slug availability |

### Contacts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/contacts` | Bearer | List contacts (paginated) |
| POST | `/api/v1/contacts` | Bearer | Create contact |
| GET | `/api/v1/contacts/:id` | Bearer | Get contact by ID |
| PUT | `/api/v1/contacts/:id` | Bearer | Update contact |
| DELETE | `/api/v1/contacts/:id` | Bearer | Soft-delete contact |
| DELETE | `/api/v1/contacts/bulk` | Bearer | Bulk soft-delete (max 100) |
| POST | `/api/v1/contacts/:id/merge/:duplicateId` | Bearer | Merge duplicate contacts |
| PUT | `/api/v1/contacts/:id/tags` | Bearer | Replace contact tags |
| GET | `/api/v1/contacts/export` | Bearer | Export to CSV/XLSX |

### Accounts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/accounts` | Bearer | List accounts |
| POST | `/api/v1/accounts` | Bearer | Create account |
| GET | `/api/v1/accounts/:id` | Bearer | Get account |
| PUT | `/api/v1/accounts/:id` | Bearer | Update account |
| DELETE | `/api/v1/accounts/:id` | Bearer | Soft-delete account |
| GET | `/api/v1/accounts/:id/contacts` | Bearer | Contacts for account |

### Leads

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/leads` | Bearer | List leads |
| POST | `/api/v1/leads` | Bearer | Create lead |
| GET | `/api/v1/leads/:id` | Bearer | Get lead |
| PUT | `/api/v1/leads/:id` | Bearer | Update lead |
| DELETE | `/api/v1/leads/:id` | Bearer | Soft-delete lead |
| POST | `/api/v1/leads/:id/convert` | Bearer | Convert to Contact/Account/Opportunity |

### Opportunities

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/opportunities` | Bearer | List opportunities |
| POST | `/api/v1/opportunities` | Bearer | Create opportunity |
| GET | `/api/v1/opportunities/:id` | Bearer | Get opportunity |
| PUT | `/api/v1/opportunities/:id` | Bearer | Update opportunity |
| PATCH | `/api/v1/opportunities/:id/stage` | Bearer | Move stage (Kanban) |
| POST | `/api/v1/opportunities/:id/close` | Bearer | Close Won / Lost |
| DELETE | `/api/v1/opportunities/:id` | Bearer | Soft-delete |

### Activities

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/activities` | Bearer | Log activity |
| GET | `/api/v1/entities/:type/:id/activities` | Bearer | Timeline for entity |
| PUT | `/api/v1/activities/:id` | Bearer | Edit activity (within 24h) |
| DELETE | `/api/v1/activities/:id` | Bearer | Soft-delete activity |

### Pipeline / Board

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/pipelines/:id/board` | Bearer | Kanban board data |
| GET | `/api/v1/pipelines/:id/summary` | Bearer | Pipeline aggregates |

### Search

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/search` | Bearer | Global cross-entity search |

### Webhooks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/webhooks` | Bearer | List subscriptions |
| POST | `/api/v1/webhooks` | Bearer | Create subscription |
| DELETE | `/api/v1/webhooks/:id` | Bearer | Delete subscription |
| GET | `/api/v1/webhooks/:id/deliveries` | Bearer | Delivery log |

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Load balancer health check |
| GET | `/api/v1/health` | None | Detailed health |
| GET | `/actuator/health` | None | Spring Boot actuator |

---

## 8. Webhook Payload Schema

```json
{
  "eventId": "evt_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "eventType": "contact.created",
  "tenantId": "tenant-acme",
  "timestamp": "2026-06-15T10:30:00Z",
  "data": { ... },
  "signature": "sha256=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

Verify signature:

```
HMAC-SHA256(secret, eventId + "." + timestamp + "." + JSON.stringify(data))
```

---

## 9. Error Code Registry

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Request body/query param validation failed |
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `FORBIDDEN` | 403 | Authenticated but insufficient permissions |
| `NOT_FOUND` | 404 | Resource does not exist in this tenant |
| `CONFLICT` | 409 | Duplicate resource (e.g., email already exists) |
| `RATE_LIMITED` | 429 | Tenant rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected server error (traceId provided) |
