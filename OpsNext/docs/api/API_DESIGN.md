# OpsNext CRM — API Design Document

**Document Version:** 1.0  
**Status:** APPROVED  
**Prepared By:** Lead Backend Engineer  
**Date:** 2026-06-14  
**Classification:** Internal — Confidential  
**Reference Documents:** DATABASE_DESIGN.md, TAD.md, FUNCTIONAL_REQUIREMENTS.md  
**Traceability:** TASK-003

---

## Table of Contents

1. [REST API Resource Taxonomy](#1-rest-api-resource-taxonomy)
2. [URL & Versioning Conventions](#2-url--versioning-conventions)
3. [Request / Response Envelope](#3-request--response-envelope)
4. [Pagination Standard](#4-pagination-standard)
5. [Filtering & Sorting Specification](#5-filtering--sorting-specification)
6. [Bulk Endpoints Design](#6-bulk-endpoints-design)
7. [Webhook Payload Schema](#7-webhook-payload-schema)
8. [Rate Limiting Headers](#8-rate-limiting-headers)
9. [Error Code Registry](#9-error-code-registry)
10. [Complete Endpoint Inventory](#10-complete-endpoint-inventory)
11. [GraphQL Schema Draft](#11-graphql-schema-draft)

---

## 1. REST API Resource Taxonomy

All resources are structured as: `/api/v1/{collection}[/{id}[/{sub-resource}]]`

### Top-Level Resources

| Resource | Base Path | Entity |
|----------|-----------|--------|
| Health | `/api/v1/health` | Infrastructure health checks |
| Auth | `/api/v1/auth` | Authentication flows |
| Platform Tenants | `/api/v1/platform/tenants` | Tenant lifecycle (registration, config) |
| Contacts | `/api/v1/contacts` | Contact records |
| Accounts | `/api/v1/accounts` | Account/Company records |
| Leads | `/api/v1/leads` | Lead records |
| Opportunities | `/api/v1/opportunities` | Deal records |
| Pipelines | `/api/v1/pipelines` | Pipeline definitions |
| Activities | `/api/v1/activities` | Activity log entries |
| Tasks | `/api/v1/tasks` | Task management |
| Workflows | `/api/v1/workflows` | Automation rules |
| Notifications | `/api/v1/notifications` | In-app notifications |
| Webhooks | `/api/v1/webhooks` | Outbound webhook subscriptions |
| Imports | `/api/v1/imports` | CSV/XLSX import jobs |
| Segments | `/api/v1/segments` | Saved filter segments |
| Search | `/api/v1/search` | Global search (Typesense) |
| Reports | `/api/v1/reports` | Analytics and custom reports |
| Admin (Tenant) | `/api/v1/admin` | Tenant admin operations |
| Admin (Platform) | `/api/v1/platform-admin` | Platform-level admin (internal) |
| API Keys | `/api/v1/admin/api-keys` | Machine-to-machine keys |

### Nested Sub-Resources

| Parent | Sub-resource | Path |
|--------|-------------|------|
| Contacts | Activities | `/api/v1/contacts/:id/activities` |
| Contacts | Tasks | `/api/v1/contacts/:id/tasks` |
| Contacts | Tags | `/api/v1/contacts/:id/tags` |
| Contacts | Merge | `/api/v1/contacts/:id/merge/:duplicateId` |
| Accounts | Contacts | `/api/v1/accounts/:id/contacts` |
| Accounts | Opportunities | `/api/v1/accounts/:id/opportunities` |
| Leads | Convert | `/api/v1/leads/:id/convert` |
| Opportunities | Stage | `/api/v1/opportunities/:id/stage` |
| Opportunities | Close | `/api/v1/opportunities/:id/close` |
| Pipelines | Board | `/api/v1/pipelines/:id/board` |
| Pipelines | Summary | `/api/v1/pipelines/:id/summary` |
| Workflows | Executions | `/api/v1/workflows/:id/executions` |
| Webhooks | Deliveries | `/api/v1/webhooks/:id/deliveries` |
| Sequences | Enrol | `/api/v1/sequences/:id/enrol` |

---

## 2. URL & Versioning Conventions

### Version Prefix

All API endpoints are under `/api/v1/`. The version is in the URL path (not in a header).

When `v2` is introduced:
- `v1` endpoints continue to function for a minimum of 12 months
- A `Sunset` response header is added to deprecated `v1` endpoints: `Sunset: Sat, 14 Jun 2027 00:00:00 GMT`
- Clients receive a `Deprecation: true` header from the date of deprecation announcement

### Tenant Resolution

The `X-Tenant-Slug` request header specifies which tenant's data to operate on. This is validated on every authenticated request.

```
X-Tenant-Slug: acme-corp
```

Alternatively, if the API is accessed via subdomain (`acme-corp.api.opsnext.io`), the slug is extracted from the subdomain. Header takes precedence.

### ID Format

All IDs are UUIDs v4 represented as lowercase strings without hyphens in paths:

```
/api/v1/contacts/a3f8e9b2c1d04567890123456789abcd
```

Responses always include the hyphenated form: `"id": "a3f8e9b2-c1d0-4567-8901-23456789abcd"`.

---

## 3. Request / Response Envelope

### Success Response

```json
{
  "data": { ... },
  "meta": {
    "requestId": "req-4bf92f35",
    "timestamp": "2026-06-14T10:23:45.123Z"
  }
}
```

For list endpoints:
```json
{
  "data": [ ... ],
  "meta": {
    "requestId": "req-4bf92f35",
    "timestamp": "2026-06-14T10:23:45.123Z",
    "pagination": {
      "nextCursor": "eyJpZCI6ImFiYzEyMyJ9",
      "hasMore": true,
      "total": 1247
    }
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "CONTACT_NOT_FOUND",
    "message": "Contact with id 'abc123' not found.",
    "details": [],
    "traceId": "4bf92f3577b34da6a3ce929d0e0e4736"
  }
}
```

Validation error with multiple field errors:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [
      { "field": "email", "message": "must be a valid email address" },
      { "field": "firstName", "message": "must not be blank" }
    ],
    "traceId": "4bf92f3577b34da6a3ce929d0e0e4736"
  }
}
```

### HTTP Status Code Mapping

| Status | Used For |
|--------|---------|
| 200 OK | GET, PUT, PATCH success |
| 201 Created | POST creating a resource |
| 202 Accepted | Async operation queued (import, export) |
| 204 No Content | DELETE success |
| 400 Bad Request | Validation errors, malformed JSON |
| 401 Unauthorized | Missing or invalid JWT |
| 403 Forbidden | Valid JWT but insufficient permissions |
| 404 Not Found | Resource not found (or deleted) |
| 409 Conflict | Duplicate (email, slug) |
| 422 Unprocessable | Business rule violation (e.g. stage not in pipeline) |
| 429 Too Many Requests | Rate limit exceeded |
| 500 Internal Server Error | Unexpected server error |
| 503 Service Unavailable | Health check endpoint reporting degraded state |

---

## 4. Pagination Standard

OpsNext uses **cursor-based pagination** for all list endpoints. Offset pagination is not supported (it is inconsistent when records are inserted/deleted during traversal).

### Request Parameters

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `limit` | integer | 25 | 100 | Records per page |
| `cursor` | string | null | — | Opaque cursor from previous response |

### Cursor Format

The cursor is a Base64-encoded JSON object. Clients treat it as opaque.

```json
// Decoded cursor:
{ "id": "contact-abc123", "createdAt": "2026-06-14T10:23:45.123Z" }
// Encoded (URL-safe base64):
eyJpZCI6ImNvbnRhY3QtYWJjMTIzIiwiY3JlYXRlZEF0IjoiMjAyNi0wNi0xNFQxMDoyMzo0NS4xMjNaIn0
```

### SQL Implementation

```sql
-- Forward pagination (sort by created_at DESC, then id for tie-breaking)
WHERE (created_at, id) < (:cursor_created_at, :cursor_id)
  AND deleted_at IS NULL
ORDER BY created_at DESC, id DESC
LIMIT :limit + 1  -- Fetch one extra to determine hasMore
```

### Example Response

```json
{
  "data": [
    { "id": "...", "firstName": "Alice", ... },
    { "id": "...", "firstName": "Bob", ... }
  ],
  "meta": {
    "pagination": {
      "nextCursor": "eyJpZCI6ImJvYi0xMjMi...",
      "hasMore": true,
      "total": 2847
    }
  }
}
```

`total` is an approximate count (returned from a cached count, not a fresh `COUNT(*)`). It is clearly documented as approximate. For exact counts, use `GET /api/v1/contacts/count`.

---

## 5. Filtering & Sorting Specification

### Filter Parameter Format

```
GET /api/v1/contacts?filter[field][operator]=value
```

Multiple filters are combined with AND logic. OR logic is achieved via the segments API.

### Supported Operators

| Operator | SQL Equivalent | Types |
|----------|---------------|-------|
| `eq` | `= ?` | all |
| `neq` | `!= ?` | all |
| `contains` | `ILIKE '%?%'` (trigram index) | text |
| `starts_with` | `ILIKE '?%'` | text |
| `gt` | `> ?` | number, date |
| `lt` | `< ?` | number, date |
| `gte` | `>= ?` | number, date |
| `lte` | `<= ?` | number, date |
| `in` | `= ANY(?)` | all (comma-separated values) |
| `not_in` | `!= ALL(?)` | all |
| `between` | `BETWEEN ? AND ?` | number, date (value: "a,b") |
| `is_null` | `IS NULL` | all (no value needed) |
| `is_not_null` | `IS NOT NULL` | all |
| `array_contains` | `@> ARRAY[?]` | text[] (tags) |

### Standard Filterable Fields (Contacts)

```
filter[ownerId][eq]=usr-abc123
filter[status][eq]=ACTIVE
filter[tags][array_contains]=vip
filter[createdAt][gte]=2026-01-01
filter[createdAt][lte]=2026-06-30
filter[accountId][eq]=acc-xyz456
filter[source][in]=website,referral
```

### Custom Field Filtering

Custom fields use the `customFields.{field_key}` path:

```
filter[customFields.nps_score][gte]=8
filter[customFields.preferred_language][eq]=Spanish
```

### Sorting

```
sort=-createdAt,lastName
```

Prefix `-` = descending. No prefix = ascending. Multiple fields comma-separated. Only indexed fields are sortable (validated at service layer; 400 if invalid field).

**Default sort:** `-createdAt` (newest first) on all list endpoints.

---

## 6. Bulk Endpoints Design

### Bulk Create

```
POST /api/v1/contacts/bulk
Content-Type: application/json

{
  "records": [ {...}, {...}, ... ],
  "onDuplicate": "skip"  // or "update" or "error"
}
```

- Max: 100 records per request
- Processed atomically within a single transaction (all succeed or all fail)
- Response includes per-record outcome:

```json
{
  "data": {
    "created": 97,
    "skipped": 2,
    "failed": 1,
    "results": [
      { "index": 0, "status": "created", "id": "..." },
      { "index": 2, "status": "skipped", "reason": "DUPLICATE_EMAIL" },
      { "index": 5, "status": "failed", "error": "VALIDATION_ERROR", "details": [...] }
    ]
  }
}
```

### Bulk Delete

```
DELETE /api/v1/contacts/bulk
Content-Type: application/json

{ "ids": ["id1", "id2", "id3"] }
```

Max: 100 IDs per request. Soft delete. Returns 204 on full success; 207 Multi-Status if partial failure.

### Bulk Update

```
PUT /api/v1/contacts/bulk
Content-Type: application/json

{
  "ids": ["id1", "id2"],
  "patch": { "ownerId": "usr-new-owner", "tags": ["migrated"] }
}
```

Max: 100 IDs. Only specified fields are updated (PATCH semantics). AuditLog entry written per record.

---

## 7. Webhook Payload Schema

All webhook deliveries use this standard envelope:

```json
{
  "eventId": "evt-4bf92f3577b34da6",
  "eventType": "contact.created",
  "tenantId": "tenant-acme",
  "timestamp": "2026-06-14T10:23:45.123Z",
  "apiVersion": "v1",
  "data": {
    "id": "...",
    "firstName": "Alice",
    "lastName": "Smith",
    "email": "alice@example.com",
    ...
  }
}
```

### Event Types

| Domain | Events |
|--------|--------|
| Contact | `contact.created`, `contact.updated`, `contact.deleted`, `contact.merged` |
| Account | `account.created`, `account.updated`, `account.deleted` |
| Lead | `lead.created`, `lead.updated`, `lead.status_changed`, `lead.converted`, `lead.assigned` |
| Opportunity | `opportunity.created`, `opportunity.updated`, `opportunity.stage_changed`, `opportunity.closed` |
| Task | `task.created`, `task.completed`, `task.overdue` |
| User | `user.invited`, `user.activated`, `user.deactivated` |
| Import | `import.completed`, `import.failed` |
| Workflow | `workflow.triggered`, `workflow.failed` |

### Signature Verification

Each delivery includes a signature header:

```
X-OpsNext-Signature: sha256=<HMAC-SHA256(raw_body, webhook_secret)>
X-OpsNext-Event-Type: contact.created
X-OpsNext-Delivery: evt-4bf92f3577b34da6
X-OpsNext-Timestamp: 1718360625
```

**Verification (Java example):**
```java
String expected = "sha256=" + HmacUtils.hmacSha256Hex(secret, rawBody);
boolean valid = MessageDigest.isEqual(
    expected.getBytes(), 
    signatureHeader.getBytes()
);
```

Reject deliveries where `timestamp` is > 5 minutes old (replay protection).

---

## 8. Rate Limiting Headers

Included in every API response:

```
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 487
X-RateLimit-Reset: 1718360680
Retry-After: 55   (only on 429 responses)
```

Limits are per-tenant, per-tier, per-minute:

| Tier | Limit/min | Burst |
|------|-----------|-------|
| BASIC | 100 | 200 |
| PROFESSIONAL | 500 | 1000 |
| ENTERPRISE | 2000 | 4000 |
| Internal / Platform Admin | Unlimited | — |

Auth endpoints have separate, stricter limits independent of tenant tier.

---

## 9. Error Code Registry

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request body failed validation |
| `INVALID_JSON` | 400 | Malformed JSON body |
| `MISSING_TENANT` | 401 | X-Tenant-Slug header missing or unresolvable |
| `INVALID_TOKEN` | 401 | JWT expired, invalid signature, or in deny-list |
| `ACCOUNT_LOCKED` | 401 | User account locked due to failed login attempts |
| `EMAIL_NOT_VERIFIED` | 401 | User email not yet verified |
| `FORBIDDEN` | 403 | Valid auth but insufficient permissions |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `SOFT_DELETED` | 404 | Resource was soft-deleted (returned as 404 to clients) |
| `DUPLICATE_EMAIL` | 409 | Email already in use within this tenant |
| `DUPLICATE_SLUG` | 409 | Tenant slug already taken |
| `SLUG_RESERVED` | 409 | Slug is a reserved word |
| `STAGE_NOT_IN_PIPELINE` | 422 | stageId does not belong to the given pipelineId |
| `CANNOT_DELETE_DEFAULT_PIPELINE` | 422 | Tenant must always have a default pipeline |
| `SYSTEM_ROLE_IMMUTABLE` | 422 | Cannot modify or delete system roles |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected server error (traceId provided for support) |

---

## 10. Complete Endpoint Inventory

### Health (Implemented — Phase 1)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Basic health check |
| GET | `/api/v1/health` | None | DB + Redis health check |

### Auth (Implemented — Phase 1)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | None | Register new user in tenant |
| POST | `/api/v1/auth/login` | None | Login; returns JWT + sets refresh cookie |
| POST | `/api/v1/auth/logout` | Bearer | Revoke tokens |
| GET | `/api/v1/auth/me` | Bearer | Current user profile |
| POST | `/api/v1/auth/refresh` | Cookie | Rotate refresh token; issue new access token |
| POST | `/api/v1/auth/forgot-password` | None | Request password reset email |
| POST | `/api/v1/auth/reset-password` | None | Apply password reset (token from email) |
| GET | `/api/v1/auth/verify-email` | None | Verify email (token from email link) |
| POST | `/api/v1/auth/resend-verification` | None | Resend verification email |
| POST | `/api/v1/auth/change-password` | Bearer | Authenticated password change |
| POST | `/api/v1/auth/mfa/enrol/totp` | Bearer | Begin TOTP MFA enrolment |
| POST | `/api/v1/auth/mfa/verify-totp` | Bearer | Complete TOTP enrolment |
| POST | `/api/v1/auth/mfa/challenge` | Partial-Bearer | Submit MFA code after password auth |
| GET | `/api/v1/.well-known/jwks.json` | None | RS256 public key for external JWT verification |

### Platform Tenants (Implemented — Phase 1)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/platform/tenants/register` | None | Register new tenant (provisions schema) |
| GET | `/api/v1/platform/tenants/check-slug` | None | Check slug availability |
| GET | `/api/v1/platform/tenants/me` | Bearer | Current tenant profile |
| PUT | `/api/v1/platform/tenants/branding` | Bearer (TENANT_ADMIN) | Update tenant branding |

### Contacts (Phase 5)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/contacts` | Bearer | List contacts (paginated, filtered) |
| POST | `/api/v1/contacts` | Bearer | Create contact |
| GET | `/api/v1/contacts/count` | Bearer | Exact count (applies same filters) |
| GET | `/api/v1/contacts/export` | Bearer | Stream CSV/XLSX export |
| POST | `/api/v1/contacts/bulk` | Bearer | Bulk create (max 100) |
| DELETE | `/api/v1/contacts/bulk` | Bearer | Bulk soft delete (max 100) |
| PUT | `/api/v1/contacts/bulk` | Bearer | Bulk field update (max 100) |
| GET | `/api/v1/contacts/:id` | Bearer | Single contact with related data |
| PUT | `/api/v1/contacts/:id` | Bearer | Update contact |
| DELETE | `/api/v1/contacts/:id` | Bearer | Soft delete contact |
| PUT | `/api/v1/contacts/:id/account` | Bearer | Link/unlink to account |
| POST | `/api/v1/contacts/:id/merge/:duplicateId` | Bearer (SALES_MANAGER) | Merge duplicate contacts |
| GET | `/api/v1/contacts/:id/activities` | Bearer | Activity timeline |
| GET | `/api/v1/contacts/:id/tasks` | Bearer | Contact's tasks |
| PUT | `/api/v1/contacts/:id/tags` | Bearer | Replace tag set |
| POST | `/api/v1/contacts/:id/tags` | Bearer | Add tags |
| DELETE | `/api/v1/contacts/:id/tags/:tag` | Bearer | Remove single tag |

### Accounts (Phase 5)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/accounts` | Bearer | List accounts |
| POST | `/api/v1/accounts` | Bearer | Create account |
| GET | `/api/v1/accounts/export` | Bearer | Export accounts |
| POST | `/api/v1/accounts/bulk` | Bearer | Bulk create |
| GET | `/api/v1/accounts/:id` | Bearer | Account detail with KPIs |
| PUT | `/api/v1/accounts/:id` | Bearer | Update account |
| DELETE | `/api/v1/accounts/:id` | Bearer | Soft delete |
| GET | `/api/v1/accounts/:id/contacts` | Bearer | Account's contacts |
| GET | `/api/v1/accounts/:id/opportunities` | Bearer | Account's opportunities |

### Leads (Phase 6)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/leads` | Bearer | List leads |
| POST | `/api/v1/leads` | Bearer | Create lead |
| GET | `/api/v1/leads/:id` | Bearer | Lead detail |
| PUT | `/api/v1/leads/:id` | Bearer | Update lead |
| DELETE | `/api/v1/leads/:id` | Bearer | Soft delete |
| POST | `/api/v1/leads/:id/convert` | Bearer | Convert lead → contact/account/opportunity |

### Opportunities (Phase 6)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/opportunities` | Bearer | List opportunities |
| POST | `/api/v1/opportunities` | Bearer | Create opportunity |
| GET | `/api/v1/opportunities/:id` | Bearer | Opportunity detail |
| PUT | `/api/v1/opportunities/:id` | Bearer | Update opportunity |
| DELETE | `/api/v1/opportunities/:id` | Bearer | Soft delete |
| PATCH | `/api/v1/opportunities/:id/stage` | Bearer | Move to new stage (Kanban drag) |
| POST | `/api/v1/opportunities/:id/close` | Bearer | Mark won/lost with reason |

### Pipelines (Phase 4+)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/pipelines` | Bearer | List pipelines |
| POST | `/api/v1/pipelines` | Bearer (TENANT_ADMIN) | Create pipeline |
| GET | `/api/v1/pipelines/:id` | Bearer | Pipeline with stages |
| PUT | `/api/v1/pipelines/:id` | Bearer (TENANT_ADMIN) | Update pipeline |
| PUT | `/api/v1/pipelines/:id/stages` | Bearer (TENANT_ADMIN) | Replace stage list |
| GET | `/api/v1/pipelines/:id/board` | Bearer | Kanban board data |
| GET | `/api/v1/pipelines/:id/summary` | Bearer | Pipeline aggregates |

### Activities (Phase 7)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/activities` | Bearer | List activities (my feed) |
| POST | `/api/v1/activities` | Bearer | Log activity |
| GET | `/api/v1/activities/:id` | Bearer | Activity detail |
| PUT | `/api/v1/activities/:id` | Bearer | Update activity (up to 24h) |
| DELETE | `/api/v1/activities/:id` | Bearer | Soft delete |
| POST | `/api/v1/activities/:id/attachments` | Bearer | Get pre-signed S3 upload URL |

### Tasks (Phase 9)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/tasks` | Bearer | List tasks (?view=my/team/overdue/upcoming) |
| POST | `/api/v1/tasks` | Bearer | Create task |
| GET | `/api/v1/tasks/:id` | Bearer | Task detail |
| PUT | `/api/v1/tasks/:id` | Bearer | Update task |
| POST | `/api/v1/tasks/bulk/complete` | Bearer | Bulk complete |

### Notifications (Phase 10)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/notifications` | Bearer | Notification inbox |
| GET | `/api/v1/notifications/stream` | Bearer | SSE stream for real-time push |
| PUT | `/api/v1/notifications/:id/read` | Bearer | Mark single as read |
| PUT | `/api/v1/notifications/read-all` | Bearer | Mark all as read |
| GET | `/api/v1/users/me/notification-preferences` | Bearer | Get preferences |
| PUT | `/api/v1/users/me/notification-preferences` | Bearer | Update preferences |

### Search (Phase 5)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/search` | Bearer | Global search: `?q=term&types[]=contact,account` |

### Admin — Tenant (Phase 4)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/admin/users` | Bearer (TENANT_ADMIN) | List tenant users |
| POST | `/api/v1/admin/users/invite` | Bearer (TENANT_ADMIN) | Send user invitation |
| PUT | `/api/v1/admin/users/:id/status` | Bearer (TENANT_ADMIN) | Activate/deactivate |
| PUT | `/api/v1/admin/users/:id/roles` | Bearer (TENANT_ADMIN) | Assign roles |
| GET | `/api/v1/admin/roles` | Bearer (TENANT_ADMIN) | List roles |
| POST | `/api/v1/admin/roles` | Bearer (TENANT_ADMIN) | Create custom role |
| PUT | `/api/v1/admin/roles/:id/permissions` | Bearer (TENANT_ADMIN) | Set permissions |
| GET | `/api/v1/admin/custom-fields` | Bearer (TENANT_ADMIN) | List custom field defs |
| POST | `/api/v1/admin/custom-fields` | Bearer (TENANT_ADMIN) | Create custom field |
| PUT | `/api/v1/admin/custom-fields/:id` | Bearer (TENANT_ADMIN) | Update custom field |
| DELETE | `/api/v1/admin/custom-fields/:id` | Bearer (TENANT_ADMIN) | Delete custom field |
| PUT | `/api/v1/admin/tenant/branding` | Bearer (TENANT_ADMIN) | Update branding |
| GET | `/api/v1/admin/api-keys` | Bearer (TENANT_ADMIN) | List API keys |
| POST | `/api/v1/admin/api-keys` | Bearer (TENANT_ADMIN) | Issue new API key |
| DELETE | `/api/v1/admin/api-keys/:id` | Bearer (TENANT_ADMIN) | Revoke API key |

---

## 11. GraphQL Schema Draft

Planned for Phase 12. Schema-first approach using Mercurius (Fastify plugin) — but since the API is Java/Spring, the equivalent is **Spring for GraphQL**.

```graphql
type Query {
  contacts(first: Int, after: String, filter: ContactFilter): ContactConnection!
  contact(id: ID!): Contact
  accounts(first: Int, after: String, filter: AccountFilter): AccountConnection!
  account(id: ID!): Account
  leads(first: Int, after: String): LeadConnection!
  opportunities(first: Int, after: String, filter: OpportunityFilter): OpportunityConnection!
  pipeline(id: ID!): Pipeline
  search(query: String!, types: [EntityType!]): SearchResults!
}

type Mutation {
  createContact(input: CreateContactInput!): Contact!
  updateContact(id: ID!, input: UpdateContactInput!): Contact!
  deleteContact(id: ID!): Boolean!
  createAccount(input: CreateAccountInput!): Account!
  updateAccount(id: ID!, input: UpdateAccountInput!): Account!
  convertLead(id: ID!, input: ConvertLeadInput!): LeadConversionResult!
  changeOpportunityStage(id: ID!, stageId: ID!): Opportunity!
}

type Subscription {
  contactCreated: Contact!
  opportunityStageChanged: Opportunity!
}

# Relay-style connection pattern
type ContactConnection {
  edges: [ContactEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type ContactEdge {
  node: Contact!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type Contact {
  id: ID!
  firstName: String!
  lastName: String!
  email: String!
  title: String
  account: Account
  owner: User
  tags: [String!]!
  activities(first: Int, after: String): ActivityConnection!
  tasks: [Task!]!
  customFields: JSON
  createdAt: DateTime!
  updatedAt: DateTime!
}

scalar DateTime
scalar JSON
enum EntityType { CONTACT ACCOUNT LEAD OPPORTUNITY }
```

**Query limits:**
- Max depth: 7
- Max complexity: 1,000 (field=1, list=10, nested list=100)
- Rate limit on GraphQL endpoint: separate bucket from REST
