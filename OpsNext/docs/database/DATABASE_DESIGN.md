# OpsNext CRM — Database Design Document

**Document Version:** 1.0  
**Status:** APPROVED  
**Prepared By:** Lead Architect + DBA  
**Date:** 2026-06-14  
**Classification:** Internal — Confidential  
**Reference Documents:** TAD.md, FUNCTIONAL_REQUIREMENTS.md  
**Traceability:** TASK-002

---

## Table of Contents

1. [Schema Architecture Overview](#1-schema-architecture-overview)
2. [Entity-Relationship Diagram](#2-entity-relationship-diagram)
3. [Platform Schema (public)](#3-platform-schema-public)
4. [Tenant Schema (tenant_{slug})](#4-tenant-schema-tenantslug)
5. [Custom Fields Architecture](#5-custom-fields-architecture)
6. [Index Strategy](#6-index-strategy)
7. [Soft Delete Strategy](#7-soft-delete-strategy)
8. [Audit Log Design](#8-audit-log-design)
9. [Connection Pooling Design](#9-connection-pooling-design)
10. [Migration Strategy (Flyway)](#10-migration-strategy-flyway)
11. [Seed Data Specification](#11-seed-data-specification)

---

## 1. Schema Architecture Overview

OpsNext uses a **schema-per-tenant** isolation model on a single PostgreSQL 16 cluster. Each tenant's data lives in its own PostgreSQL schema (`tenant_{slug}`), completely isolated from all other tenants. The `public` schema holds platform-level shared data only.

```
PostgreSQL 16 Cluster
├── public                         ← Platform schema (Flyway-managed)
│   ├── tenants
│   ├── tenant_configs
│   ├── tenant_subscriptions
│   ├── tenant_usage_metrics
│   └── platform_admins
│
├── tenant_acme                    ← Tenant "Acme Corp" schema
│   ├── users, roles, permissions
│   ├── contacts, accounts, leads, opportunities
│   ├── pipelines, pipeline_stages
│   ├── activities, tasks
│   ├── workflows, workflow_executions
│   ├── notifications, audit_logs
│   ├── api_keys, sessions, refresh_tokens
│   ├── import_jobs, segments
│   ├── webhook_subscriptions, webhook_deliveries
│   └── email_sequences, sequence_enrollments
│
├── tenant_globex                  ← Tenant "Globex" schema
│   └── (same structure)
│
└── tenant_initech                 ← Tenant "Initech" schema
    └── (same structure)
```

**Why schema-per-tenant (not row-level):**  
See ADR-002. Schema isolation eliminates the risk of cross-tenant data leakage from missing `WHERE tenant_id = ?` clauses, enables per-tenant backup/restore, and allows schema-level permission grants. Trade-off: higher connection overhead and more complex migration tooling.

**Search path management:**  
`TenantFilter` extracts the tenant slug from `X-Tenant-Slug` header or subdomain, resolves it via Redis cache (5 min TTL) to the schema name, and stores it in `TenantContext` (ThreadLocal). All subsequent `TenantJdbcTemplate` calls prepend `SET search_path TO tenant_{slug}, public` to every connection before query execution.

---

## 2. Entity-Relationship Diagram

### 2a. Platform Schema ERD

```
public.tenants (1) ──────────────────── (1) public.tenant_configs
      │                                         (logo, branding, SSO, feature flags)
      │
      ├──── (1) public.tenant_subscriptions
      │           (Stripe billing data)
      │
      └──── (1) public.tenant_usage_metrics
                  (denormalised counters)

public.platform_admins  (independent — not FK'd to tenants)
```

### 2b. Tenant Schema ERD (Core)

```
users (1) ─────── (N) user_roles (N) ─── (1) roles
                                               │
                                          (N) role_permissions (N) ─── (1) permissions
users (1) ─────── (N) refresh_tokens
users (1) ─────── (N) sessions
users (1) ─────── (N) api_keys (created_by)

accounts (1) ──── (N) contacts (account_id)   ← primary link
    │              │
    │              └── (N) contact_accounts    ← many-to-many (multi-account)
    │
    └── (0..1) accounts (parent_account_id)    ← self-referential hierarchy

contacts (1) ─────── (N) leads.converted_to_contact_id
contacts (1) ─────── (N) sequence_enrollments (N) ─── (1) email_sequences

leads ──── (0..1) contacts (converted)
      ──── (0..1) accounts (converted)
      ──── (0..1) opportunities (converted)

pipelines (1) ─────── (N) pipeline_stages
                            │
opportunities (N) ──────── (1) pipeline_stages (stage_id)
              (N) ──────── (1) pipelines (pipeline_id)
              (N) ──────── (0..1) accounts
              (N) ──────── (0..1) contacts
              (N) ──────── (0..1) users (owner)
              (1) ──────── (N) opportunity_stage_history
              (1) ──────── (N) opportunity_value_history

activities (N) ─── polymorphic ─── contacts | accounts | leads | opportunities
                                    via (entity_type, entity_id)

tasks (N) ─── polymorphic ─── contacts | accounts | leads | opportunities
               via (entity_type, entity_id)

workflows (1) ──────── (N) workflow_executions
                            (trigger_entity_type, trigger_entity_id, trigger_event_id — unique)

notifications (N) ──────── (1) users

webhook_subscriptions (1) ──────── (N) webhook_deliveries

import_jobs (N) ──────── (1) users (created_by)

segments ─── filter_tree JSONB (no FK — references entity fields dynamically)

audit_logs ─── append-only, partitioned by created_at RANGE
               polymorphic (entity_type, entity_id)
               NO FK to users — preserves log even after user deletion

custom_field_definitions ─── entity_type + field_key (unique per entity type)
                              options JSONB (for DROPDOWN / MULTI_SELECT types)
```

---

## 3. Platform Schema (public)

Managed exclusively by Flyway. Applied once at startup; never modified by runtime code.

### 3.1 tenants

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | VARCHAR(36) | PK | UUID v4 generated in Java |
| slug | VARCHAR(63) | UNIQUE NOT NULL | URL-safe, lowercase, hyphenated; reserved words blocked at service layer |
| name | VARCHAR(200) | NOT NULL | Display name of the organisation |
| status | VARCHAR(20) | CHECK IN ('ACTIVE','SUSPENDED','DELETED') | Default: ACTIVE |
| subscription_tier | VARCHAR(20) | CHECK IN ('BASIC','PROFESSIONAL','ENTERPRISE') | Default: BASIC |
| schema_name | VARCHAR(100) | NOT NULL | Always `tenant_{slug}` |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Trigger-managed |
| deleted_at | TIMESTAMPTZ | | Soft delete |

**Indexes:**
- `idx_tenants_slug` — partial on `slug WHERE deleted_at IS NULL` (tenant resolution hot path)
- `idx_tenants_status` — partial on `status WHERE deleted_at IS NULL`

### 3.2 tenant_configs

One-to-one with tenants. Holds branding, locale, SSO configuration, and feature flags.

| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(36) PK | |
| tenant_id | VARCHAR(36) FK→tenants | UNIQUE — one config per tenant |
| logo_url | TEXT | S3 URL |
| primary_color | VARCHAR(7) | Hex colour e.g. #2563EB |
| timezone | VARCHAR(50) | IANA timezone (default: UTC) |
| currency | VARCHAR(3) | ISO 4217 (default: USD) |
| language | VARCHAR(10) | BCP 47 tag (default: en) |
| date_format | VARCHAR(20) | e.g. MM/DD/YYYY |
| feature_flags | JSONB | Per-tenant feature toggles |
| sso_provider | VARCHAR(50) | microsoft/google/saml |
| sso_config | JSONB | Encrypted: clientId, clientSecret, metadataUrl |
| updated_at | TIMESTAMPTZ | |

### 3.3 tenant_subscriptions

| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(36) PK | |
| tenant_id | VARCHAR(36) FK→tenants | UNIQUE |
| stripe_customer_id | VARCHAR(100) | Null until Stripe integrated |
| stripe_price_id | VARCHAR(100) | Active price/plan ID |
| status | VARCHAR(20) | TRIALING / ACTIVE / PAST_DUE / CANCELLED |
| current_period_start | TIMESTAMPTZ | From Stripe webhook |
| current_period_end | TIMESTAMPTZ | From Stripe webhook |

### 3.4 tenant_usage_metrics

Denormalised counters updated by background scheduled jobs. Never used for authoritative counts; only for dashboards and billing guards.

| Column | Type | Notes |
|--------|------|-------|
| tenant_id | VARCHAR(36) PK FK→tenants | |
| user_count | INTEGER | |
| contact_count | INTEGER | |
| account_count | INTEGER | |
| lead_count | INTEGER | |
| opportunity_count | INTEGER | |
| api_calls_mtd | INTEGER | Resets on 1st of month |
| storage_bytes | BIGINT | Sum of S3 attachment sizes |
| last_computed_at | TIMESTAMPTZ | |

### 3.5 platform_admins

Completely separate from tenant users. Cannot access tenant data through normal flows.

| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(36) PK | |
| email | VARCHAR(255) UNIQUE | |
| password_hash | TEXT | bcrypt rounds=12 |
| mfa_enabled | BOOLEAN | |
| last_login_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

---

## 4. Tenant Schema (tenant_{slug})

All tables below exist in each tenant's dedicated PostgreSQL schema. The `search_path` is set per-request by `TenantJdbcTemplate`. Primary keys use `gen_random_uuid()` (PostgreSQL pgcrypto extension). Text IDs (not integers) are used throughout for portability and merge safety.

### 4.1 Enums

Defined per-schema (PostgreSQL enums are schema-scoped):

| Enum | Values |
|------|--------|
| `user_status` | ACTIVE, INVITED, DEACTIVATED |
| `resource_type` | CONTACT, ACCOUNT, LEAD, OPPORTUNITY, PIPELINE, REPORT, WORKFLOW, USER, SETTING |
| `action_type` | CREATE, READ, UPDATE, DELETE, EXPORT |
| `scope_type` | ALL, OWN |
| `company_size` | MICRO, SMALL, MEDIUM, LARGE, ENTERPRISE |
| `lead_status` | NEW, CONTACTED, QUALIFIED, UNQUALIFIED, CONVERTED |
| `activity_type` | CALL, EMAIL, MEETING, NOTE, TASK |
| `entity_type` | CONTACT, ACCOUNT, LEAD, OPPORTUNITY |
| `task_priority` | LOW, MEDIUM, HIGH, URGENT |
| `task_status` | OPEN, IN_PROGRESS, COMPLETED, CANCELLED |
| `custom_field_type` | TEXT, NUMBER, DATE, DROPDOWN, MULTI_SELECT, BOOLEAN, URL, EMAIL |
| `workflow_trigger_type` | RECORD_CREATED, RECORD_UPDATED, STAGE_CHANGED, DATE_REACHED, TAG_ADDED |
| `workflow_execution_status` | PENDING, RUNNING, SUCCESS, FAILED, SKIPPED |
| `import_status` | PENDING, PROCESSING, COMPLETED, FAILED |
| `notification_type` | TASK_DUE, DEAL_STAGE_CHANGED, NEW_ASSIGNMENT, MENTION, WORKFLOW_TRIGGERED, IMPORT_COMPLETE, STALE_DEAL, SYSTEM_ALERT |
| `audit_action` | CREATE, UPDATE, DELETE |

### 4.2 IAM Tables

**users** — Tenant user accounts.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| email | TEXT UNIQUE NOT NULL | Case-sensitive within tenant |
| password_hash | TEXT | bcrypt; null for SSO-only users |
| first_name | VARCHAR(100) NOT NULL | |
| last_name | VARCHAR(100) NOT NULL | |
| avatar_url | VARCHAR(500) | S3 URL |
| status | user_status DEFAULT 'INVITED' | |
| mfa_enabled | BOOLEAN DEFAULT FALSE | |
| mfa_secret | TEXT | Encrypted TOTP secret |
| failed_login_attempts | INT DEFAULT 0 | Reset on successful login |
| locked_until | TIMESTAMPTZ | Set after 5 failures, 15 min duration |
| last_login_at | TIMESTAMPTZ | |
| invite_token | TEXT | Hashed; cleared on acceptance |
| invite_expires_at | TIMESTAMPTZ | 72h window |
| email_verified_at | TIMESTAMPTZ | Null = not verified |
| email_verification_token | TEXT | Hashed; cleared on use |
| email_verification_expires_at | TIMESTAMPTZ | 24h window |
| push_token | TEXT | FCM/APNs for mobile |
| created_at / updated_at / deleted_at | TIMESTAMPTZ | Standard audit fields |

**roles** — Named permission groups. `is_system=true` roles cannot be deleted.

Built-in roles seeded on tenant creation: `SUPER_ADMIN`, `TENANT_ADMIN`, `SALES_MANAGER`, `SALES_REP`, `READ_ONLY`.

**permissions** — Atomic permission records: `(resource, action, scope)` triplet, unique per combination.

**user_roles** — M:N join. Tracks who assigned the role (`assigned_by`).

**role_permissions** — M:N join between roles and permissions.

**refresh_tokens** — Opaque refresh tokens (hashed with SHA-256). Stores expiry and revocation timestamp. Separate from `sessions` to allow single-device revocation without ending all sessions.

**sessions** — Active browser/app sessions. Used for session listing and bulk-invalidation. Token field stores a hashed session identifier.

### 4.3 CRM Core Tables

**accounts** — Company/organisation records.
- Hierarchical: `parent_account_id` self-FK for parent/subsidiary modelling.
- GIN indexes on `name` (trigram), `tags`, `custom_fields` for fast search.
- `address` stored as JSONB: `{line1, line2, city, state, postalCode, country}`.

**contacts** — Individual person records.
- `phones` as JSONB array: `[{type: "mobile", number: "+1-555-0100"}]`.
- `social_handles` as JSONB: `{linkedin, twitter, github}`.
- `email_opt_out` and `consent_given_at` for GDPR email compliance.
- `contact_accounts` junction table enables a contact to belong to multiple accounts.

**leads** — Pre-qualification pipeline entries. On conversion, foreign keys to the created `contact`, `account`, and `opportunity` are set atomically.

### 4.4 Pipeline Tables

**pipelines** — Named deal funnels. `is_default` controls which pipeline is pre-selected on opportunity creation. Only one default pipeline per tenant (enforced at service layer).

**pipeline_stages** — Ordered stages within a pipeline. `display_order` controls Kanban column order. `is_closed + is_won` flags mark terminal stages. `probability` (0-100) is the default win probability inherited by new opportunities in this stage.

**opportunities** — Deal records.
- `stage_id` FK is RESTRICT (cannot delete stage with active opportunities).
- `probability` can be overridden from the stage default.
- `expected_close_date` is a DATE (not TIMESTAMPTZ) — day-level precision only.

**opportunity_stage_history** — Immutable append-only log of every stage transition, including duration in the previous stage (in hours). Used for velocity and time-in-stage analytics.

**opportunity_value_history** — Immutable log of every value change. Used for forecast accuracy analysis.

### 4.5 Activity & Task Tables

**activities** — Polymorphic: linked to any entity via `(entity_type, entity_id)`. No FK to the entity (avoids cross-table constraint complexity); referential integrity is enforced at service layer. `pinned=true` elevates notes to top of timeline (max 3 per entity, enforced at service layer).

**tasks** — Linked optionally to an entity. `reminder_at` triggers a background job to dispatch a notification.

### 4.6 Automation Tables

**workflows** — Rule definitions. `trigger_config`, `conditions`, and `actions` are JSONB arrays, giving the workflow engine full flexibility without schema changes.

```json
// trigger_config example
{ "entityType": "OPPORTUNITY", "event": "STAGE_CHANGED" }

// conditions example
[{ "field": "stage.name", "operator": "eq", "value": "Closed Won" }]

// actions example
[
  { "type": "CREATE_TASK", "config": { "title": "Send welcome kit", "assigneeId": "..." } },
  { "type": "SEND_EMAIL", "config": { "templateId": "welcome-kit", "to": "{{contact.email}}" } }
]
```

**workflow_executions** — One record per trigger event per workflow. Unique constraint on `(workflow_id, trigger_entity_id, trigger_event_id)` prevents duplicate execution on event replay.

### 4.7 Supporting Tables

| Table | Purpose |
|-------|---------|
| notifications | In-app notification inbox; `read_at` NULL = unread |
| webhook_subscriptions | Outbound webhook endpoint configurations |
| webhook_deliveries | Delivery attempt log (retained 30 days) |
| import_jobs | CSV/XLSX import job tracking |
| segments | Saved dynamic filter trees |
| audit_logs | Append-only compliance log (partitioned) |
| api_keys | Machine-to-machine API key credentials |
| email_sequences | Multi-step email cadence definitions |
| sequence_enrollments | Contact-to-sequence enrolment tracking |
| custom_field_definitions | Tenant-configurable field schema |

---

## 5. Custom Fields Architecture

Custom fields allow tenant admins to extend the schema of core entities without a database migration.

### Storage Model

Custom field values are stored in a `custom_fields JSONB DEFAULT '{}'` column on each entity table (contacts, accounts, leads, opportunities). The JSONB column holds key-value pairs where keys are the `field_key` from `custom_field_definitions`.

```json
// contacts.custom_fields example
{
  "preferred_language": "Spanish",
  "renewal_date": "2027-03-15",
  "nps_score": 8,
  "industry_sub_segment": "Healthcare IT"
}
```

### custom_field_definitions Table

Each row defines one field for one entity type:

| Field | Purpose |
|-------|---------|
| entity_type | Which entity this field applies to |
| field_key | Unique slug per entity type; stored as the JSONB key |
| field_type | Controls validation and UI input type |
| options | JSONB array for DROPDOWN/MULTI_SELECT: `[{value, label}]` |
| visible_to_roles | TEXT[] of role IDs; empty = all roles |
| editable_by_roles | TEXT[] of role IDs; empty = all roles |
| display_order | Controls field ordering in forms |

### Index Strategy for Custom Fields

GIN index on each entity's `custom_fields` column enables:
- `custom_fields @> '{"nps_score": 8}'` — equality filter
- `custom_fields ? 'preferred_language'` — field existence check

### Limits

- Max 50 custom fields per entity type per tenant (enforced at service layer)
- Field keys must match `^[a-z][a-z0-9_]{0,99}$`
- System field keys (`id`, `email`, `created_at`, etc.) are reserved and cannot be used

---

## 6. Index Strategy

### 6.1 Index Conventions

All high-traffic query indexes are **partial** (including `WHERE deleted_at IS NULL`) to exclude soft-deleted rows from index scans. Compound indexes are ordered by selectivity (most selective column first).

### 6.2 Index Inventory

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| tenants | idx_tenants_slug | B-tree partial | Tenant resolution (hot path) |
| tenants | idx_tenants_status | B-tree partial | Admin tenant list |
| users | users_email_idx | B-tree partial | Login lookup |
| users | users_status_idx | B-tree partial | Admin user filtering |
| refresh_tokens | refresh_tokens_user_id_idx | B-tree | Token listing by user |
| refresh_tokens | refresh_tokens_expires_at_idx | B-tree | Cleanup job |
| sessions | sessions_token_idx | B-tree | Session lookup |
| sessions | sessions_user_id_idx | B-tree | User sessions list |
| accounts | accounts_owner_id_idx | B-tree partial | My accounts view |
| accounts | accounts_domain_idx | B-tree partial | Duplicate detection |
| accounts | accounts_name_trgm_idx | GIN gin_trgm_ops partial | Fuzzy name search |
| accounts | accounts_tags_idx | GIN partial | Tag filtering |
| accounts | accounts_custom_fields_idx | GIN partial | Custom field filter |
| contacts | contacts_email_idx | B-tree partial | Email lookup / dedup |
| contacts | contacts_owner_id_idx | B-tree partial | My contacts view |
| contacts | contacts_account_id_idx | B-tree partial | Account's contacts |
| contacts | contacts_name_trgm_idx | GIN gin_trgm_ops partial | Full-name fuzzy search |
| contacts | contacts_tags_idx | GIN partial | Tag filtering |
| contacts | contacts_custom_fields_idx | GIN partial | Custom field filter |
| leads | leads_owner_id_status_idx | B-tree partial (composite) | My leads by status |
| leads | leads_score_idx | B-tree DESC partial | Lead scoring list |
| leads | leads_email_idx | B-tree partial | Dedup check |
| opportunities | opportunities_stage_id_idx | B-tree partial | Kanban board per stage |
| opportunities | opportunities_owner_id_idx | B-tree partial | My deals |
| opportunities | opportunities_expected_close_date_idx | B-tree partial | Date-triggered workflows |
| opportunities | opportunities_pipeline_id_idx | B-tree partial | Pipeline summary |
| activities | activities_entity_idx | B-tree partial (composite) | Entity timeline |
| activities | activities_owner_id_idx | B-tree partial | My activities |
| tasks | tasks_assignee_status_due_idx | B-tree composite | My tasks / overdue |
| tasks | tasks_entity_idx | B-tree partial | Entity tasks |
| pipeline_stages | pipeline_stages_pipeline_id_idx | B-tree composite | Stage ordering |
| opp_stage_history | opp_stage_history_opp_idx | B-tree composite DESC | History timeline |
| notifications | notifications_user_unread_idx | B-tree partial | Unread notification count |
| audit_logs | audit_logs_created_at_idx | BRIN | Time-range scans on append-only data |
| audit_logs | audit_logs_entity_idx | B-tree | Entity audit trail |
| wf_executions | wf_executions_workflow_idx | B-tree composite DESC | Workflow run history |

### 6.3 Covering Indexes (Planned — Phase 5+)

For the contacts list page (high-frequency), a covering index will avoid heap fetches:
```sql
CREATE INDEX contacts_list_covering ON contacts (owner_id, created_at DESC)
  INCLUDE (id, first_name, last_name, email, account_id, tags)
  WHERE deleted_at IS NULL;
```

---

## 7. Soft Delete Strategy

All mutable business entities use a `deleted_at TIMESTAMPTZ` column (nullable).

- **Soft deleted:** `deleted_at IS NOT NULL`
- **Active:** `deleted_at IS NULL`

**Rules:**
1. All standard queries include `WHERE deleted_at IS NULL` (enforced at repository/service layer).
2. All B-tree indexes on these tables are partial: `WHERE deleted_at IS NULL`.
3. Hard delete is never used on business entities; only on transient records (sessions, tokens).
4. Deleted records remain visible in audit logs and can be undeleted by admins (planned Phase 4).
5. A nightly job (planned Phase 9) permanently purges records soft-deleted > 90 days ago.

**Tables with soft delete:** tenants, contacts, accounts, leads, opportunities, activities, users.

**Tables without soft delete:** audit_logs (append-only), notifications (archive), import_jobs (status-driven), webhook_deliveries (log).

---

## 8. Audit Log Design

`audit_logs` is an **append-only** partitioned table. No UPDATE or DELETE is ever issued against it.

### Partitioning

Partitioned by `RANGE (created_at)` (monthly partitions). A default partition catches rows when no monthly partition exists. New monthly partitions should be pre-created by a scheduled job.

```sql
-- Example monthly partition creation (automated)
CREATE TABLE audit_logs_2026_07 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
```

### Indexes on audit_logs

- **BRIN** on `created_at` — extremely compact, ideal for append-only tables; supports range scans `WHERE created_at BETWEEN x AND y`.
- **B-tree** on `(entity_type, entity_id)` — per-entity audit trail.
- **B-tree** on `user_id` — all actions by a user.

### before / after JSONB

Each row stores a JSON snapshot of the entity state before and after the change. This enables:
- Field-level diff display in the UI
- GDPR data access exports
- Compliance reporting

The audit service strips sensitive fields (`password_hash`, `mfa_secret`, tokens) before writing.

### Retention

Default retention: **7 years** (configurable per tenant tier). A scheduled job drops monthly partitions that are past their retention date.

---

## 9. Connection Pooling Design

### HikariCP (Application Pool)

OpsNext uses **HikariCP** (bundled with Spring Boot) as the JDBC connection pool.

```yaml
spring:
  datasource:
    hikari:
      pool-name: OpsNextPool
      maximum-pool-size: 20        # Per app instance
      minimum-idle: 5
      connection-timeout: 30000    # 30s
      idle-timeout: 600000         # 10 min
      max-lifetime: 1800000        # 30 min
      keepalive-time: 300000       # 5 min — prevents idle timeout on PaaS
```

**Multi-tenancy interaction:**  
Connections are shared across tenants. `TenantJdbcTemplate` issues `SET search_path TO tenant_{slug}, public` at the start of each query (not on connection checkout) to be safe with connection pooling. This avoids schema leakage between requests.

### PgBouncer (Planned — Phase 17 Hardening)

For production with 100+ app instances, PgBouncer will sit in front of PostgreSQL:
- **Pool mode:** `transaction` — connections returned to pool after each transaction, compatible with `SET search_path` per-query approach.
- **max_client_conn:** 1000 (per PgBouncer node)
- **default_pool_size:** 20 per database
- Deployed as a sidecar to the API pod in Kubernetes.

### Read Replicas (Planned — Phase 17)

Read-heavy queries (reports, export, analytics) will route to a read replica via a secondary DataSource. The routing is implemented at the `@Transactional(readOnly = true)` level using `AbstractRoutingDataSource`.

---

## 10. Migration Strategy (Flyway)

### Platform Schema Migrations

Managed by **Flyway** (bundled in Spring Boot). Applied automatically on `bootRun` startup.

| File | Content |
|------|---------|
| `V1__platform_schema.sql` | Creates all public schema tables, extensions, triggers |
| `V2__*.sql` | Future platform schema changes (additive only) |

**Convention:** Only additive changes (ADD COLUMN, CREATE INDEX, CREATE TABLE). Never DROP or RENAME on live data. For destructive changes, use a rename → shadow → drop cycle over multiple releases.

### Tenant Schema Migrations

Tenant schemas are **not managed by Flyway** (Flyway cannot handle dynamic schema names natively). Instead:

1. **Initial provisioning:** `TenantProvisioningService` executes `tenant-schema-template.sql` verbatim against the new tenant's schema using `TenantJdbcTemplate`.
2. **Schema upgrades:** A `TenantSchemaMigrationService` (planned Phase 9) iterates all active tenant schemas and applies a versioned SQL file. This is triggered as a post-deployment Kubernetes Job.
3. **Idempotency:** Each tenant migration SQL file uses `IF NOT EXISTS` / `DO $$ BEGIN IF NOT EXISTS ... END $$` guards.

### Versioning

Tenant migration scripts are named `Tv{n}__{description}.sql` and stored in `apps/api/src/main/resources/db/tenant-migrations/`. A `tenant_schema_version` table (one row per tenant schema) tracks which migrations have been applied.

---

## 11. Seed Data Specification

### Tenant Provisioning Seed (Runs on every new tenant)

Executed by `TenantProvisioningService.seedInitialData()` via `TenantJdbcTemplate` after `tenant-schema-template.sql` runs:

**Roles (5 system roles, `is_system=true`):**

| Role | Description |
|------|-------------|
| SUPER_ADMIN | All permissions on all resources, all scopes |
| TENANT_ADMIN | All permissions excluding PLATFORM_ADMIN operations |
| SALES_MANAGER | CRUD on all CRM entities, scope=ALL; can view team reports |
| SALES_REP | CRUD on own entities (scope=OWN); read all contacts/accounts |
| READ_ONLY | READ on all resources, no CREATE/UPDATE/DELETE/EXPORT |

**Permissions (seeded as Cartesian product of resource × action × scope where applicable):**

15 resources × 5 actions × 2 scopes = up to 150 permission rows (only valid combinations are inserted).

**Default Pipeline:**

| Stage | Order | Probability | Closed | Won |
|-------|-------|-------------|--------|-----|
| Prospecting | 1 | 10% | false | false |
| Qualification | 2 | 25% | false | false |
| Proposal | 3 | 50% | false | false |
| Negotiation | 4 | 75% | false | false |
| Closed Won | 5 | 100% | true | true |
| Closed Lost | 6 | 0% | true | false |

**Admin User:**

Created from the `TenantRegisterRequest`: email, hashed password, first/last name, `status=ACTIVE`, assigned `SUPER_ADMIN` role.

### Development/Staging Seed (Optional — via `DataSeeder` bean, `spring.profiles.active=dev`)

Additional sample data for development only:

- 10 sample contacts (with varied sources, tags, custom fields)
- 5 sample accounts (2 with parent/child hierarchy)
- 8 sample leads (mix of statuses and scores)
- 5 sample opportunities across pipeline stages
- 20 sample activities (mix of CALL, EMAIL, MEETING, NOTE)
- 5 sample tasks (mix of priorities and statuses)

This seed is never run in production (profile guard: `@Profile("dev")`).

---

## Appendix A: Planned Future Tables

| Table | Phase | Purpose |
|-------|-------|---------|
| `mfa_backup_codes` | Phase 3 | Hashed TOTP backup codes |
| `oauth_connections` | Phase 7 | Gmail/Outlook OAuth tokens per user |
| `email_threads` | Phase 7 | Synced email thread metadata |
| `calendar_events` | Phase 7 | Synced calendar meeting metadata |
| `lead_score_history` | Phase 6 | Score change log for trend analysis |
| `report_definitions` | Phase 11 | Custom report builder saved reports |
| `report_schedules` | Phase 11 | Scheduled report delivery config |
| `audit_logs_{YYYY_MM}` | Phase 9 | Monthly partitions (auto-created) |
| `tenant_schema_versions` | Phase 9 | Tracks applied tenant migrations |
