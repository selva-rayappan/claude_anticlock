-- OpsNext Platform Schema (public schema)
-- Managed by Flyway, applied once at startup

-- Extensions (requires superuser or pg_extension privilege)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
    id               VARCHAR(36) PRIMARY KEY,
    slug             VARCHAR(63) UNIQUE NOT NULL,
    name             VARCHAR(200) NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                         CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DELETED')),
    subscription_tier VARCHAR(20) NOT NULL DEFAULT 'BASIC'
                         CHECK (subscription_tier IN ('BASIC', 'PROFESSIONAL', 'ENTERPRISE')),
    schema_name      VARCHAR(100) NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants (slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants (status) WHERE deleted_at IS NULL;

-- Tenant configs
CREATE TABLE IF NOT EXISTS public.tenant_configs (
    id             VARCHAR(36) PRIMARY KEY,
    tenant_id      VARCHAR(36) NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
    logo_url       TEXT,
    primary_color  VARCHAR(7),
    timezone       VARCHAR(50) NOT NULL DEFAULT 'UTC',
    currency       VARCHAR(3) NOT NULL DEFAULT 'USD',
    language       VARCHAR(10) NOT NULL DEFAULT 'en',
    date_format    VARCHAR(20) NOT NULL DEFAULT 'MM/DD/YYYY',
    feature_flags  JSONB DEFAULT '{}',
    sso_provider   VARCHAR(50),
    sso_config     JSONB,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tenant subscriptions
CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
    id                  VARCHAR(36) PRIMARY KEY,
    tenant_id           VARCHAR(36) NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
    stripe_customer_id  VARCHAR(100),
    stripe_price_id     VARCHAR(100),
    status              VARCHAR(20) DEFAULT 'TRIALING',
    current_period_start TIMESTAMPTZ,
    current_period_end  TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tenant usage metrics (denormalised counters updated by background jobs)
CREATE TABLE IF NOT EXISTS public.tenant_usage_metrics (
    tenant_id          VARCHAR(36) PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_count         INTEGER NOT NULL DEFAULT 0,
    contact_count      INTEGER NOT NULL DEFAULT 0,
    account_count      INTEGER NOT NULL DEFAULT 0,
    lead_count         INTEGER NOT NULL DEFAULT 0,
    opportunity_count  INTEGER NOT NULL DEFAULT 0,
    api_calls_mtd      INTEGER NOT NULL DEFAULT 0,
    storage_bytes      BIGINT NOT NULL DEFAULT 0,
    last_computed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Platform admins (separate from tenant users)
CREATE TABLE IF NOT EXISTS public.platform_admins (
    id              VARCHAR(36) PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    mfa_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Triggers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tenants_updated_at') THEN
        CREATE TRIGGER trg_tenants_updated_at
            BEFORE UPDATE ON public.tenants
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
    END IF;
END;
$$;
