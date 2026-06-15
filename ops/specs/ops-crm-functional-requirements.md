# Functional Requirements Specification
# Ops — Multi-Tenant CRM Platform

**Document ID**: FRS-OPS-001
**Version**: 1.0.0
**Status**: Draft
**Date**: 2026-06-15
**Author**: Business Consulting — Product Requirements
**Classification**: Internal — Product Definition

---

## 1. Executive Summary

**Ops** is a professional-grade, cloud-native, multi-tenant Customer Relationship
Management (CRM) platform designed for professional services firms. It provides pipeline
management, contact intelligence, task orchestration, and reporting within a scalable
SaaS architecture. The platform is designed for native interoperability with Microsoft
Excel, PowerApps, Zoho CRM, and Salesforce, enabling enterprise customers to integrate
Ops into existing toolchains without data migration risk.

---

## 2. Scope

### 2.1 In Scope

- Multi-tenant SaaS CRM accessible via web browser
- Contact, company, deal, and pipeline management
- Role-based access control (RBAC) within each tenant
- Integration adapters: Excel, PowerApps, Zoho CRM, Salesforce
- Reporting and dashboard analytics
- Activity logging and audit trail
- Notification and task management
- Public REST API and Webhook support

### 2.2 Out of Scope (v1.0)

- Native mobile applications (iOS / Android)
- AI/ML-powered lead scoring (Phase 3+)
- VoIP / telephony integration
- Document e-signature workflows

---

## 3. Stakeholder Roles

| Role | Description |
|------|-------------|
| **Platform Admin** | Ops SaaS operator; manages tenants, billing, global config |
| **Tenant Admin** | Customer organisation administrator; manages users, pipelines, settings |
| **Sales Manager** | Oversees deals, pipelines, and team performance within a tenant |
| **Sales Rep** | Creates and manages contacts, deals, and activities |
| **Read-Only User** | Views CRM data without modification rights |
| **Integration System** | External systems (Zoho, Salesforce, PowerApps) accessing the API |

---

## 4. Functional Requirements

Requirements are categorised by capability domain. Each requirement follows the format:

`FR-[DOMAIN]-[NNN]: [Actor] MUST/SHOULD/MAY [requirement statement]`

Priority: **P1** = MVP blocker · **P2** = Core feature · **P3** = Enhancement

---

### 4.1 Tenant & Platform Management

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-TPM-001 | P1 | Platform Admin MUST be able to provision a new tenant with a unique slug, display name, and admin user seed credentials. |
| FR-TPM-002 | P1 | Each tenant MUST have logically isolated data storage; cross-tenant data access MUST be architecturally impossible at the data layer. |
| FR-TPM-003 | P1 | Platform Admin MUST be able to suspend or permanently deactivate a tenant, immediately revoking all active sessions. |
| FR-TPM-004 | P2 | Platform Admin MUST be able to view per-tenant resource consumption (API calls, storage, active users) via an admin dashboard. |
| FR-TPM-005 | P2 | The system MUST support configurable subscription tiers (e.g., Starter, Professional, Enterprise) with feature flags per tier. |
| FR-TPM-006 | P3 | Platform Admin SHOULD be able to trigger a tenant data export (GDPR-compliant archive) in JSON or CSV format. |

---

### 4.2 Authentication & Authorisation

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-AUTH-001 | P1 | Users MUST authenticate via email and password; credentials MUST be stored as bcrypt hashes (min cost factor 12). |
| FR-AUTH-002 | P1 | The system MUST issue a short-lived JWT access token (≤ 8 hours) and a long-lived opaque refresh token (≤ 30 days) delivered via httpOnly cookie. |
| FR-AUTH-003 | P1 | The system MUST invalidate refresh tokens on logout and maintain a deny-list in cache (Redis) for immediate revocation. |
| FR-AUTH-004 | P1 | Tenant Admin MUST be able to assign users one of the following roles: Admin, Sales Manager, Sales Rep, Read-Only. |
| FR-AUTH-005 | P1 | Role-based access MUST enforce: Read-Only users cannot create/update/delete any record; Sales Reps cannot manage users; Managers cannot modify tenant settings. |
| FR-AUTH-006 | P2 | The system MUST enforce account lock-out after 5 consecutive failed login attempts within 10 minutes (configurable). |
| FR-AUTH-007 | P2 | Tenant Admin SHOULD be able to configure Single Sign-On (SSO) via SAML 2.0 or OIDC for Enterprise tier tenants. |
| FR-AUTH-008 | P2 | All API endpoints MUST require authentication; unauthenticated requests MUST return HTTP 401. |
| FR-AUTH-009 | P3 | Users SHOULD be able to enable Time-based OTP (TOTP) multi-factor authentication on their accounts. |

---

### 4.3 Contact Management

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-CON-001 | P1 | Sales Rep MUST be able to create a Contact with: first name, last name, email (unique per tenant), phone, company, job title, and lifecycle stage. |
| FR-CON-002 | P1 | Sales Rep MUST be able to search contacts by name, email, company, or phone number with results returned in ≤ 500 ms for up to 100k contacts. |
| FR-CON-003 | P1 | Sales Rep MUST be able to update any field on a contact they own; Managers MUST be able to update any contact within the tenant. |
| FR-CON-004 | P1 | Deleting a contact MUST be a soft-delete (archived); hard-delete MUST require Tenant Admin confirmation. |
| FR-CON-005 | P1 | The system MUST record a full audit log of all contact field changes (who, what, when, old value, new value). |
| FR-CON-006 | P2 | Contacts MUST support custom fields defined by the Tenant Admin (text, number, date, dropdown, multi-select, boolean types). |
| FR-CON-007 | P2 | Sales Rep MUST be able to bulk-import contacts from a CSV file (≤ 10,000 rows per import); duplicate detection by email MUST be performed. |
| FR-CON-008 | P2 | Sales Rep MUST be able to tag contacts with one or more labels and filter the contact list by label. |
| FR-CON-009 | P2 | The system MUST surface a Contact Timeline showing all activities, notes, emails, and deal changes in chronological order. |
| FR-CON-010 | P3 | Sales Rep SHOULD be able to merge two duplicate contact records, with field-level conflict resolution. |

---

### 4.4 Company (Account) Management

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-COM-001 | P1 | Sales Rep MUST be able to create a Company record with: name, industry, website, address, employee count, and annual revenue. |
| FR-COM-002 | P1 | Contacts MUST be associable with one or more Companies; a Company record MUST display all associated contacts. |
| FR-COM-003 | P1 | Sales Rep MUST be able to search companies by name, industry, or domain. |
| FR-COM-004 | P2 | Company records MUST support custom fields (same types as Contact custom fields). |
| FR-COM-005 | P2 | The system MUST display all open and closed deals associated with a Company. |

---

### 4.5 Deal & Pipeline Management

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-DEAL-001 | P1 | Tenant Admin MUST be able to create one or more named Pipelines, each with a configurable ordered list of stages. |
| FR-DEAL-002 | P1 | Sales Rep MUST be able to create a Deal associated with a Contact and/or Company, assigned to a pipeline stage, with: name, value (currency), close date, owner, and probability. |
| FR-DEAL-003 | P1 | Sales Rep MUST be able to move a Deal to any stage within its pipeline via a Kanban board interface or dropdown. |
| FR-DEAL-004 | P1 | The system MUST record stage transition history for every deal (from stage, to stage, timestamp, actor). |
| FR-DEAL-005 | P1 | Sales Manager MUST be able to view all deals across their team in a pipeline board and a sortable list view. |
| FR-DEAL-006 | P2 | Deals MUST support custom fields defined by the Tenant Admin. |
| FR-DEAL-007 | P2 | The system MUST calculate and display weighted pipeline value (deal value × probability) per pipeline and per stage. |
| FR-DEAL-008 | P2 | Sales Manager MUST be able to set a monthly/quarterly revenue target and view progress against it on the dashboard. |
| FR-DEAL-009 | P3 | Sales Rep SHOULD be able to clone an existing deal as a new deal, copying all fields except close date and owner. |

---

### 4.6 Activity & Task Management

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-ACT-001 | P1 | Sales Rep MUST be able to log an Activity against a Contact, Company, or Deal. Activity types: Call, Email, Meeting, Note, Task. |
| FR-ACT-002 | P1 | Tasks MUST support: title, due date, priority (Low/Medium/High), assignee, and association to a CRM record. |
| FR-ACT-003 | P1 | Sales Rep MUST receive an in-app notification for Tasks due within 24 hours. |
| FR-ACT-004 | P2 | Sales Manager MUST be able to view all overdue tasks across their team filtered by assignee, priority, or associated record. |
| FR-ACT-005 | P2 | The system MUST send email reminders for Tasks based on configurable reminder intervals (e.g., 1 day before, 1 hour before). |
| FR-ACT-006 | P3 | Sales Rep SHOULD be able to schedule a recurring task (daily, weekly, monthly). |

---

### 4.7 Reporting & Analytics

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-RPT-001 | P1 | The system MUST provide a Sales Rep Dashboard showing: open deals count, total pipeline value, tasks due today, and recent activities. |
| FR-RPT-002 | P1 | Sales Manager MUST have a Team Dashboard showing: each rep's deal count, pipeline value, win rate, and activity count for a configurable date range. |
| FR-RPT-003 | P2 | The system MUST provide a Deal Won/Lost report with filters for: date range, pipeline, stage, and owner. |
| FR-RPT-004 | P2 | Sales Manager MUST be able to export any report to CSV or Excel format. |
| FR-RPT-005 | P2 | The system MUST provide a Contact Growth report showing new contacts added per week/month. |
| FR-RPT-006 | P3 | Tenant Admin SHOULD be able to create custom reports by selecting fields, filters, and groupings from a report builder UI. |

---

### 4.8 Notification & Communication

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-NOT-001 | P1 | The system MUST deliver in-app notifications for: task reminders, deal stage changes, and @mention in notes. |
| FR-NOT-002 | P2 | Users MUST be able to configure their notification preferences (in-app, email) per notification type. |
| FR-NOT-003 | P2 | The system MUST support outbound email integration (SMTP / SendGrid) for sending templated emails from a Contact record. |
| FR-NOT-004 | P3 | Sales Manager SHOULD be able to configure Webhook triggers for deal stage changes and new contacts (JSON POST to a configurable URL). |

---

### 4.9 Integration — Excel

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-XL-001 | P2 | Users MUST be able to export any Contact, Deal, or Company list view to Excel (.xlsx) format with current filters applied. |
| FR-XL-002 | P2 | Tenant Admin MUST be able to initiate a bulk import from an Excel file (.xlsx) for Contacts or Deals, with column-mapping UI. |
| FR-XL-003 | P3 | The system SHOULD expose an Excel Add-in (Office.js) allowing users to query and update CRM records from within Excel. |

---

### 4.10 Integration — Microsoft PowerApps

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-PA-001 | P2 | The system MUST expose a Power Platform Custom Connector definition (OpenAPI 3.0) enabling PowerApps to read and write Contacts, Deals, and Activities. |
| FR-PA-002 | P2 | The Custom Connector MUST support OAuth 2.0 (Authorization Code flow) for PowerApps user authentication. |
| FR-PA-003 | P3 | The system SHOULD provide sample PowerApps canvas app templates demonstrating Contact lookup and Deal creation. |

---

### 4.11 Integration — Zoho CRM

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-ZOHO-001 | P3 | Tenant Admin MUST be able to configure a Zoho CRM integration by providing OAuth 2.0 credentials and field mapping. |
| FR-ZOHO-002 | P3 | The system MUST support bidirectional sync of Contacts and Deals with Zoho CRM on a configurable schedule (minimum 15-minute interval). |
| FR-ZOHO-003 | P3 | Conflict resolution during sync MUST be configurable: "Ops wins", "Zoho wins", or "Last write wins". |
| FR-ZOHO-004 | P3 | Sync errors MUST be logged per record with error message, timestamp, and retry count; Tenant Admin MUST be able to review and re-trigger failed syncs. |

---

### 4.12 Integration — Salesforce

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-SF-001 | P3 | Tenant Admin MUST be able to configure a Salesforce integration via OAuth 2.0 (Connected App) with field mapping for Contacts, Accounts, and Opportunities. |
| FR-SF-002 | P3 | The system MUST support outbound push of new Ops records to Salesforce as Contacts/Leads/Opportunities. |
| FR-SF-003 | P3 | The system MUST support inbound pull of Salesforce record updates on a configurable schedule (minimum 30-minute interval). |
| FR-SF-004 | P3 | Integration logs MUST be tenant-accessible; Platform Admin MUST be able to monitor integration health across all tenants. |

---

### 4.13 Public REST API

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-API-001 | P1 | The system MUST expose a versioned REST API (`/api/v1/`) covering all core entities: Contacts, Companies, Deals, Activities, Users. |
| FR-API-002 | P1 | API authentication MUST support Bearer token (JWT) for server-side integrations. |
| FR-API-003 | P1 | All list endpoints MUST support pagination (cursor-based), filtering, and sorting. |
| FR-API-004 | P2 | The system MUST publish an OpenAPI 3.0 specification at `/api/v1/openapi.json`, kept in sync with the implementation. |
| FR-API-005 | P2 | API rate limits MUST be enforced per tenant (configurable per tier); exceeding the limit MUST return HTTP 429 with `Retry-After` header. |
| FR-API-006 | P3 | The system SHOULD provide API usage analytics per tenant (request count, error rate, top endpoints) accessible to Tenant Admin. |

---

## 5. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-001 | Performance | API p95 response time MUST be ≤ 200 ms for standard CRUD operations under normal load. |
| NFR-002 | Scalability | The platform MUST support horizontal scaling to handle ≥ 500 concurrent active tenants and ≥ 10,000 concurrent users without architecture change. |
| NFR-003 | Availability | The platform MUST target 99.9% monthly uptime (SLA); planned maintenance windows MUST be communicated 48 hours in advance. |
| NFR-004 | Data Isolation | Tenant data isolation MUST be enforced at the database schema level; ORM-level filtering alone is insufficient. |
| NFR-005 | Security | All data in transit MUST be encrypted via TLS 1.2+; all data at rest MUST be encrypted at the storage layer. |
| NFR-006 | Compliance | The platform MUST support GDPR data subject requests: access, rectification, erasure, and portability. |
| NFR-007 | Observability | All API requests MUST produce structured log entries with: tenantId, userId, method, path, statusCode, durationMs. |
| NFR-008 | Pagination | No list endpoint MAY return more than 250 records without pagination; default page size is 25. |
| NFR-009 | Audit | All create, update, and delete operations on CRM records MUST be persisted in an immutable audit log. |
| NFR-010 | Backup | Tenant database schemas MUST be backed up daily with a minimum 30-day retention period. |

---

## 6. Technology Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Backend API** | Java 21 + Spring Boot 3.4.1 + Gradle 8.11.1 | Production-grade JVM; virtual threads for high concurrency without reactive complexity |
| **Frontend** | Next.js 15 (App Router) + React 19 + shadcn/ui | SSR for SEO and first-load performance; shadcn for accessible, unstyled component primitives |
| **Frontend State** | TanStack Query + Zustand | Server-state caching (TanStack) + lightweight client state (Zustand) |
| **Primary Database** | PostgreSQL 16 | ACID compliance; schema-per-tenant isolation model; JSONB for custom fields |
| **Cache / Session** | Redis 7 (Lettuce) | JWT deny-list, tenant slug resolution cache, rate-limit counters |
| **Full-Text Search** | Typesense | Sub-50ms contact/deal search; schemaless enough for custom fields |
| **File Storage** | MinIO (local) / S3-compatible (production) | Import/export files, attachments |
| **Monorepo Build** | Turborepo | Caches build artefacts across `apps/api` (Java) and `apps/web` (Next.js) |
| **Local Dev** | Docker Compose | Reproducible local environment: Postgres, Redis, Typesense, MinIO |
| **API Spec** | OpenAPI 3.0 | Powers PowerApps connector, Swagger UI, and contract tests |
| **CI/CD** | GitHub Actions | Build, test, and container image on push; deploy to container platform |
| **Container** | Docker + Kubernetes (production) | Horizontal pod autoscaling per load; tenant routing via ingress |

---

## 7. Scalability Architecture Notes

- **Database**: Schema-per-tenant allows independent index tuning and backup scheduling
  per tenant. At scale (>1,000 tenants), tenant schemas are distributed across read
  replicas using PgBouncer connection pooling.
- **API layer**: Stateless Spring Boot pods behind a load balancer. Session state is
  externalised to Redis. Virtual threads eliminate thread-pool exhaustion under burst
  load.
- **Search**: Typesense cluster scaled independently; tenant search indices are isolated
  collections.
- **Integration queue**: Zoho/Salesforce sync jobs are processed via an async queue
  (Redis Streams or RabbitMQ) to prevent sync latency from affecting API response times.
- **Caching strategy**: Tenant slug → schema name mapping cached in Redis with 5-minute
  TTL. Frequently accessed Contact/Deal records cached with tenant-namespaced keys.

---

## 8. Integration Architecture

```
┌───────────────────────────────────────────────────────┐
│                    Ops CRM API (v1)                   │
│                   (Spring Boot / JWT)                 │
└───────────┬───────────────────────────────────────────┘
            │ REST / OpenAPI 3.0
    ┌───────┴────────────────────────────────────┐
    │                                            │
    ▼                                            ▼
┌──────────────┐                    ┌────────────────────┐
│ Excel Add-in │                    │  PowerApps         │
│ (Office.js)  │                    │  Custom Connector  │
└──────────────┘                    └────────────────────┘
    │ Adapter                            │ Adapter
    ▼                                    ▼
┌──────────────────────────────────────────────────────┐
│              Integration Adapter Layer               │
│   ZohoAdapter │ SalesforceAdapter │ WebhookEmitter   │
└──────────────────────────────────────────────────────┘
    │ OAuth 2.0 / REST                   │ OAuth 2.0 / REST
    ▼                                    ▼
 Zoho CRM                          Salesforce
```

Each integration adapter is an independently deployable module with:
- Its own configuration schema stored per-tenant
- Sync state tracked in the tenant schema
- Error/retry log accessible to Tenant Admin

---

## 9. Acceptance Criteria Summary

| Domain | MVP Gate (P1 complete) | Full Feature Gate (P1+P2 complete) |
|--------|------------------------|-------------------------------------|
| Tenant Management | Provision, suspend, login | Tier config, resource monitoring |
| Auth | Email/password, JWT, RBAC | SSO (SAML/OIDC), MFA |
| Contacts | CRUD, search, audit log | Custom fields, CSV import, tags, timeline |
| Companies | CRUD, contact association | Custom fields, deal view |
| Deals | Pipeline CRUD, Kanban board, stage history | Custom fields, weighted value, targets |
| Activities | Log and assign tasks, in-app notifications | Email reminders, manager view |
| Reporting | Rep + Manager dashboards | Deal reports, CSV/Excel export |
| API | Versioned REST, pagination, auth | OpenAPI spec, rate limiting |
| Integrations | Excel export | PowerApps connector, Zoho sync, Salesforce sync |

---

## 10. Revision History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 1.0.0 | 2026-06-15 | Business Consulting | Initial draft |
