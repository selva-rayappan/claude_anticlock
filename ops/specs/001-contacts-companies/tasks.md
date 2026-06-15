---
description: "Task list for 001-contacts-companies — Phase 2 of OpsNext CRM"
---

# Tasks: Contacts & Companies Management

**Feature Branch**: `001-contacts-companies`
**Input**: `specs/001-contacts-companies/spec.md` + `specs/ops-crm-functional-requirements.md`
**Constitution**: `.specify/memory/constitution.md` v1.0.0

**Tech Stack**:
- Backend: Java 21 + Spring Boot 3.4.1 · `apps/api/src/main/java/io/opsnext/api/`
- Frontend: Next.js 15 App Router + React 19 + shadcn/ui · `apps/web/src/`
- DB: PostgreSQL 16, schema-per-tenant via `TenantJdbcTemplate`
- Shared types: `packages/shared/src/`

**Constitution Gates** (must pass throughout):
- All DB access MUST go through `TenantContext` + `TenantJdbcTemplate` (Principle I)
- All list endpoints MUST paginate; page size default 25, max 250 (Principle VI)
- Every write MUST produce a structured audit log entry (Principles I + VI)
- No raw SQL string concatenation — parameterised statements only (Principle IV)
- Phase gate: present on localhost for Product Owner approval before Phase 3 begins (Principle III)

---

## Phase 1: Setup

**Purpose**: DB migrations, shared types, and API routing scaffold.

- [ ] T001 Create Flyway migration `V2__contacts_companies.sql` in `apps/api/src/main/resources/db/migration/` — defines `contacts`, `companies`, `contact_company`, `contact_audit_log`, `custom_field_definitions` tables in tenant schema
- [ ] T002 [P] Add `Contact` type and Zod schemas (`createContactSchema`, `updateContactSchema`) to `packages/shared/src/types/contact.ts`
- [ ] T003 [P] Add `Company` type and Zod schemas (`createCompanySchema`, `updateCompanySchema`) to `packages/shared/src/types/company.ts`
- [ ] T004 [P] Add `CustomFieldDefinition` type to `packages/shared/src/types/custom-field.ts`
- [ ] T005 [P] Register `/api/v1/contacts` and `/api/v1/companies` route prefixes in `apps/api/src/main/java/io/opsnext/api/config/ApiRoutes.java`
- [ ] T006 [P] Add `paths.contacts.*` and `paths.companies.*` URL helpers to `apps/web/src/lib/api.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure required before any user story can be implemented.

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

- [ ] T007 Implement `Contact` JPA entity in `apps/api/src/main/java/io/opsnext/api/contact/Contact.java` with all Phase 2 fields (id UUID, firstName, lastName, email, phone, title, company, website, leadStatus, leadScore, tags JSONB, customFields JSONB, archived, createdBy, createdAt, updatedAt)
- [ ] T008 Implement `Company` JPA entity in `apps/api/src/main/java/io/opsnext/api/company/Company.java` with all Phase 2 fields
- [ ] T009 [P] Implement `ContactAuditLog` JPA entity in `apps/api/src/main/java/io/opsnext/api/contact/ContactAuditLog.java`
- [ ] T010 [P] Implement `CustomFieldDefinition` JPA entity in `apps/api/src/main/java/io/opsnext/api/customfield/CustomFieldDefinition.java`
- [ ] T011 Implement `AuditLogService` in `apps/api/src/main/java/io/opsnext/api/audit/AuditLogService.java` — records field-level diffs for any entity change; injected into Contact and Company services
- [ ] T012 [P] Add `ContactRepository` (Spring Data JPA) in `apps/api/src/main/java/io/opsnext/api/contact/ContactRepository.java` with tenant-aware queries
- [ ] T013 [P] Add `CompanyRepository` in `apps/api/src/main/java/io/opsnext/api/company/CompanyRepository.java`
- [ ] T014 Validate `TenantFilter` enforces tenant schema context on every request to `/api/v1/contacts/**` and `/api/v1/companies/**` in `apps/api/src/main/java/io/opsnext/api/tenant/TenantFilter.java`

**Checkpoint**: Entities compile, migration runs cleanly, TenantFilter enforced → User story work may begin.

---

## Phase 3: User Story 1 — Contact CRUD + Search + Audit Log (Priority: P1) 🎯 MVP

**Goal**: Sales Rep can create, read, update, soft-delete, and search contacts.
Every field change is captured in the audit log. RBAC enforced.

**Independent Test**: Create a contact, update title, search by email, soft-delete it,
inspect audit log via `GET /api/v1/contacts/{id}/audit`. All pass without any Company
or custom-field feature.

### Backend — User Story 1

- [ ] T015 [P] [US1] Implement `ContactService.createContact()` in `apps/api/src/main/java/io/opsnext/api/contact/ContactService.java` — validates uniqueness of email per tenant, calls `AuditLogService.record()` on create
- [ ] T016 [P] [US1] Implement `ContactService.getContact(id)` — enforces tenant ownership; returns 404 if not found or archived
- [ ] T017 [US1] Implement `ContactService.updateContact(id, patch)` — field-level diff computed and written to `contact_audit_log` via `AuditLogService`; RBAC: Reps update own contacts only, Managers update any
- [ ] T018 [US1] Implement `ContactService.archiveContact(id)` — sets `archived = true`, records audit entry; hard-delete endpoint restricted to `ROLE_ADMIN`
- [ ] T019 [US1] Implement `ContactService.listContacts(query, page, size)` — pagination required; search via PostgreSQL `ILIKE` on firstName, lastName, email, company, phone; results sorted by `createdAt DESC` by default
- [ ] T020 [P] [US1] Implement `ContactService.getAuditLog(contactId)` — returns paginated audit log for a contact
- [ ] T021 [US1] Implement `ContactController` in `apps/api/src/main/java/io/opsnext/api/contact/ContactController.java` with endpoints:
  - `POST /api/v1/contacts` → createContact
  - `GET /api/v1/contacts` → listContacts (with `?search=&page=&limit=`)
  - `GET /api/v1/contacts/{id}` → getContact
  - `PUT /api/v1/contacts/{id}` → updateContact
  - `DELETE /api/v1/contacts/{id}` → archiveContact (soft)
  - `GET /api/v1/contacts/{id}/audit` → getAuditLog
- [ ] T022 [US1] Enforce RBAC in `ContactController`: annotate with `@PreAuthorize`; Read-Only role → HTTP 403 on POST/PUT/DELETE

### Frontend — User Story 1

- [ ] T023 [P] [US1] Implement contacts list page at `apps/web/src/app/(app)/contacts/page.tsx` — table with pagination, search input, sort by name/score/createdAt, row-click navigates to detail, bulk-delete toolbar
- [ ] T024 [P] [US1] Implement `ContactSlideOver` create/edit form at `apps/web/src/components/contacts/contact-slideover.tsx` — fields: firstName, lastName, email, phone, jobTitle, company (free text), website, leadStatus; validates with Zod schema from `@opsnext/shared`
- [ ] T025 [US1] Implement contact detail page at `apps/web/src/app/(app)/contacts/[id]/page.tsx` — left panel (contact info, tags, metadata), right panel (tabs: Activity, Opportunities, Tasks); Edit and Delete buttons
- [ ] T026 [P] [US1] Add TanStack Query hooks in `apps/web/src/lib/queries/contacts.ts`:
  - `useContacts(params)` → GET /api/v1/contacts
  - `useContact(id)` → GET /api/v1/contacts/{id}
  - `useCreateContact()` mutation
  - `useUpdateContact()` mutation
  - `useDeleteContact()` mutation
- [ ] T027 [US1] Wire audit log tab in contact detail page — `GET /api/v1/contacts/{id}/audit` displayed as a timeline list with actor, field, old→new value, timestamp

**Checkpoint**: Sales Rep can fully manage contacts end-to-end on localhost. Audit log visible. RBAC verified.

---

## Phase 4: User Story 2 — Company CRUD + Contact Associations (Priority: P1)

**Goal**: Sales Rep can create and manage Company records. Contacts link to companies.
Company detail shows all linked contacts.

**Independent Test**: Create a company, open a contact, associate it with the company,
open the company detail page, verify the contact appears under "People". No Deal or
custom-field feature required.

### Backend — User Story 2

- [ ] T028 [P] [US2] Implement `CompanyService.createCompany()` in `apps/api/src/main/java/io/opsnext/api/company/CompanyService.java`
- [ ] T029 [P] [US2] Implement `CompanyService.getCompany(id)`, `listCompanies(query, page, size)`, `updateCompany(id, patch)`, `archiveCompany(id)` — same tenant-aware + audit-log pattern as contacts
- [ ] T030 [US2] Implement `ContactCompanyService` in `apps/api/src/main/java/io/opsnext/api/company/ContactCompanyService.java`:
  - `linkContactToCompany(contactId, companyId, role, isPrimary)`
  - `unlinkContactFromCompany(contactId, companyId)`
  - `getContactsForCompany(companyId, page, size)`
  - `getCompaniesForContact(contactId)`
- [ ] T031 [US2] Implement `CompanyController` in `apps/api/src/main/java/io/opsnext/api/company/CompanyController.java` with endpoints:
  - `POST /api/v1/companies` → createCompany
  - `GET /api/v1/companies` → listCompanies
  - `GET /api/v1/companies/{id}` → getCompany
  - `PUT /api/v1/companies/{id}` → updateCompany
  - `DELETE /api/v1/companies/{id}` → archiveCompany
  - `GET /api/v1/companies/{id}/contacts` → getContactsForCompany
  - `POST /api/v1/companies/{id}/contacts/{contactId}` → linkContact
  - `DELETE /api/v1/companies/{id}/contacts/{contactId}` → unlinkContact

### Frontend — User Story 2

- [ ] T032 [P] [US2] Implement companies list page at `apps/web/src/app/(app)/companies/page.tsx` — table with name, industry, website, contact count, pagination, search
- [ ] T033 [P] [US2] Implement `CompanySlideOver` at `apps/web/src/components/companies/company-slideover.tsx` — fields: name, industry, website, address, employeeCount, annualRevenue
- [ ] T034 [US2] Implement company detail page at `apps/web/src/app/(app)/companies/[id]/page.tsx` — company info panel, "People" tab listing linked contacts, "Deals" placeholder tab
- [ ] T035 [P] [US2] Add TanStack Query hooks in `apps/web/src/lib/queries/companies.ts`
- [ ] T036 [US2] Add "Companies" nav item to sidebar at `apps/web/src/components/layout/sidebar.tsx` with `Building2` icon
- [ ] T037 [US2] Add contact-company link UI to contact detail page — "Companies" section with link/unlink controls using `POST/DELETE /api/v1/companies/{id}/contacts/{contactId}`

**Checkpoint**: Company CRUD works; contacts can be linked and appear on company detail page.

---

## Phase 5: User Story 3 — Tags, Custom Fields & Contact Timeline (Priority: P2)

**Goal**: Tenant Admin can define custom fields. Sales Reps tag contacts and filter by
tag. Contact timeline shows all changes and activities chronologically.

**Independent Test**: As Tenant Admin, create a custom dropdown field "Priority Tier"
with options (Tier 1, Tier 2, Tier 3). As Sales Rep, set it on a contact, add tag "vip",
filter contacts list by tag "vip", and verify contact timeline shows both the tag change
and the custom field change.

### Backend — User Story 3

- [ ] T038 [P] [US3] Implement `CustomFieldService` in `apps/api/src/main/java/io/opsnext/api/customfield/CustomFieldService.java`:
  - `defineField(tenantId, entity, name, type, options, required)` — Admin only
  - `getFieldDefinitions(tenantId, entity)` — returns ordered list for form rendering
  - `validateFieldValues(definitions, values)` — type-check JSONB values server-side
- [ ] T039 [P] [US3] Implement `CustomFieldController` in `apps/api/src/main/java/io/opsnext/api/customfield/CustomFieldController.java`:
  - `GET /api/v1/custom-fields?entity=CONTACT` → getFieldDefinitions
  - `POST /api/v1/custom-fields` → defineField (Admin only)
  - `PUT /api/v1/custom-fields/{id}` → updateField (Admin only)
  - `DELETE /api/v1/custom-fields/{id}` → removeField (Admin only)
- [ ] T040 [US3] Update `ContactService.updateContact()` to validate `customFields` JSONB against `CustomFieldDefinition` schema before persisting; invalid values return HTTP 400 with field path
- [ ] T041 [P] [US3] Implement tag filter in `ContactService.listContacts()` — add `?tags=tag1,tag2` query param; use PostgreSQL `@>` (array contains) operator on `tags` column
- [ ] T042 [US3] Implement `ContactTimelineService` in `apps/api/src/main/java/io/opsnext/api/contact/ContactTimelineService.java` — merges `contact_audit_log` + `activities` for a contact into a single reverse-chronological feed; exposed via `GET /api/v1/contacts/{id}/timeline`

### Frontend — User Story 3

- [ ] T043 [P] [US3] Implement `CustomFieldRenderer` component at `apps/web/src/components/custom-fields/custom-field-renderer.tsx` — renders the correct input type (text, number, date, Select, MultiSelect, Checkbox) based on `CustomFieldDefinition.fieldType`
- [ ] T044 [US3] Integrate `CustomFieldRenderer` into `ContactSlideOver` — fetch definitions via `GET /api/v1/custom-fields?entity=CONTACT` and render dynamic fields below standard fields
- [ ] T045 [US3] Integrate `CustomFieldRenderer` into `CompanySlideOver` — same pattern for `entity=COMPANY`
- [ ] T046 [P] [US3] Add tag filter UI to contacts list page — tag chips row below search bar; clicking a chip adds it to the `?tags=` query param
- [ ] T047 [US3] Implement `ContactTimeline` component at `apps/web/src/components/contacts/contact-timeline.tsx` — renders merged timeline events (field changes, activities, notes) with type icons and relative timestamps
- [ ] T048 [US3] Wire `ContactTimeline` into the Activity tab of contact detail page (`apps/web/src/app/(app)/contacts/[id]/page.tsx`) replacing the stub
- [ ] T049 [P] [US3] Add Tenant Admin "Custom Fields" settings page at `apps/web/src/app/(app)/settings/custom-fields/page.tsx` — list + create + delete custom field definitions per entity type

**Checkpoint**: Custom fields appear on forms; tag filter works on list; timeline shows change history.

---

## Phase 6: User Story 4 — CSV Bulk Import (Priority: P2)

**Goal**: A CSV file of up to 10,000 contacts can be uploaded. Duplicate emails are
flagged. An import summary shows created / duplicate / error counts.

**Independent Test**: Upload a 500-row CSV with 10 duplicate emails. Verify 490 contacts
created, 10 flagged as duplicates, import summary displayed with per-row errors.

### Backend — User Story 4

- [ ] T050 [US4] Implement `ContactImportService` in `apps/api/src/main/java/io/opsnext/api/contact/ContactImportService.java`:
  - `importFromCsv(MultipartFile file, columnMapping)` — parses CSV, validates rows, deduplicates by email, batch-inserts valid rows
  - Synchronous for ≤ 1,000 rows; async (Spring `@Async` + Redis Streams job) for > 1,000 rows
  - Returns `ImportResult(created, duplicates, errors[])` or `ImportJobId` for async
- [ ] T051 [US4] Implement `ContactImportController` in `apps/api/src/main/java/io/opsnext/api/contact/ContactImportController.java`:
  - `POST /api/v1/contacts/import` → accepts `multipart/form-data` with `file` + `columnMapping` JSON
  - `GET /api/v1/contacts/import/{jobId}` → poll async job status (for files > 1,000 rows)

### Frontend — User Story 4

- [ ] T052 [P] [US4] Implement `ImportContactsDialog` at `apps/web/src/components/contacts/import-contacts-dialog.tsx` — step 1: upload CSV, step 2: column mapping UI (drag-drop headers to CRM fields), step 3: import summary with error list
- [ ] T053 [US4] Add "Import" button to contacts list page toolbar wiring to `ImportContactsDialog`
- [ ] T054 [US4] Implement polling hook in `apps/web/src/lib/queries/contacts.ts` — `useImportJobStatus(jobId)` polls `GET /api/v1/contacts/import/{jobId}` every 3 seconds until status is `COMPLETE` or `FAILED`

**Checkpoint**: CSV import works end-to-end; duplicate detection verified; async job polling works for large files.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Quality hardening across all user stories before phase-gate review.

- [ ] T055 [P] Add structured request/response logging middleware for all `/api/v1/contacts/**` and `/api/v1/companies/**` endpoints — logs `tenantId`, `userId`, `method`, `path`, `statusCode`, `durationMs` (Principle VI)
- [ ] T056 [P] Validate all list endpoints enforce max page size of 250; default 25; return HTTP 400 if `limit > 250`
- [ ] T057 [P] Sanitise all API error responses — strip stack traces and internal identifiers from client-facing error bodies; verify with integration test
- [ ] T058 Add PostgreSQL index on `contacts.email` (tenant-scoped UNIQUE), `contacts.archived`, and GIN index on `contacts.tags` in `V2__contacts_companies.sql` migration
- [ ] T059 [P] Add GIN index on `companies.name` tsvector for full-text search performance
- [ ] T060 Verify all write endpoints reject requests from `ROLE_READ_ONLY` users; manual test checklist in `specs/001-contacts-companies/quickstart.md`
- [ ] T061 [P] Update `apps/web/src/components/layout/sidebar.tsx` to show active state for Contacts and Companies nav items
- [ ] T062 Run localhost validation per `quickstart.md` — all user stories independently testable, phase-gate summary prepared for Product Owner review

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — blocks Phases 3–7
- **Phase 3 (US1 Contacts)**: Depends on Phase 2 — no dependency on Phase 4+
- **Phase 4 (US2 Companies)**: Depends on Phase 2 — can run in parallel with Phase 3
- **Phase 5 (US3 Enrichment)**: Depends on Phase 3 (contacts backend) + Phase 4 (companies); some tasks parallel within story
- **Phase 6 (US4 Import)**: Depends on Phase 3 (contacts backend) — independent of Phase 4
- **Phase 7 (Polish)**: Depends on all desired stories being complete

### Within Each User Story

- DB entities (T007–T014) before services
- Services before controllers
- Controllers before frontend query hooks
- Query hooks before page/component wiring

### Parallel Opportunities

All Setup tasks (T001–T006) can run in parallel.
All Foundational tasks (T007–T014) can run in parallel within Phase 2.
Once Foundational is complete:
- US1 backend tasks (T015–T022) parallelisable where marked [P]
- US1 frontend tasks (T023–T027) parallelisable where marked [P]
- US2 backend + frontend can run in parallel with US1

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T006)
2. Complete Phase 2: Foundational (T007–T014) — CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T015–T027)
4. **STOP and VALIDATE**: Contact CRUD + search + audit log on localhost
5. Present for Product Owner phase-gate review before continuing

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 → Contact management MVP (demo-able)
3. US2 → Company management (contacts now linked to companies)
4. US3 → Enrichment (custom fields, tags, timeline)
5. US4 → CSV import (onboarding capability)
6. Polish → Phase gate review

### Parallel Team Strategy

- Developer A: Backend (T007–T022, T028–T031, T038–T042, T050–T051)
- Developer B: Frontend (T023–T027, T032–T037, T043–T049, T052–T054)
- Developer A starts Phase 2 → Developer B starts US1 frontend once T007–T014 are complete

---

## Notes

- `[P]` = parallelisable (different files, no incomplete task dependencies)
- `[USn]` = maps to User Story n in `spec.md` for traceability
- All tasks touching tenant data MUST use `TenantContext` — no exceptions (Constitution Principle I)
- Phase gate review (T062) MUST be completed before Phase 3 (Deals) work begins (Constitution Principle III)
- Commit format: `feat(contacts): T015 implement ContactService.createContact()`
