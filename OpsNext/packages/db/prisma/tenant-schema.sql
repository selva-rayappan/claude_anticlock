-- ═══════════════════════════════════════════════════════════════════════
-- OpsNext CRM — Tenant Schema Template
-- This SQL is executed once per tenant on schema provisioning.
-- Replace :schema_name with the actual tenant schema name (e.g., tenant_acme).
-- ═══════════════════════════════════════════════════════════════════════

-- ── Enums ──────────────────────────────────────────────────────────────

CREATE TYPE user_status AS ENUM ('ACTIVE', 'INVITED', 'DEACTIVATED');
CREATE TYPE resource_type AS ENUM ('CONTACT','ACCOUNT','LEAD','OPPORTUNITY','PIPELINE','REPORT','WORKFLOW','USER','SETTING');
CREATE TYPE action_type AS ENUM ('CREATE','READ','UPDATE','DELETE','EXPORT');
CREATE TYPE scope_type AS ENUM ('ALL','OWN');
CREATE TYPE company_size AS ENUM ('MICRO','SMALL','MEDIUM','LARGE','ENTERPRISE');
CREATE TYPE lead_status AS ENUM ('NEW','CONTACTED','QUALIFIED','UNQUALIFIED','CONVERTED');
CREATE TYPE activity_type AS ENUM ('CALL','EMAIL','MEETING','NOTE','TASK');
CREATE TYPE entity_type AS ENUM ('CONTACT','ACCOUNT','LEAD','OPPORTUNITY');
CREATE TYPE task_priority AS ENUM ('LOW','MEDIUM','HIGH','URGENT');
CREATE TYPE task_status AS ENUM ('OPEN','IN_PROGRESS','COMPLETED','CANCELLED');
CREATE TYPE custom_field_type AS ENUM ('TEXT','NUMBER','DATE','DROPDOWN','MULTI_SELECT','BOOLEAN','URL','EMAIL');
CREATE TYPE workflow_trigger_type AS ENUM ('RECORD_CREATED','RECORD_UPDATED','STAGE_CHANGED','DATE_REACHED','TAG_ADDED');
CREATE TYPE workflow_execution_status AS ENUM ('PENDING','RUNNING','SUCCESS','FAILED','SKIPPED');
CREATE TYPE import_status AS ENUM ('PENDING','PROCESSING','COMPLETED','FAILED');
CREATE TYPE notification_type AS ENUM ('TASK_DUE','DEAL_STAGE_CHANGED','NEW_ASSIGNMENT','MENTION','WORKFLOW_TRIGGERED','IMPORT_COMPLETE','STALE_DEAL','SYSTEM_ALERT');
CREATE TYPE audit_action AS ENUM ('CREATE','UPDATE','DELETE');

-- ── Extensions ─────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users & IAM ────────────────────────────────────────────────────────

CREATE TABLE users (
  id                     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email                  TEXT NOT NULL,
  password_hash          TEXT,
  first_name             VARCHAR(100) NOT NULL,
  last_name              VARCHAR(100) NOT NULL,
  avatar_url             VARCHAR(500),
  status                 user_status NOT NULL DEFAULT 'INVITED',
  mfa_enabled            BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_secret             TEXT,
  password_changed_at    TIMESTAMPTZ,
  failed_login_attempts  INT NOT NULL DEFAULT 0,
  locked_until           TIMESTAMPTZ,
  invite_token           TEXT,
  invite_expires_at      TIMESTAMPTZ,
  email_verified_at      TIMESTAMPTZ,
  push_token             TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX users_email_idx ON users (email);
CREATE INDEX users_status_idx ON users (status);

CREATE TABLE roles (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT roles_name_unique UNIQUE (name)
);

CREATE TABLE permissions (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  resource  resource_type NOT NULL,
  action    action_type NOT NULL,
  scope     scope_type NOT NULL DEFAULT 'ALL',
  CONSTRAINT permissions_unique UNIQUE (resource, action, scope)
);

CREATE TABLE user_roles (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id     TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by TEXT,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
  role_id       TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE sessions (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token          TEXT NOT NULL,
  refresh_token  TEXT NOT NULL,
  expires_at     TIMESTAMPTZ NOT NULL,
  ip_address     VARCHAR(45),
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX sessions_token_idx ON sessions (token);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

-- ── Custom Field Definitions ────────────────────────────────────────────

CREATE TABLE custom_field_definitions (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  entity_type     entity_type NOT NULL,
  field_key       VARCHAR(100) NOT NULL,
  label           VARCHAR(255) NOT NULL,
  field_type      custom_field_type NOT NULL,
  options         JSONB,
  required        BOOLEAN NOT NULL DEFAULT FALSE,
  display_order   INT NOT NULL DEFAULT 0,
  visible_to_roles TEXT[] DEFAULT ARRAY[]::TEXT[],
  editable_by_roles TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT custom_field_definitions_unique UNIQUE (entity_type, field_key)
);

-- ── Accounts ────────────────────────────────────────────────────────────

CREATE TABLE accounts (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name             VARCHAR(255) NOT NULL,
  domain           VARCHAR(255),
  industry         VARCHAR(100),
  size             company_size,
  annual_revenue   DECIMAL(18,2),
  currency         VARCHAR(3),
  website          VARCHAR(500),
  description      TEXT,
  address          JSONB,
  owner_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
  parent_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  tags             TEXT[] DEFAULT ARRAY[]::TEXT[],
  source           VARCHAR(100),
  custom_fields    JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX accounts_owner_id_idx ON accounts (owner_id) WHERE deleted_at IS NULL;
CREATE INDEX accounts_domain_idx ON accounts (domain) WHERE deleted_at IS NULL;
CREATE INDEX accounts_name_trgm_idx ON accounts USING GIN (name gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX accounts_tags_idx ON accounts USING GIN (tags) WHERE deleted_at IS NULL;
CREATE INDEX accounts_custom_fields_idx ON accounts USING GIN (custom_fields) WHERE deleted_at IS NULL;

-- ── Contacts ────────────────────────────────────────────────────────────

CREATE TABLE contacts (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  phones          JSONB DEFAULT '[]',
  title           VARCHAR(150),
  account_id      TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  owner_id        TEXT REFERENCES users(id) ON DELETE SET NULL,
  address         JSONB,
  social_handles  JSONB,
  tags            TEXT[] DEFAULT ARRAY[]::TEXT[],
  source          VARCHAR(100),
  lead_source     VARCHAR(100),
  email_opt_out   BOOLEAN DEFAULT FALSE,
  consent_given_at TIMESTAMPTZ,
  consent_source  VARCHAR(100),
  custom_fields   JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  CONSTRAINT contacts_email_unique UNIQUE (email)
);

CREATE INDEX contacts_email_idx ON contacts (email) WHERE deleted_at IS NULL;
CREATE INDEX contacts_owner_id_idx ON contacts (owner_id) WHERE deleted_at IS NULL;
CREATE INDEX contacts_account_id_idx ON contacts (account_id) WHERE deleted_at IS NULL;
CREATE INDEX contacts_name_trgm_idx ON contacts USING GIN ((first_name || ' ' || last_name) gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX contacts_tags_idx ON contacts USING GIN (tags) WHERE deleted_at IS NULL;
CREATE INDEX contacts_custom_fields_idx ON contacts USING GIN (custom_fields) WHERE deleted_at IS NULL;

-- Contact ↔ Account many-to-many (secondary associations)
CREATE TABLE contact_accounts (
  contact_id  TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  is_primary  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (contact_id, account_id)
);

-- ── Leads ────────────────────────────────────────────────────────────────

CREATE TABLE leads (
  id                          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  first_name                  VARCHAR(100) NOT NULL,
  last_name                   VARCHAR(100) NOT NULL,
  email                       VARCHAR(255),
  phone                       VARCHAR(30),
  company                     VARCHAR(255),
  source                      VARCHAR(100),
  status                      lead_status NOT NULL DEFAULT 'NEW',
  owner_id                    TEXT REFERENCES users(id) ON DELETE SET NULL,
  score                       INT NOT NULL DEFAULT 0,
  converted_at                TIMESTAMPTZ,
  converted_to_contact_id     TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  converted_to_account_id     TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  converted_to_opportunity_id TEXT,
  custom_fields               JSONB DEFAULT '{}',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at                  TIMESTAMPTZ
);

CREATE INDEX leads_owner_id_status_idx ON leads (owner_id, status) WHERE deleted_at IS NULL;
CREATE INDEX leads_status_idx ON leads (status) WHERE deleted_at IS NULL;
CREATE INDEX leads_score_idx ON leads (score DESC) WHERE deleted_at IS NULL;
CREATE INDEX leads_email_idx ON leads (email) WHERE deleted_at IS NULL AND email IS NOT NULL;

-- ── Pipelines & Stages ──────────────────────────────────────────────────

CREATE TABLE pipelines (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pipeline_stages (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  pipeline_id     TEXT NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  display_order   INT NOT NULL DEFAULT 0,
  probability     INT NOT NULL DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  is_closed       BOOLEAN NOT NULL DEFAULT FALSE,
  is_won          BOOLEAN NOT NULL DEFAULT FALSE,
  required_fields TEXT[] DEFAULT ARRAY[]::TEXT[],
  rot_color       VARCHAR(7),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX pipeline_stages_pipeline_id_idx ON pipeline_stages (pipeline_id, display_order);

-- ── Opportunities ────────────────────────────────────────────────────────

CREATE TABLE opportunities (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name                 VARCHAR(255) NOT NULL,
  account_id           TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  contact_id           TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  pipeline_id          TEXT NOT NULL REFERENCES pipelines(id) ON DELETE RESTRICT,
  stage_id             TEXT NOT NULL REFERENCES pipeline_stages(id) ON DELETE RESTRICT,
  owner_id             TEXT REFERENCES users(id) ON DELETE SET NULL,
  value                DECIMAL(18,2) NOT NULL DEFAULT 0,
  currency             VARCHAR(3) NOT NULL DEFAULT 'USD',
  probability          INT NOT NULL DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  expected_close_date  DATE,
  close_reason         VARCHAR(500),
  close_note           TEXT,
  custom_fields        JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ
);

CREATE INDEX opportunities_stage_id_idx ON opportunities (stage_id) WHERE deleted_at IS NULL;
CREATE INDEX opportunities_owner_id_idx ON opportunities (owner_id) WHERE deleted_at IS NULL;
CREATE INDEX opportunities_expected_close_date_idx ON opportunities (expected_close_date) WHERE deleted_at IS NULL;
CREATE INDEX opportunities_pipeline_id_idx ON opportunities (pipeline_id) WHERE deleted_at IS NULL;

CREATE TABLE opportunity_stage_history (
  id                        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  opportunity_id            TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  from_stage_id             TEXT REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  to_stage_id               TEXT NOT NULL REFERENCES pipeline_stages(id) ON DELETE RESTRICT,
  changed_by                TEXT REFERENCES users(id) ON DELETE SET NULL,
  changed_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_in_previous_stage INT
);

CREATE INDEX opp_stage_history_opp_idx ON opportunity_stage_history (opportunity_id, changed_at DESC);

CREATE TABLE opportunity_value_history (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  opportunity_id  TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  value           DECIMAL(18,2) NOT NULL,
  changed_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Activities ──────────────────────────────────────────────────────────

CREATE TABLE activities (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type             activity_type NOT NULL,
  entity_type      entity_type NOT NULL,
  entity_id        TEXT NOT NULL,
  subject          VARCHAR(500) NOT NULL,
  body             TEXT,
  outcome          TEXT,
  duration_minutes INT,
  scheduled_at     TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  participants     JSONB DEFAULT '[]',
  attachments      JSONB DEFAULT '[]',
  owner_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
  pinned           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX activities_entity_idx ON activities (entity_type, entity_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX activities_owner_id_idx ON activities (owner_id) WHERE deleted_at IS NULL;
CREATE INDEX activities_type_idx ON activities (type) WHERE deleted_at IS NULL;

-- ── Tasks ───────────────────────────────────────────────────────────────

CREATE TABLE tasks (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title       VARCHAR(500) NOT NULL,
  description TEXT,
  priority    task_priority NOT NULL DEFAULT 'MEDIUM',
  status      task_status NOT NULL DEFAULT 'OPEN',
  due_at      TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  entity_type entity_type,
  entity_id   TEXT,
  reminder_at TIMESTAMPTZ,
  created_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX tasks_assignee_status_due_idx ON tasks (assignee_id, status, due_at);
CREATE INDEX tasks_entity_idx ON tasks (entity_type, entity_id) WHERE status != 'COMPLETED';

-- ── Workflows ────────────────────────────────────────────────────────────

CREATE TABLE workflows (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  trigger_type    workflow_trigger_type NOT NULL,
  trigger_config  JSONB NOT NULL DEFAULT '{}',
  conditions      JSONB NOT NULL DEFAULT '[]',
  actions         JSONB NOT NULL DEFAULT '[]',
  run_count       INT NOT NULL DEFAULT 0,
  last_run_at     TIMESTAMPTZ,
  created_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workflow_executions (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workflow_id          TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  trigger_entity_type  entity_type NOT NULL,
  trigger_entity_id    TEXT NOT NULL,
  trigger_event_id     TEXT NOT NULL,
  status               workflow_execution_status NOT NULL DEFAULT 'PENDING',
  started_at           TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  action_results       JSONB DEFAULT '[]',
  error_message        TEXT,
  CONSTRAINT wf_exec_unique UNIQUE (workflow_id, trigger_entity_id, trigger_event_id)
);

CREATE INDEX wf_executions_workflow_idx ON workflow_executions (workflow_id, started_at DESC);

-- ── Notifications ────────────────────────────────────────────────────────

CREATE TABLE notifications (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      VARCHAR(500) NOT NULL,
  body       TEXT NOT NULL,
  data       JSONB DEFAULT '{}',
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_unread_idx ON notifications (user_id, created_at DESC) WHERE read_at IS NULL;

-- ── Webhook Subscriptions ─────────────────────────────────────────────────

CREATE TABLE webhook_subscriptions (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  url              VARCHAR(2000) NOT NULL,
  secret           TEXT NOT NULL,
  events           TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  failure_count    INT NOT NULL DEFAULT 0,
  last_delivery_at TIMESTAMPTZ,
  created_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE webhook_deliveries (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  subscription_id  TEXT NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  event_type       VARCHAR(100) NOT NULL,
  payload          JSONB NOT NULL,
  status_code      INT,
  response_body    TEXT,
  latency_ms       INT,
  attempt          INT NOT NULL DEFAULT 1,
  delivered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX webhook_deliveries_sub_idx ON webhook_deliveries (subscription_id, delivered_at DESC);

-- ── Import Jobs ──────────────────────────────────────────────────────────

CREATE TABLE import_jobs (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  entity_type      entity_type NOT NULL,
  status           import_status NOT NULL DEFAULT 'PENDING',
  file_name        VARCHAR(500),
  file_url         VARCHAR(2000),
  total_rows       INT,
  processed_rows   INT NOT NULL DEFAULT 0,
  error_rows       INT NOT NULL DEFAULT 0,
  field_mapping    JSONB DEFAULT '{}',
  error_report     JSONB DEFAULT '[]',
  created_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ
);

-- ── Segments ──────────────────────────────────────────────────────────────

CREATE TABLE segments (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name             VARCHAR(255) NOT NULL,
  entity_type      entity_type NOT NULL,
  filter_tree      JSONB NOT NULL DEFAULT '{}',
  count            INT DEFAULT 0,
  last_computed_at TIMESTAMPTZ,
  is_pinned        BOOLEAN NOT NULL DEFAULT FALSE,
  created_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Audit Logs (append-only) ──────────────────────────────────────────────

CREATE TABLE audit_logs (
  id          BIGSERIAL,
  entity_type entity_type NOT NULL,
  entity_id   TEXT NOT NULL,
  action      audit_action NOT NULL,
  user_id     TEXT,
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  before      JSONB,
  after       JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE INDEX audit_logs_created_at_idx ON audit_logs USING BRIN (created_at);
CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id);
CREATE INDEX audit_logs_user_id_idx ON audit_logs (user_id);

-- Create initial monthly partition
CREATE TABLE audit_logs_default PARTITION OF audit_logs DEFAULT;

-- ── API Keys ──────────────────────────────────────────────────────────────

CREATE TABLE api_keys (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key_hash     TEXT NOT NULL UNIQUE,
  prefix       VARCHAR(8) NOT NULL,
  name         VARCHAR(255) NOT NULL,
  scopes       TEXT[] DEFAULT ARRAY[]::TEXT[],
  last_used_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  created_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active    BOOLEAN NOT NULL DEFAULT TRUE
);

-- ── Email Sequences ───────────────────────────────────────────────────────

CREATE TABLE email_sequences (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        VARCHAR(255) NOT NULL,
  steps       JSONB NOT NULL DEFAULT '[]',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sequence_enrollments (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sequence_id    TEXT NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  contact_id     TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  current_step   INT NOT NULL DEFAULT 0,
  status         VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  enrolled_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at   TIMESTAMPTZ,
  CONSTRAINT enrollment_unique UNIQUE (sequence_id, contact_id)
);

-- ── Updated-at triggers ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_pipelines_updated_at BEFORE UPDATE ON pipelines FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_webhook_subscriptions_updated_at BEFORE UPDATE ON webhook_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_segments_updated_at BEFORE UPDATE ON segments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
