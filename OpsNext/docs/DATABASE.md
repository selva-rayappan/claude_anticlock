# OpsNext CRM — Database Design Document

**Document Version:** 1.0  
**Status:** Approved  
**Date:** 2026-06-11  
**Reference:** EXECUTION_PLAN.md TASK-002, TASK-010, TASK-011

---

## 1. Database Technology

**PostgreSQL 16** on a shared cluster (Neon serverless or AWS RDS Multi-AZ).

Key PostgreSQL features used:

| Feature | Usage |
|---------|-------|
| Schemas (namespaces) | Schema-per-tenant isolation |
| JSONB | Custom fields, address objects, metadata |
| GIN indexes | Fast JSONB and array queries |
| `pg_trgm` extension | Trigram similarity for duplicate detection |
| `citext` extension | Case-insensitive text comparison |
| `pgcrypto` extension | UUID and token generation |
| BRIN indexes | Audit log timestamp range queries |
| Partial indexes | Soft-delete unique constraints |
| Row-Level Security | Phase 3 additional safety layer |

---

## 2. Schema Architecture

### Two-Schema Design

```
PostgreSQL Cluster
├── public (platform schema)
│   ├── tenants
│   ├── tenant_configs
│   ├── tenant_usage_metrics
│   ├── tenant_subscriptions
│   └── platform_admins
│
├── tenant_acme (per-tenant schema — example)
│   ├── users
│   ├── roles
│   ├── permissions
│   ├── user_roles
│   ├── role_permissions
│   ├── sessions
│   ├── custom_field_definitions
│   ├── accounts
│   ├── contacts
│   ├── leads
│   ├── pipelines
│   ├── pipeline_stages
│   ├── opportunities
│   ├── opportunity_stage_history
│   ├── activities
│   ├── tasks
│   ├── workflows
│   ├── workflow_executions
│   ├── notifications
│   ├── audit_logs
│   └── import_jobs
│
└── tenant_globex (another tenant — fully isolated)
    └── ... (same tables)
```

---

## 3. Platform Schema Tables

### `tenants`

| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(30) | PK, cuid() |
| slug | VARCHAR(50) | UNIQUE, NOT NULL |
| name | VARCHAR(255) | NOT NULL |
| status | ENUM('ACTIVE','SUSPENDED','DELETED') | NOT NULL, DEFAULT 'ACTIVE' |
| subscription_tier | ENUM('BASIC','PROFESSIONAL','ENTERPRISE') | NOT NULL, DEFAULT 'BASIC' |
| schema_name | VARCHAR(70) | UNIQUE, NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| updated_at | TIMESTAMPTZ | NOT NULL |
| deleted_at | TIMESTAMPTZ | NULL |

Indexes: `(slug)`, `(status)`

### `tenant_configs`

| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(30) | PK |
| tenant_id | VARCHAR(30) | FK → tenants.id, UNIQUE |
| logo_url | VARCHAR(500) | NULL |
| primary_color | VARCHAR(7) | NULL, hex colour |
| timezone | VARCHAR(100) | DEFAULT 'UTC' |
| currency | VARCHAR(3) | DEFAULT 'USD', ISO 4217 |
| language | VARCHAR(10) | DEFAULT 'en' |
| date_format | VARCHAR(20) | DEFAULT 'MM/DD/YYYY' |
| feature_flags | JSONB | DEFAULT '{}' |
| sso_provider | VARCHAR(50) | NULL |
| sso_config | JSONB | NULL, encrypted at app layer |

---

## 4. Tenant Schema Tables (Core Entities)

### `users`

| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(30) | PK |
| email | VARCHAR(255) | UNIQUE (within tenant), citext |
| password_hash | VARCHAR(255) | bcrypt cost 12 |
| first_name | VARCHAR(100) | |
| last_name | VARCHAR(100) | |
| avatar_url | VARCHAR(500) | NULL |
| status | ENUM | ACTIVE / INVITED / DEACTIVATED |
| mfa_enabled | BOOLEAN | DEFAULT false |
| mfa_secret | TEXT | NULL, encrypted |
| failed_login_attempts | INTEGER | DEFAULT 0 |
| locked_until | TIMESTAMPTZ | NULL |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

Indexes: `(email)` partial where `deleted_at IS NULL`

### `contacts`

| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(30) | PK |
| first_name | VARCHAR(100) | NOT NULL |
| last_name | VARCHAR(100) | NOT NULL |
| email | VARCHAR(255) | UNIQUE (within tenant, soft-delete partial) |
| phones | JSONB | Array of `{ type, number }` |
| title | VARCHAR(200) | NULL |
| account_id | VARCHAR(30) | FK → accounts.id, NULL |
| owner_id | VARCHAR(30) | FK → users.id |
| address | JSONB | `{ street, city, state, country, zip }` |
| social_handles | JSONB | `{ linkedin, twitter, ... }` |
| tags | TEXT[] | |
| source | VARCHAR(100) | NULL |
| custom_fields | JSONB | DEFAULT '{}' |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ | NULL |

Indexes:
- `(email)` partial where `deleted_at IS NULL`
- GIN on `tags`
- GIN on `custom_fields`
- `(owner_id, deleted_at)`

### `audit_logs`

Append-only. Never updated or deleted.

| Column | Type | Notes |
|--------|------|-------|
| id | BIGSERIAL | PK |
| entity_type | VARCHAR(50) | e.g., 'CONTACT', 'OPPORTUNITY' |
| entity_id | VARCHAR(30) | |
| action | ENUM | CREATE / UPDATE / DELETE |
| user_id | VARCHAR(30) | |
| ip_address | VARCHAR(45) | IPv4 or IPv6 |
| user_agent | TEXT | |
| before | JSONB | NULL for CREATE |
| after | JSONB | NULL for DELETE |
| created_at | TIMESTAMPTZ | NOT NULL |

Indexes:
- BRIN on `created_at` (optimised for append-only time-series)
- `(entity_type, entity_id)`
- `(user_id)`

Partitioning: by month on `created_at` (Phase 2+).

---

## 5. Custom Fields Architecture

Custom field definitions are stored in `custom_field_definitions`:

| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(30) | PK |
| entity_type | ENUM | CONTACT / ACCOUNT / LEAD / OPPORTUNITY |
| field_key | VARCHAR(50) | snake_case slug, UNIQUE per entity+tenant |
| label | VARCHAR(100) | Display name |
| field_type | ENUM | TEXT / NUMBER / DATE / DROPDOWN / MULTI_SELECT / BOOLEAN / URL / EMAIL |
| options | JSONB | For DROPDOWN / MULTI_SELECT: `["Option A", "Option B"]` |
| required | BOOLEAN | DEFAULT false |
| display_order | INTEGER | |

Field values stored in `custom_fields JSONB` on each entity row:

```json
{
  "annual_revenue_band": "1M-10M",
  "preferred_contact_time": "morning",
  "crm_imported": true
}
```

Querying custom fields:

```sql
-- Find contacts where custom field "industry_segment" = "SaaS"
SELECT * FROM contacts
WHERE custom_fields @> '{"industry_segment": "SaaS"}'
AND deleted_at IS NULL;
```

GIN index on `custom_fields` makes this efficient.

---

## 6. Soft Delete Pattern

All mutable entities have `deleted_at TIMESTAMPTZ NULL`.

```sql
-- Standard list query always excludes soft-deleted rows
SELECT * FROM contacts WHERE deleted_at IS NULL;

-- Unique constraint uses partial index
CREATE UNIQUE INDEX contacts_email_unique_active
ON contacts (email) WHERE deleted_at IS NULL;

-- Soft delete
UPDATE contacts SET deleted_at = now() WHERE id = 'xxx';
```

---

## 7. Index Strategy

| Table | Index | Rationale |
|-------|-------|-----------|
| contacts | `(owner_id, deleted_at)` | Owner-scoped list view |
| contacts | GIN `(tags)` | Tag filter queries |
| contacts | GIN `(custom_fields)` | Custom field filter queries |
| opportunities | `(stage_id, owner_id, expected_close_date)` | Pipeline board queries |
| audit_logs | BRIN `(created_at)` | Time-range audit queries |
| tasks | `(assignee_id, status, due_at)` | Task list views |
| notifications | `(user_id, read_at)` | Unread notification count |
| sessions | `(token)` | JWT validation lookups |

---

## 8. Connection Pooling

**Local dev:** Prisma's built-in connection pool (direct connection).  
**Staging/Prod:** PgBouncer in `transaction` mode between the API and PostgreSQL.

PgBouncer config:
```ini
pool_mode = transaction
max_client_conn = 500
default_pool_size = 20  # per tenant schema
```

Java API datasource URL points to PgBouncer, not Postgres directly.

---

## 9. Migration Strategy

- Migrations managed by Prisma (`packages/db/prisma/migrations/`).
- All migrations are **additive only** for live tenants — no DROP TABLE, DROP COLUMN, or RENAME COLUMN in a single migration.
- Column rename = add new column → backfill → swap application code → drop old column (3 separate migrations).
- New tenant provisioning runs all migrations against the new schema.
- CD pipeline applies latest migrations to all existing tenant schemas before pod rollout.

---

## 10. Backup & Recovery

| Component | Strategy | RPO | RTO |
|-----------|---------|-----|-----|
| PostgreSQL | Daily snapshots + WAL streaming to S3 | 1 hour | 4 hours |
| Redis | RDB persistence + AOF logging | 15 minutes | 1 hour |
| S3 / MinIO | Cross-region replication | 1 hour | 2 hours |
