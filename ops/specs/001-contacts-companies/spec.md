# Feature Specification: Contacts & Companies Management

**Feature Branch**: `001-contacts-companies`

**Created**: 2026-06-15

**Status**: Draft

**Input**: Phase 2 of OpsNext CRM — Contact and Company core modules derived from
`specs/ops-crm-functional-requirements.md` sections 4.3 and 4.4.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Contact CRUD + Search + Audit Log (Priority: P1)

A Sales Rep can create, view, update, and soft-delete contacts within their tenant.
A Sales Manager can manage any contact in the tenant. All changes are audit-logged.
The contact list supports keyword search returning results in under 500 ms.

**Why this priority**: Without contact management there is no CRM. This is the
foundational data entity all other features (deals, activities, pipelines) attach to.

**Independent Test**: Start the app (`docker compose up`), log in as a Sales Rep, create
a new contact, edit it, search for it by email, and verify the audit log entry. Delivers
a usable contact directory with no other features needed.

**Acceptance Scenarios**:

1. **Given** an authenticated Sales Rep, **When** they submit a contact form with firstName,
   lastName, and email, **Then** a contact is created and appears in the paginated list.
2. **Given** an existing contact, **When** the Sales Rep updates the job title,
   **Then** the change is saved and an audit log entry records (who, field, old value, new value).
3. **Given** a Sales Rep searches by email fragment, **When** the query is submitted,
   **Then** matching contacts are returned within 500 ms for a dataset of 100k contacts.
4. **Given** a Sales Rep deletes a contact, **When** confirmed, **Then** the contact is
   soft-deleted (archived) and no longer visible in the list; hard-delete requires Tenant Admin.
5. **Given** a Read-Only user, **When** they attempt to create or update a contact,
   **Then** the API returns HTTP 403.

---

### User Story 2 — Company CRUD + Contact Associations (Priority: P1)

A Sales Rep can create and manage Company (Account) records. Contacts can be linked to
one or more companies. A company detail view shows all associated contacts.

**Why this priority**: Contacts without company context have limited CRM value.
Company records are also required as the parent entity for Deals (Phase 3).

**Independent Test**: Create a company, link two contacts to it, open the company detail
page, and verify both contacts appear. No Deal or Pipeline feature needed.

**Acceptance Scenarios**:

1. **Given** an authenticated Sales Rep, **When** they create a company with name and
   industry, **Then** the company appears in the company list.
2. **Given** an existing contact and company, **When** the Sales Rep links the contact
   to the company, **Then** the company detail page shows that contact in its people list.
3. **Given** a company name search query, **When** submitted, **Then** matching companies
   are returned; domain and industry filters also narrow results correctly.
4. **Given** a company is soft-deleted, **When** the deletion is confirmed, **Then** all
   contact-company associations are preserved but marked inactive.

---

### User Story 3 — Contact Enrichment: Tags, Custom Fields & Timeline (Priority: P2)

A Tenant Admin can define custom fields (text, number, date, dropdown, multi-select,
boolean) that appear on every contact. Sales Reps can tag contacts and filter the list
by tag. The contact detail page shows a chronological activity timeline.

**Why this priority**: Tagging and custom fields unlock segment-based workflows.
Timeline is required by the FRS (FR-CON-009) and referenced in Contact detail UI.

**Independent Test**: Define a custom dropdown field named "Industry Fit" with options
(High, Medium, Low) via Tenant Admin settings, set it on a contact, filter contacts by
tag "hot-lead", and verify the timeline shows the field change event.

**Acceptance Scenarios**:

1. **Given** a Tenant Admin configures a custom field, **When** a Sales Rep opens the
   contact form, **Then** the custom field appears and accepts valid values.
2. **Given** a contact has tags ["vip", "q3-prospect"], **When** a Sales Rep filters the
   contact list by tag "vip", **Then** only contacts with that tag are returned.
3. **Given** a contact field is updated, **When** the contact timeline is viewed,
   **Then** a timeline entry shows: actor, field name, old value, new value, timestamp.

---

### User Story 4 — CSV Bulk Import (Priority: P2)

A Sales Rep or Tenant Admin can upload a CSV file (up to 10,000 rows) to bulk-import
contacts. The system detects duplicates by email address and reports import results.

**Why this priority**: New tenants onboard existing contact databases via CSV. Without
this, manual entry of hundreds of contacts creates an adoption barrier.

**Independent Test**: Upload a 500-row CSV with 10 duplicate emails. Verify exactly 490
contacts are created, 10 are flagged as duplicates, and a result summary is displayed.

**Acceptance Scenarios**:

1. **Given** a valid CSV with required columns (firstName, lastName, email), **When**
   uploaded, **Then** all rows are processed and results (created / duplicates / errors)
   are returned in a summary UI.
2. **Given** a CSV row missing the required email column, **When** uploaded, **Then** that
   row is skipped with a validation error message identifying the row number.
3. **Given** a CSV row whose email already exists in the tenant, **When** processed,
   **Then** the row is flagged as a duplicate and the existing contact is not modified.

---

### Edge Cases

- What happens when two requests create a contact with the same email simultaneously
  (race condition)? → Database unique constraint on `(tenant_schema, email)` prevents
  duplicates; second request receives HTTP 409 CONFLICT.
- How does the system handle a CSV import that times out at 10,000 rows? → Import is
  processed asynchronously; a job-status endpoint allows polling for completion.
- How are custom field types validated on the API? → Type validation is enforced
  server-side regardless of frontend; invalid type values return HTTP 400 with field path.
- What happens if a user searches with a special character (e.g., `%`, `_`)? → Search
  terms are parameterised; no SQL injection risk; special chars treated as literals.

---

## Requirements *(mandatory)*

### Functional Requirements

Derived from `specs/ops-crm-functional-requirements.md` sections 4.3 and 4.4.

**Contacts (P1 — User Story 1)**
- **FR-CON-001**: System MUST allow creation of a Contact with: firstName, lastName,
  email (unique per tenant), phone, company name (free text), jobTitle, and leadStatus.
- **FR-CON-002**: System MUST support keyword search across name, email, company, and
  phone fields; results MUST return within 500 ms for datasets up to 100k records.
- **FR-CON-003**: Sales Reps MUST be able to update contacts they own; Sales Managers
  MUST be able to update any contact within their tenant.
- **FR-CON-004**: Deleting a contact MUST be a soft-delete (archived flag); hard-delete
  MUST require explicit Tenant Admin action.
- **FR-CON-005**: System MUST persist an audit log entry for every field-level change:
  `(userId, contactId, field, oldValue, newValue, changedAt)`.

**Companies (P1 — User Story 2)**
- **FR-COM-001**: System MUST allow creation of a Company with: name, industry, website,
  address, employeeCount, annualRevenue.
- **FR-COM-002**: A Contact MUST be associable with one or more Companies via an explicit
  link action; a Company detail view MUST display all linked contacts.
- **FR-COM-003**: System MUST support search by company name, industry, and website domain.

**Contacts Enrichment (P2 — User Story 3)**
- **FR-CON-006**: Tenant Admin MUST be able to define custom fields (types: text, number,
  date, dropdown, multi-select, boolean); defined fields MUST appear on all contact forms.
- **FR-CON-008**: Sales Rep MUST be able to assign one or more tags to a contact and
  filter the contact list by tag.
- **FR-CON-009**: System MUST display a Contact Timeline showing activities, notes, field
  changes, and deal associations in reverse-chronological order.

**Companies Enrichment (P2 — User Story 2 extension)**
- **FR-COM-004**: Company records MUST support the same custom field types as Contacts.
- **FR-COM-005**: Company detail page MUST display all associated open and closed deals.

**CSV Import (P2 — User Story 4)**
- **FR-CON-007**: System MUST accept a CSV file upload (≤ 10,000 rows) for bulk contact
  import with column mapping UI; duplicate detection by email MUST be performed.

### Key Entities

- **Contact**: Core CRM entity. Fields: id, tenantId, firstName, lastName, email, phone,
  title (jobTitle), company (free text), website, leadStatus, leadScore, tags (array),
  customFields (JSONB), archived (bool), createdBy (userId), createdAt, updatedAt.
- **Company**: Account entity. Fields: id, tenantId, name, industry, website, address,
  employeeCount, annualRevenue, customFields (JSONB), archived (bool), createdAt, updatedAt.
- **ContactCompany**: Join entity. Fields: contactId, companyId, role, isPrimary, linkedAt.
- **ContactAuditLog**: Immutable change record. Fields: id, contactId, userId, field,
  oldValue, newValue, changedAt.
- **CustomFieldDefinition**: Tenant-level schema. Fields: id, tenantId, entity (CONTACT|COMPANY),
  name, fieldType, options (JSONB for dropdown/multi-select), required, sortOrder.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A Sales Rep can create a contact in under 30 seconds from clicking "Add contact".
- **SC-002**: Contact search returns results in ≤ 500 ms (p95) for a 100k-record tenant dataset.
- **SC-003**: Audit log captures 100% of field-level changes with no gaps under concurrent load.
- **SC-004**: CSV import of 10,000 rows completes within 60 seconds with a complete result summary.
- **SC-005**: All contact and company API endpoints enforce tenant isolation — no cross-tenant
  data is accessible regardless of authentication token.
- **SC-006**: RBAC enforcement: Read-Only users receive HTTP 403 on all write operations.

---

## Assumptions

- Authentication (JWT + httpOnly cookies) and tenant provisioning from Phase 1 are complete
  and running on localhost before this phase begins.
- The `tenant_{slug}` PostgreSQL schema is already created during tenant provisioning and
  the `TenantContext` / `TenantJdbcTemplate` infrastructure is in place.
- Full-text search uses PostgreSQL `ILIKE` or `tsvector` for Phase 2; Typesense integration
  is deferred to Phase 3 when the dataset size justifies the operational overhead.
- Custom fields store values as JSONB in the contact/company row; no separate value table
  is used in Phase 2 (EAV model deferred until schema evolution requires it).
- CSV import processing is synchronous for files ≤ 1,000 rows; asynchronous (job queue)
  for files > 1,000 rows up to the 10,000-row limit.
- Mobile support is out of scope for this phase.
