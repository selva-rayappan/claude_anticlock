# Feature Specification: Tenant & Platform Management

**Feature Branch**: `002-tenant-platform`

**Created**: 2026-06-15

**Status**: Draft

**Input**: User description: "Tenant & Platform Management" — derived from
`specs/ops-crm-functional-requirements.md` section 4.1.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Tenant Provisioning (Priority: P1)

A Platform Admin creates a new customer organisation (tenant) by providing a unique slug,
display name, and the seed email address for the first Tenant Admin. The system
automatically allocates isolated storage for that tenant, seeds default configuration, and
sends an invitation to the new Tenant Admin.

**Why this priority**: Without tenant provisioning there is no way to onboard a customer.
Every other feature depends on a properly provisioned, isolated tenant existing first.

**Independent Test**: Call the provision endpoint with a unique slug and display name.
Verify the new tenant appears in the platform admin panel. Verify a login attempt with
the seeded admin credentials succeeds and lands on that tenant's dashboard. Verify a
login for a different tenant cannot access the new tenant's data.

**Acceptance Scenarios**:

1. **Given** a Platform Admin submits a provisioning request with unique slug "acme" and
   display name "Acme Corp", **When** accepted, **Then** the new tenant is visible in the
   platform panel, an invitation is sent to the seed email, and the tenant's data storage
   is fully isolated from all other tenants.
2. **Given** a Platform Admin attempts to provision a tenant with a slug already in use,
   **When** submitted, **Then** the request is rejected with a clear duplicate-slug error.
3. **Given** a newly provisioned tenant, **When** the seed Tenant Admin follows the
   invitation link and sets their password, **Then** they can sign in and access their
   tenant's CRM with Admin role.
4. **Given** two tenants exist (A and B), **When** a user authenticated to tenant A makes
   a request, **Then** they cannot read or write any data belonging to tenant B regardless
   of the request parameters used.

---

### User Story 2 — Tenant Suspension & Deactivation (Priority: P1)

A Platform Admin can suspend a tenant (temporarily blocking all access) or permanently
deactivate it (irreversible). Suspension is immediately effective — all active sessions
for the suspended tenant are invalidated.

**Why this priority**: Necessary for billing enforcement, abuse handling, and regulatory
compliance. Without this, the platform operator has no lever to stop a problematic tenant.

**Independent Test**: Suspend a tenant while a user from that tenant is signed in. Verify
the next request from that user returns an access-denied response. Reactivate the tenant
and verify sign-in works again.

**Acceptance Scenarios**:

1. **Given** an active tenant has signed-in users, **When** a Platform Admin suspends it,
   **Then** all active sessions for that tenant are immediately invalidated and subsequent
   requests from those sessions receive a "tenant suspended" response.
2. **Given** a suspended tenant, **When** a Platform Admin reactivates it, **Then** users
   can sign in again and all data is intact.
3. **Given** a Platform Admin permanently deactivates a tenant, **When** confirmed with a
   second prompt, **Then** all sessions are invalidated, the tenant is marked permanently
   deactivated, and no future sign-in is possible for that tenant.
4. **Given** a suspended tenant, **When** a sign-in is attempted, **Then** the user sees
   a clear "account suspended — contact support" message; no session is created.

---

### User Story 3 — Tenant Resource Monitoring (Priority: P2)

A Platform Admin can view a dashboard showing per-tenant usage metrics: number of active
users, total CRM records, API call count (last 30 days), and storage consumed. The
dashboard supports filtering and sorting across all tenants.

**Why this priority**: Needed to detect abuse, enforce tier limits, and make informed
upsell decisions. Operational visibility is required before any real customer volume.

**Independent Test**: With two provisioned tenants (one with 50 records, one with 200),
open the monitoring dashboard and verify both rows show correct record counts and the
table is sortable by any column.

**Acceptance Scenarios**:

1. **Given** a Platform Admin views the monitoring dashboard, **When** it loads,
   **Then** every active tenant appears as a row showing: slug, display name, active user
   count, total records, API calls (last 30 days), storage used, and status.
2. **Given** the dashboard is loaded, **When** the admin sorts by "API calls (30d)"
   descending, **Then** the highest-usage tenant appears first.
3. **Given** the dashboard is loaded, **When** the admin filters by status "Suspended",
   **Then** only suspended tenants are shown.

---

### User Story 4 — Subscription Tier Configuration (Priority: P2)

A Platform Admin can assign a subscription tier (Starter, Professional, Enterprise) to
each tenant. The system enforces the feature limits and entitlements for that tier across
all operations in the tenant.

**Why this priority**: Required for monetisation. Without tier enforcement, all tenants
effectively get the most expensive tier for free.

**Independent Test**: Assign "Starter" tier to a tenant with a 5-user limit. Add 5 users
and attempt to add a 6th — verify it is blocked with a tier-limit error. Upgrade to
"Professional" and verify the 6th user can now be added.

**Acceptance Scenarios**:

1. **Given** a Platform Admin assigns the "Starter" tier to a tenant, **When** that
   tenant's Tenant Admin tries to add more users than the tier allows, **Then** the
   action is blocked with a clear "tier limit reached — upgrade to add more users" message.
2. **Given** a tenant on "Professional" tier, **When** the Platform Admin upgrades it to
   "Enterprise", **Then** the higher limits and any Enterprise-only features take effect
   immediately without requiring any user sign-out.
3. **Given** a tier defines feature flags (e.g., SSO is Enterprise-only), **When** a
   non-Enterprise tenant's admin attempts to configure SSO, **Then** the option is
   visible but disabled with an "upgrade required" label.

---

### User Story 5 — GDPR Tenant Data Export (Priority: P3)

A Platform Admin can trigger a full data export for a specific tenant. The export is
generated asynchronously, and the Platform Admin is notified when the archive is ready
for download.

**Why this priority**: Required for GDPR compliance — operators must be able to fulfil
data portability requests. Placed at P3 as it is rarely invoked and not a day-to-day
operation.

**Independent Test**: Trigger an export for a tenant with 100 contacts and 20 companies.
Verify a download link is provided within 60 seconds. Download the archive and confirm
it contains all records in JSON format with no data from other tenants.

**Acceptance Scenarios**:

1. **Given** a Platform Admin triggers a data export for tenant "acme", **When** the
   export completes, **Then** a download link is available in the Platform Admin panel
   for a time-limited period (24 hours).
2. **Given** a data export archive, **When** inspected, **Then** it contains all contacts,
   companies, deals, activities, and users for that tenant in JSON format, and contains
   no records from any other tenant.
3. **Given** a data export is triggered for a large tenant (>10,000 records), **When**
   processing, **Then** a progress indicator is visible in the Platform Admin panel and
   the admin is not required to keep the page open.

---

### Edge Cases

- What happens if a slug contains special characters or whitespace? → Slugs are validated
  as lowercase alphanumeric with hyphens only; any other character is rejected with a
  clear validation error before provisioning begins.
- What if a Platform Admin triggers a data export for a tenant that is currently being
  deactivated? → The export job captures the state at the moment of triggering; if
  deactivation completes first, the export still includes the final state of all records.
- What happens if the same slug is requested in two simultaneous provisioning requests? →
  A database-level unique constraint ensures only one succeeds; the second receives a
  duplicate-slug error.
- What if a tenant is suspended while a data export is in progress? → The export
  continues to completion; suspension only blocks user sign-in, not background jobs.
- What if no tier is assigned to a tenant? → The system defaults to "Starter" limits until
  an explicit tier is assigned by the Platform Admin.

---

## Requirements *(mandatory)*

### Functional Requirements

**Tenant Provisioning (P1 — User Story 1)**
- **FR-TPM-001**: Platform Admin MUST be able to create a new tenant by providing:
  a globally unique slug (lowercase alphanumeric + hyphens), display name, and seed admin
  email address.
- **FR-TPM-002**: Provisioning MUST create a fully isolated data partition for the tenant;
  no existing tenant's data MUST be accessible from the new tenant's context.
- **FR-TPM-003**: Provisioning MUST seed: a default pipeline, default user roles, and an
  Admin user account linked to the seed email.
- **FR-TPM-004**: Provisioning MUST send an email invitation to the seed admin address
  containing a one-time setup link valid for 72 hours.
- **FR-TPM-005**: Duplicate slug requests MUST be rejected with a machine-readable error
  before any data is written.

**Tenant Suspension & Deactivation (P1 — User Story 2)**
- **FR-TPM-006**: Platform Admin MUST be able to suspend a tenant; suspension MUST
  invalidate all active sessions for that tenant within 5 seconds.
- **FR-TPM-007**: Platform Admin MUST be able to reactivate a suspended tenant; all data
  MUST be fully intact upon reactivation.
- **FR-TPM-008**: Platform Admin MUST be able to permanently deactivate a tenant; permanent
  deactivation MUST require explicit confirmation and MUST be irreversible through the UI.
- **FR-TPM-009**: Any sign-in attempt to a suspended or deactivated tenant MUST return a
  clear status message and MUST NOT create a session.

**Resource Monitoring (P2 — User Story 3)**
- **FR-TPM-010**: Platform Admin dashboard MUST display per-tenant metrics: active user
  count, total CRM record count, API call count (last 30 days), storage consumed, status.
- **FR-TPM-011**: The monitoring dashboard MUST support sorting by any metric column and
  filtering by tenant status (Active, Suspended, Deactivated).

**Subscription Tier Management (P2 — User Story 4)**
- **FR-TPM-012**: Platform Admin MUST be able to assign one of three tiers to a tenant:
  Starter, Professional, Enterprise.
- **FR-TPM-013**: The system MUST enforce tier limits on every relevant operation (e.g.,
  user count, custom field count, API rate limits); enforcement MUST return a
  machine-readable `TIER_LIMIT_REACHED` error with the current tier and limit.
- **FR-TPM-014**: Tier upgrades MUST take effect immediately without requiring user
  sign-out or session refresh.
- **FR-TPM-015**: Features restricted to higher tiers MUST be visible in the UI but
  disabled with an "upgrade required" indicator for tenants on lower tiers.

**GDPR Data Export (P3 — User Story 5)**
- **FR-TPM-016**: Platform Admin MUST be able to trigger a full data export for any
  tenant; the export MUST run asynchronously.
- **FR-TPM-017**: Completed exports MUST be available for download for 24 hours via a
  time-limited, authenticated link.
- **FR-TPM-018**: Export archives MUST contain all tenant records (contacts, companies,
  deals, activities, users) in JSON format and MUST contain zero records from other tenants.

### Key Entities

- **Tenant**: The core platform entity. Fields: id, slug (unique), displayName, status
  (ACTIVE | SUSPENDED | DEACTIVATED), tier (STARTER | PROFESSIONAL | ENTERPRISE),
  seedAdminEmail, provisionedAt, suspendedAt, deactivatedAt.
- **TierDefinition**: Configuration for each tier. Fields: tier, maxUsers, maxCustomFields,
  apiRateLimitPerMinute, features (JSON array of enabled feature flags).
- **TenantMetricsSnapshot**: Cached usage metrics. Fields: tenantId, activeUserCount,
  totalRecordCount, apiCallCount30d, storageBytes, snapshotAt.
- **DataExportJob**: Async export job. Fields: id, tenantId, status (PENDING | RUNNING |
  COMPLETE | FAILED), downloadUrl, expiresAt, triggeredBy, triggeredAt, completedAt.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new tenant can be fully provisioned (from request to seed admin receiving
  invitation) in under 30 seconds.
- **SC-002**: Tenant suspension invalidates all active sessions within 5 seconds of the
  suspension action being confirmed.
- **SC-003**: Cross-tenant data isolation is verified with zero leakage across a test
  suite covering all entity types and all API endpoints.
- **SC-004**: The monitoring dashboard loads data for up to 500 tenants in under 3 seconds.
- **SC-005**: Tier limit enforcement blocks over-quota operations 100% of the time with
  no false positives on in-quota operations — verified by boundary tests.
- **SC-006**: A GDPR data export for a tenant with 10,000 records completes in under
  60 seconds and contains exactly that tenant's records.

---

## Assumptions

- The Platform Admin is an internal Ops SaaS operator; there is no self-service tenant
  sign-up in this phase — all tenant creation is operator-initiated.
- Tenant slug is immutable after provisioning; renaming a tenant uses the `displayName`
  field only.
- Tier definitions (limits and feature flags) are seeded as configuration at deploy time,
  not dynamically editable through the UI in this phase.
- The "Starter" tier defaults apply to any newly provisioned tenant until an explicit tier
  is assigned.
- GDPR export covers CRM data only (contacts, companies, deals, activities, users); email
  logs, audit logs, and raw API logs are out of scope for the export in this phase.
- The Platform Admin UI is a separate privileged section of the web app accessible only
  to accounts with the `PLATFORM_ADMIN` role — not accessible to any Tenant Admin or
  lower role.
- Email delivery for the seed admin invitation relies on the platform's configured
  transactional email service.
- Multi-region data residency is out of scope for this phase.
