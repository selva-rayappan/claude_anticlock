# Data Model: Deal & Pipeline Management

**Feature**: `005-deal-pipeline`
**Date**: 2026-06-15
**Schema**: All tables reside in `tenant_{slug}` schema

---

## Entity Relationship Overview

```
pipeline ──< pipeline_stage ──< deal ──< deal_stage_history
                                │
                                ├── contacts (optional FK)
                                └── companies (optional FK)

pipeline ──< revenue_target

tenant ──< deal_custom_field_definition
deal.custom_fields (JSONB) references definition by name
```

---

## Entity: `pipeline`

**Purpose**: A named, ordered container for pipeline stages. One pipeline = one sales process.
A tenant may have multiple pipelines (e.g., "New Business", "Renewals").

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, default gen_random_uuid() | Surrogate key |
| `tenant_id` | UUID | NOT NULL | Tenant isolation key |
| `name` | VARCHAR(150) | NOT NULL | Pipeline display name |
| `description` | TEXT | | Optional description |
| `is_default` | BOOLEAN | NOT NULL DEFAULT FALSE | Only one default per tenant (partial unique index) |
| `is_active` | BOOLEAN | NOT NULL DEFAULT TRUE | Inactive pipelines accept no new deals |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

**Indexes**:
- `UNIQUE (tenant_id) WHERE is_default = TRUE` — enforces single default pipeline per tenant

**Validation Rules**:
- `name` must be non-empty and unique per tenant
- Exactly one pipeline stage of type `CLOSED_WON` and one of type `CLOSED_LOST` must exist
  before the pipeline can be set as the tenant default

---

## Entity: `pipeline_stage`

**Purpose**: An ordered step within a pipeline. Stages define the progression path for deals.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Surrogate key |
| `pipeline_id` | UUID | NOT NULL FK → pipeline(id) ON DELETE RESTRICT | Parent pipeline |
| `tenant_id` | UUID | NOT NULL | Tenant isolation key |
| `name` | VARCHAR(100) | NOT NULL | Stage display name (e.g., "Qualification") |
| `display_order` | SMALLINT | NOT NULL | 1-based ordering within pipeline |
| `default_probability` | SMALLINT | NOT NULL DEFAULT 50, CHECK (0–100) | Pre-fills deal probability on stage entry |
| `stage_type` | ENUM | NOT NULL DEFAULT 'OPEN' | Values: OPEN, CLOSED_WON, CLOSED_LOST |

**Indexes**:
- `UNIQUE (pipeline_id, display_order)` — enforces ordering uniqueness

**Validation Rules**:
- Deletion blocked if any deal with `archived_at IS NULL` references this stage
- `stage_type = CLOSED_WON` → sets deal status to WON on entry
- `stage_type = CLOSED_LOST` → sets deal status to LOST on entry; loss reason prompted

---

## Entity: `deal`

**Purpose**: A single sales opportunity tracked through a pipeline. Central entity of this feature.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Surrogate key |
| `tenant_id` | UUID | NOT NULL | Tenant isolation key |
| `pipeline_id` | UUID | NOT NULL FK → pipeline(id) | Owning pipeline |
| `stage_id` | UUID | NOT NULL FK → pipeline_stage(id) | Current stage |
| `name` | VARCHAR(255) | NOT NULL | Deal display name |
| `value` | NUMERIC(18,2) | NOT NULL | Deal monetary value |
| `currency` | CHAR(3) | NOT NULL DEFAULT 'GBP' | ISO 4217 currency code (tenant default) |
| `close_date` | DATE | NOT NULL | Expected close date |
| `owner_id` | UUID | NOT NULL FK → users(id) | Assigned sales rep |
| `probability` | SMALLINT | NOT NULL DEFAULT 50, CHECK (0–100) | Win probability % |
| `status` | ENUM | NOT NULL DEFAULT 'OPEN' | Values: OPEN, WON, LOST |
| `contact_id` | UUID | FK → contacts(id), nullable | Optional contact association |
| `company_id` | UUID | FK → companies(id), nullable | Optional company association |
| `loss_reason` | TEXT | nullable | Populated when status = LOST |
| `custom_fields` | JSONB | NOT NULL DEFAULT '{}' | Custom field values keyed by field definition name |
| `archived_at` | TIMESTAMPTZ | nullable | Soft-delete timestamp; NULL = active |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

**Indexes**:
- `idx_deal_pipeline_stage ON deal(pipeline_id, stage_id) WHERE archived_at IS NULL` — Kanban board query
- `idx_deal_owner ON deal(tenant_id, owner_id) WHERE archived_at IS NULL` — owner filter
- GIN index on `custom_fields` — custom field search (future)

**Computed value** (not stored): `weighted_value = value * probability / 100`

**State Transitions**:
```
OPEN → WON   (via close action or move to CLOSED_WON stage)
OPEN → LOST  (via close action or move to CLOSED_LOST stage)
WON  → OPEN  (via reopen — Manager/Admin only, future feature)
```

**Business Rules**:
- `stage_id` must reference a stage belonging to `pipeline_id`
- `owner_id` must be an active user in the same tenant
- `contact_id`, `company_id` must belong to the same tenant (enforced at service layer)
- A deal with `archived_at` set cannot be moved to a new stage

---

## Entity: `deal_stage_history`

**Purpose**: Immutable audit trail of every stage transition. Insert-only — no updates or
deletes are permitted at any access level.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Surrogate key |
| `deal_id` | UUID | NOT NULL FK → deal(id) | Parent deal |
| `tenant_id` | UUID | NOT NULL | Tenant isolation key |
| `from_stage_id` | UUID | FK → pipeline_stage(id), nullable | NULL on deal creation (initial placement) |
| `to_stage_id` | UUID | NOT NULL FK → pipeline_stage(id) | Target stage |
| `changed_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | Transition timestamp |
| `changed_by_id` | UUID | NOT NULL FK → users(id) | Actor who made the change |

**Indexes**:
- `idx_deal_stage_history_deal ON deal_stage_history(deal_id, changed_at)` — chronological history fetch

**Immutability enforcement**:
- No `UPDATE` or `DELETE` SQL is ever issued against this table by application code
- No endpoint exposes modification of history records
- History row written in the same transaction as `deal.stage_id` update

---

## Entity: `revenue_target`

**Purpose**: Period-based revenue quota set by a Sales Manager for a pipeline.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Surrogate key |
| `tenant_id` | UUID | NOT NULL | Tenant isolation key |
| `pipeline_id` | UUID | NOT NULL FK → pipeline(id) | Target pipeline |
| `period_type` | ENUM | NOT NULL | Values: MONTHLY, QUARTERLY |
| `target_value` | NUMERIC(18,2) | NOT NULL | Revenue target amount |
| `currency` | CHAR(3) | NOT NULL DEFAULT 'GBP' | Must match tenant default |
| `start_date` | DATE | NOT NULL | First day of the target period |

**Indexes**:
- `UNIQUE (pipeline_id, period_type, start_date)` — one target per pipeline per period

**Progress calculation** (server-side, not stored):
```
progress = SUM(deal.value) WHERE deal.pipeline_id = target.pipeline_id
           AND deal.status = 'WON'
           AND deal.close_date BETWEEN start_date AND period_end_date
```

---

## Entity: `deal_custom_field_definition`

**Purpose**: Admin-defined schema for additional deal attributes. Values stored as JSONB on
the deal record keyed by the definition `name`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Surrogate key |
| `tenant_id` | UUID | NOT NULL | Tenant isolation key |
| `name` | VARCHAR(100) | NOT NULL, UNIQUE per tenant | Key used in `deal.custom_fields` JSONB |
| `field_type` | ENUM | NOT NULL | TEXT, NUMBER, DATE, DROPDOWN, MULTI_SELECT, BOOLEAN |
| `options` | JSONB | nullable | Array of option strings for DROPDOWN / MULTI_SELECT |
| `is_required` | BOOLEAN | NOT NULL DEFAULT FALSE | Client-side + service-side validation |
| `display_order` | SMALLINT | NOT NULL DEFAULT 0 | Rendering order on deal forms |
| `is_active` | BOOLEAN | NOT NULL DEFAULT TRUE | Soft-delete; hidden from forms when FALSE |

**Validation Rules**:
- `options` MUST be non-empty array when `field_type` is DROPDOWN or MULTI_SELECT
- `name` must be unique per tenant (enforced by DB unique constraint)
- Deactivating a definition hides it from all deal forms; existing JSONB values are preserved
  and restored automatically if the field is re-activated

---

## Cross-Feature References

| Entity | Owned By | Reference Direction |
|--------|----------|---------------------|
| `contacts` | 001-contacts-companies | `deal.contact_id` → contacts(id), nullable FK |
| `companies` | 001-contacts-companies | `deal.company_id` → companies(id), nullable FK |
| `users` | 003-auth-authz | `deal.owner_id`, `deal_stage_history.changed_by_id` → users(id) |
