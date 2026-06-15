-- Platform schema: all tables live in the public schema (platform-level entities)

CREATE TYPE tenant_status AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');
CREATE TYPE tier_name    AS ENUM ('STARTER', 'PROFESSIONAL', 'ENTERPRISE');
CREATE TYPE export_status AS ENUM ('PENDING', 'RUNNING', 'COMPLETE', 'FAILED');

-- Subscription tiers with their limits and feature flags
CREATE TABLE tier_definitions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    tier_name NOT NULL UNIQUE,
    max_users               INTEGER NOT NULL,
    max_custom_fields       INTEGER NOT NULL,
    api_rate_limit_per_min  INTEGER NOT NULL,
    feature_flags           TEXT[]  NOT NULL DEFAULT '{}'
);

INSERT INTO tier_definitions (name, max_users, max_custom_fields, api_rate_limit_per_min, feature_flags) VALUES
  ('STARTER',      5,   10, 60,  ARRAY[]::TEXT[]),
  ('PROFESSIONAL', 25,  50, 300, ARRAY['SSO']::TEXT[]),
  ('ENTERPRISE',   -1, -1,  -1,  ARRAY['SSO','CUSTOM_REPORTS','WEBHOOKS']::TEXT[]);

-- One row per provisioned tenant
CREATE TABLE tenants (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug             VARCHAR(63)   NOT NULL UNIQUE,
    display_name     VARCHAR(200)  NOT NULL,
    status           tenant_status NOT NULL DEFAULT 'ACTIVE',
    tier             tier_name     NOT NULL DEFAULT 'STARTER',
    seed_admin_email VARCHAR(320)  NOT NULL,
    provisioned_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    suspended_at     TIMESTAMPTZ,
    deactivated_at   TIMESTAMPTZ
);

CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_tier   ON tenants(tier);

-- Periodic resource usage snapshots for the monitoring dashboard
CREATE TABLE tenant_metrics_snapshots (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    active_user_count  INTEGER      NOT NULL DEFAULT 0,
    total_record_count BIGINT       NOT NULL DEFAULT 0,
    api_call_count_30d BIGINT       NOT NULL DEFAULT 0,
    storage_bytes      BIGINT       NOT NULL DEFAULT 0,
    snapshot_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_metrics_tenant_at ON tenant_metrics_snapshots(tenant_id, snapshot_at DESC);

-- Async GDPR export jobs
CREATE TABLE data_export_jobs (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    status        export_status NOT NULL DEFAULT 'PENDING',
    download_url  TEXT,
    expires_at    TIMESTAMPTZ,
    triggered_by  UUID,
    triggered_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    completed_at  TIMESTAMPTZ,
    error_message TEXT
);

CREATE INDEX idx_export_jobs_tenant ON data_export_jobs(tenant_id, triggered_at DESC);
