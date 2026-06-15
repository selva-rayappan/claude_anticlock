# OpsNext CRM — Functional Requirements Document (FRD)

**Document Version:** 1.0  
**Status:** Draft  
**Prepared By:** Business Architecture Team  
**Date:** 2026-06-11  
**Classification:** Internal — Confidential  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Context & Goals](#2-business-context--goals)
3. [Stakeholder Register](#3-stakeholder-register)
4. [System Overview](#4-system-overview)
5. [Multi-Tenancy Architecture Requirements](#5-multi-tenancy-architecture-requirements)
6. [Functional Requirements](#6-functional-requirements)
   - 6.1 Identity & Access Management
   - 6.2 Tenant Onboarding & Administration
   - 6.3 Contact & Account Management
   - 6.4 Lead & Opportunity Management
   - 6.5 Activity & Interaction Tracking
   - 6.6 Pipeline & Deal Management
   - 6.7 Task & Workflow Automation
   - 6.8 Reporting & Analytics
   - 6.9 Notifications & Alerts
   - 6.10 Integration Framework
   - 6.11 Data Import / Export
   - 6.12 Audit, Compliance & Data Governance
7. [External Integration Requirements](#7-external-integration-requirements)
8. [Non-Functional Requirements Summary](#8-non-functional-requirements-summary)
9. [Technology Stack](#9-technology-stack)
10. [Deployment Architecture](#10-deployment-architecture)
11. [Scalability & Growth Considerations](#11-scalability--growth-considerations)
12. [Assumptions & Constraints](#12-assumptions--constraints)
13. [Glossary](#13-glossary)

---

## 1. Executive Summary

**OpsNext** is a cloud-native, multi-tenant Customer Relationship Management (CRM) platform designed to streamline sales operations, customer engagement, and pipeline management for organisations of all sizes. It is architected for horizontal scalability, extensibility, and seamless integration with enterprise tools including Microsoft Excel, PowerApps, Zoho, and Salesforce.

The platform serves multiple tenants (organisations) from a shared infrastructure while maintaining strict data isolation, configurable workflows, and tenant-specific customisation — delivering SaaS-grade capability with minimal operational overhead.

---

## 2. Business Context & Goals

### 2.1 Problem Statement

Organisations managing customer relationships across dispersed teams lack a unified, affordable, and extensible CRM that:
- Supports multi-organisation deployment without data leakage
- Integrates natively with existing Microsoft and third-party ecosystems
- Scales from startup (tens of contacts) to enterprise (millions of records) without re-platforming

### 2.2 Strategic Goals

| # | Goal | KPI |
|---|------|-----|
| G-01 | Accelerate sales pipeline visibility | Reduce deal review time by 40% |
| G-02 | Centralise customer interaction history | 100% interaction capture rate |
| G-03 | Enable no-code workflow automation | 60% of routine tasks automated |
| G-04 | Support multi-tenant SaaS model | Onboard new tenant < 10 minutes |
| G-05 | Interoperate with existing toolchains | Zero data re-entry across integrated tools |

---

## 3. Stakeholder Register

| Role | Responsibility | Primary Concern |
|------|----------------|-----------------|
| Tenant Administrator | Manages users, settings, and data for their org | Isolation, configurability |
| Sales Representative | Manages leads, contacts, activities | Usability, mobile access |
| Sales Manager | Reviews pipeline, assigns leads, views reports | Visibility, forecasting |
| Marketing Team | Manages campaigns, segments contacts | Segmentation, integrations |
| IT / Platform Admin | Manages infrastructure, integrations | Security, uptime, compliance |
| Finance / Billing | Manages tenant subscriptions | Usage metrics, invoicing |
| External System (API Consumer) | Integrates via REST/webhook | API stability, rate limits |

---

## 4. System Overview

### 4.1 High-Level Capabilities

```
┌──────────────────────────────────────────────────────────────────┐
│                         OpsNext CRM Platform                      │
│                                                                    │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Web App    │  │  Mobile App  │  │  API (REST / GraphQL)    │  │
│  └──────┬──────┘  └──────┬───────┘  └────────────┬─────────────┘  │
│         └────────────────┴──────────────────────┐ │               │
│                                                  ▼ ▼               │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │              Core Business Logic Layer                      │   │
│  │  IAM │ Contacts │ Leads │ Pipeline │ Tasks │ Reports        │   │
│  └──────────────────────────┬─────────────────────────────────┘   │
│                              │                                     │
│  ┌───────────────────────────▼──────────────────────────────────┐  │
│  │              Data & Integration Layer                         │  │
│  │  PostgreSQL (per-schema) │ Redis │ BlobStore │ Message Queue │  │
│  └───────────────────────────┬──────────────────────────────────┘  │
│                              │                                     │
│  ┌───────────────────────────▼──────────────────────────────────┐  │
│  │              External Integrations                            │  │
│  │  Excel │ PowerApps │ Zoho │ Salesforce │ Email │ Calendar     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 Tenant Isolation Model

OpsNext uses a **schema-per-tenant** approach within a shared PostgreSQL cluster:
- Each tenant's data lives in a dedicated database schema (e.g., `tenant_acme`, `tenant_globex`)
- Application-layer middleware enforces schema routing on every request
- No cross-tenant queries are permitted at the ORM layer

---

## 5. Multi-Tenancy Architecture Requirements

| ID | Requirement |
|----|-------------|
| MT-01 | The system SHALL provision a dedicated schema and configuration namespace for each tenant upon onboarding |
| MT-02 | All API requests SHALL carry a resolved tenant context; requests without a valid tenant context SHALL be rejected with HTTP 401 |
| MT-03 | Tenant data SHALL be logically isolated; no query, export, or API response SHALL expose data belonging to another tenant |
| MT-04 | Each tenant SHALL have configurable: branding (logo, colours), timezone, currency, and language |
| MT-05 | Tenant administrators SHALL be able to define custom fields on core entities without requiring platform-level code changes |
| MT-06 | Tenant subscription tiers SHALL gate feature access (e.g., Basic / Professional / Enterprise) |
| MT-07 | Platform administrators SHALL be able to suspend, deactivate, or delete a tenant without affecting other tenants |
| MT-08 | Each tenant SHALL have an independent user pool; SSO configuration SHALL be per-tenant |

---

## 6. Functional Requirements

> **Requirement ID Format:** `[Module]-[Type]-[Number]`  
> **Types:** F = Functional, C = Configuration, I = Integration  
> **Priority:** P1 = Must Have, P2 = Should Have, P3 = Nice to Have  

---

### 6.1 Identity & Access Management (IAM)

| ID | Priority | Requirement |
|----|----------|-------------|
| IAM-F-01 | P1 | Users SHALL register and authenticate using email/password with bcrypt hashing (min cost factor 12) |
| IAM-F-02 | P1 | The system SHALL support JWT-based session tokens with configurable expiry (default 8 hours) and refresh token rotation |
| IAM-F-03 | P1 | Multi-Factor Authentication (MFA) SHALL be supported via TOTP (RFC 6238) and SMS OTP |
| IAM-F-04 | P1 | Role-Based Access Control (RBAC) SHALL be enforced; built-in roles: Super Admin, Tenant Admin, Sales Manager, Sales Rep, Read-Only |
| IAM-F-05 | P2 | Tenant administrators SHALL be able to define custom roles with field-level permission granularity |
| IAM-F-06 | P2 | Single Sign-On (SSO) SHALL be supported via SAML 2.0 and OAuth 2.0 / OIDC (Microsoft Entra ID, Google Workspace) |
| IAM-F-07 | P1 | All failed authentication attempts SHALL be logged; accounts SHALL lock after 5 consecutive failures (configurable) |
| IAM-F-08 | P2 | Password policies SHALL be configurable per tenant (complexity, expiry, history) |
| IAM-F-09 | P3 | Passkey / WebAuthn authentication SHALL be supported as an alternative to passwords |

---

### 6.2 Tenant Onboarding & Administration

| ID | Priority | Requirement |
|----|----------|-------------|
| TEN-F-01 | P1 | A self-service registration flow SHALL allow new organisations to provision a tenant in under 5 minutes |
| TEN-F-02 | P1 | Onboarding wizard SHALL collect: organisation name, industry, size, primary currency, timezone |
| TEN-F-03 | P1 | Tenant administrators SHALL manage users: invite, deactivate, assign roles, reset passwords |
| TEN-F-04 | P1 | Tenant administrators SHALL configure custom fields (text, number, date, dropdown, multi-select, Boolean) on: Contacts, Accounts, Leads, Opportunities |
| TEN-F-05 | P2 | Tenant administrators SHALL configure pipeline stages with custom names, probability weights, and required fields per stage |
| TEN-F-06 | P2 | Tenant administrators SHALL define lead scoring rules based on field values and activity events |
| TEN-F-07 | P2 | Tenant billing dashboard SHALL display current plan, usage metrics (users, records, API calls), and upgrade options |
| TEN-F-08 | P3 | Tenant administrators SHALL be able to export all tenant data (GDPR Article 20 portability) in JSON and CSV format |

---

### 6.3 Contact & Account Management

| ID | Priority | Requirement |
|----|----------|-------------|
| CON-F-01 | P1 | Users SHALL create, read, update, and delete (CRUD) Contact records containing: name, email(s), phone(s), title, company, address, social handles, tags, owner, source |
| CON-F-02 | P1 | Users SHALL CRUD Account (Company) records containing: name, domain, industry, size, annual revenue, address, website, assigned owner, parent account |
| CON-F-03 | P1 | Contacts SHALL be associated with one or more Accounts; Account view SHALL display all associated contacts |
| CON-F-04 | P1 | Duplicate detection SHALL alert users when a contact/account with matching email or domain already exists |
| CON-F-05 | P2 | Users SHALL be able to merge duplicate contact or account records with field-level conflict resolution |
| CON-F-06 | P2 | Global search SHALL return contacts, accounts, leads, and deals across all modules with sub-500 ms response time at P95 |
| CON-F-07 | P2 | Users SHALL segment contacts using dynamic filter groups (AND/OR logic across any field) and save segments as named lists |
| CON-F-08 | P3 | Company data enrichment SHALL optionally auto-populate account details via an integrated third-party data provider (e.g., Clearbit, Apollo) |

---

### 6.4 Lead & Opportunity Management

| ID | Priority | Requirement |
|----|----------|-------------|
| LEAD-F-01 | P1 | Users SHALL CRUD Lead records containing: name, email, phone, company, source, status, assigned owner, lead score, notes |
| LEAD-F-02 | P1 | Leads SHALL be convertible into: Contact, Account, and/or Opportunity in a single action |
| LEAD-F-03 | P1 | Lead status workflow SHALL support configurable statuses (e.g., New → Contacted → Qualified → Disqualified) with transition rules |
| LEAD-F-04 | P2 | Automatic lead assignment rules SHALL distribute incoming leads based on: round-robin, territory, industry, or load balancing |
| LEAD-F-05 | P2 | Lead scoring engine SHALL calculate a numeric score (0–100) based on configurable rules (demographic + behavioural signals) |
| LEAD-F-06 | P1 | Opportunities SHALL contain: name, associated account/contact, pipeline stage, expected close date, deal value, probability %, owner |
| LEAD-F-07 | P1 | Opportunity records SHALL track stage history with timestamps for cycle-time analysis |
| LEAD-F-08 | P2 | Win/loss reason capture SHALL be mandatory (configurable) when an opportunity is marked Closed Won or Closed Lost |

---

### 6.5 Activity & Interaction Tracking

| ID | Priority | Requirement |
|----|----------|-------------|
| ACT-F-01 | P1 | Users SHALL log activities against any entity (Contact, Account, Lead, Opportunity): types include Call, Email, Meeting, Note, Task |
| ACT-F-02 | P1 | Each activity SHALL record: type, date/time, duration, participants, outcome, linked entity, created by |
| ACT-F-03 | P2 | Email integration SHALL automatically capture sent/received emails and attach them to the relevant contact or deal (IMAP/SMTP or Gmail/Outlook connector) |
| ACT-F-04 | P2 | Calendar integration SHALL sync scheduled meetings with Google Calendar and Microsoft 365; meeting outcomes SHALL be logable directly from the calendar event |
| ACT-F-05 | P2 | Activity timeline view SHALL display all interactions for a record in reverse chronological order with filter options |
| ACT-F-06 | P3 | Call recording integration SHALL allow VoIP call logs and recordings to be attached to contact/deal activity (via Twilio or similar) |

---

### 6.6 Pipeline & Deal Management

| ID | Priority | Requirement |
|----|----------|-------------|
| PIPE-F-01 | P1 | Deals/Opportunities SHALL be visualised in a Kanban board grouped by pipeline stage; drag-and-drop SHALL update stage with confirmation |
| PIPE-F-02 | P1 | Pipeline view SHALL support filtering by: owner, date range, deal value, account, custom fields |
| PIPE-F-03 | P1 | Each tenant SHALL be able to define multiple named pipelines (e.g., New Business, Renewals, Partnerships) |
| PIPE-F-04 | P2 | Forecast view SHALL aggregate deal values by stage and expected close date with weighted and best-case forecast options |
| PIPE-F-05 | P2 | Stale deal alerts SHALL notify owners and managers when a deal has not had activity within a configurable number of days |
| PIPE-F-06 | P3 | AI-assisted deal scoring SHALL provide a probability estimate based on historical win patterns (ML model, per-tenant training data) |

---

### 6.7 Task & Workflow Automation

| ID | Priority | Requirement |
|----|----------|-------------|
| WF-F-01 | P1 | Users SHALL create tasks with: title, due date/time, priority, linked entity, assignee, reminders |
| WF-F-02 | P1 | Task lists SHALL support views: My Tasks, Team Tasks, Overdue, Upcoming (today / this week) |
| WF-F-03 | P2 | No-code workflow automation engine SHALL allow Tenant Admins to define trigger-condition-action rules, e.g.: "When Lead status changes to Qualified → Create Task for Owner → Send Email Notification" |
| WF-F-04 | P2 | Workflow triggers SHALL include: record created, record updated (field-level), stage changed, date reached, tag added |
| WF-F-05 | P2 | Workflow actions SHALL include: create task, send email, send in-app notification, update field, call webhook, assign owner |
| WF-F-06 | P2 | Workflow execution history SHALL be logged per record for audit and debugging |
| WF-F-07 | P3 | Sequential email sequences (cadences) SHALL be configurable for lead nurturing with delay-based scheduling |

---

### 6.8 Reporting & Analytics

| ID | Priority | Requirement |
|----|----------|-------------|
| RPT-F-01 | P1 | Platform SHALL provide pre-built dashboards: Sales Overview, Pipeline Summary, Lead Funnel, Activity Report, Win/Loss Analysis |
| RPT-F-02 | P1 | All reports SHALL be filterable by date range, owner, team, pipeline, and custom fields |
| RPT-F-03 | P2 | Custom report builder SHALL allow users to select entity, dimensions, measures, and chart type (bar, line, pie, table) without coding |
| RPT-F-04 | P2 | Reports and dashboards SHALL be shareable via link (with tenant-scoped access control) or scheduled for email delivery (PDF / CSV) |
| RPT-F-05 | P2 | Sales forecast report SHALL display quota vs. pipeline weighted value vs. closed-won by time period |
| RPT-F-06 | P3 | Data export to Excel (.xlsx) SHALL be available on every report and list view, respecting current filters |
| RPT-F-07 | P3 | Embedded BI capability SHALL allow iframe or SDK embedding of dashboards into external portals (with token-based auth) |

---

### 6.9 Notifications & Alerts

| ID | Priority | Requirement |
|----|----------|-------------|
| NOT-F-01 | P1 | In-app notification centre SHALL display real-time alerts for: task due, deal stage change, new assignment, mention, workflow trigger |
| NOT-F-02 | P1 | Email notification preferences SHALL be configurable per user per event type |
| NOT-F-03 | P2 | Push notifications SHALL be supported on mobile (iOS and Android via FCM/APNs) |
| NOT-F-04 | P2 | Webhook outbound notifications SHALL fire on configurable entity events for downstream system integration |
| NOT-F-05 | P3 | Slack and Microsoft Teams integration SHALL deliver configurable alerts to designated channels |

---

### 6.10 Integration Framework

| ID | Priority | Requirement |
|----|----------|-------------|
| INT-F-01 | P1 | Platform SHALL expose a versioned RESTful API (OpenAPI 3.1 spec) covering all core entities with standard CRUD and bulk endpoints |
| INT-F-02 | P1 | API authentication SHALL use OAuth 2.0 Client Credentials (machine-to-machine) and API Key (per-tenant, revocable) |
| INT-F-03 | P2 | GraphQL API SHALL be provided for flexible querying to support low-bandwidth and composite data consumers |
| INT-F-04 | P2 | Webhook subscriptions SHALL allow external systems to register for entity-level event streams |
| INT-F-05 | P2 | Rate limiting SHALL be enforced per tenant per tier (e.g., Basic: 500 req/min, Enterprise: 5,000 req/min) with HTTP 429 and Retry-After headers |
| INT-F-06 | P3 | Integration marketplace UI SHALL list available connectors with OAuth-based authorisation flows (install in < 3 clicks) |

---

### 6.11 Data Import / Export

| ID | Priority | Requirement |
|----|----------|-------------|
| IMP-F-01 | P1 | Users SHALL import Contacts, Accounts, and Leads from CSV and Excel (.xlsx) files via a UI wizard with field-mapping and preview |
| IMP-F-02 | P1 | Import wizard SHALL validate data (required fields, type checks, duplicate detection) and report errors row-by-row before committing |
| IMP-F-03 | P2 | Bulk import jobs SHALL run asynchronously; users SHALL receive an email notification and import summary upon completion |
| IMP-F-04 | P2 | One-time and ongoing sync from Salesforce SHALL be supported via OAuth-authenticated connector (Contacts, Accounts, Opportunities) |
| IMP-F-05 | P2 | One-time and ongoing sync from Zoho CRM SHALL be supported via OAuth-authenticated connector |
| IMP-F-06 | P2 | Data export SHALL support: CSV, Excel (.xlsx), and JSON formats for all major entity types |

---

### 6.12 Audit, Compliance & Data Governance

| ID | Priority | Requirement |
|----|----------|-------------|
| AUD-F-01 | P1 | All create, update, and delete operations on core entities SHALL be recorded in an immutable audit log: who, what, when, before/after values |
| AUD-F-02 | P1 | Audit logs SHALL be accessible to Tenant Admins for their tenant's data; Platform Admins have cross-tenant access |
| AUD-F-03 | P1 | Personal data fields SHALL be identifiable and subject to GDPR right-to-erasure workflows (anonymisation on request) |
| AUD-F-04 | P2 | Data retention policies SHALL be configurable per tenant (e.g., auto-archive records after N years) |
| AUD-F-05 | P2 | The platform SHALL support SOC 2 Type II evidence collection: access logs, change logs, user provisioning/deprovisioning events |
| AUD-F-06 | P2 | All data at rest SHALL be encrypted (AES-256); all data in transit SHALL use TLS 1.3 minimum |
| AUD-F-07 | P3 | Field-level encryption SHALL be available for sensitive fields (SSN, financial data) with per-tenant KMS keys |

---

## 7. External Integration Requirements

### 7.1 Microsoft Excel

| ID | Requirement |
|----|-------------|
| XLS-I-01 | Export any list view or report directly to .xlsx with formatting preserved |
| XLS-I-02 | Excel Add-in SHALL allow bi-directional sync of contact/account data from within Excel (via Microsoft Office Add-in framework) |
| XLS-I-03 | Import wizard SHALL accept .xlsx files with automatic column type inference |

### 7.2 Microsoft PowerApps

| ID | Requirement |
|----|-------------|
| PWA-I-01 | OpsNext SHALL publish a certified Microsoft Power Platform Connector (custom connector definition with OpenAPI spec) |
| PWA-I-02 | Connector SHALL support triggers (new contact, stage changed) and actions (create lead, update opportunity) consumable in Power Automate flows |
| PWA-I-03 | Authentication SHALL use OAuth 2.0 with Microsoft Entra ID delegation |

### 7.3 Zoho CRM

| ID | Requirement |
|----|-------------|
| ZOHO-I-01 | Migration utility SHALL support one-time full import from Zoho CRM (Contacts, Leads, Accounts, Deals) via Zoho API v2 |
| ZOHO-I-02 | Continuous sync connector SHALL support bi-directional field mapping with conflict resolution strategy (OpsNext wins / Zoho wins / newest wins) |
| ZOHO-I-03 | Sync jobs SHALL run on a configurable schedule (minimum: every 15 minutes) |

### 7.4 Salesforce

| ID | Requirement |
|----|-------------|
| SF-I-01 | Migration utility SHALL support one-time full import from Salesforce via Salesforce Bulk API 2.0 |
| SF-I-02 | Continuous sync connector SHALL support bi-directional sync of standard objects: Contact, Account, Opportunity, Lead, Activity |
| SF-I-03 | Field mapping UI SHALL allow per-tenant customisation of Salesforce field → OpsNext field mapping |
| SF-I-04 | Salesforce connected app credentials SHALL be stored encrypted per tenant |

---

## 8. Non-Functional Requirements Summary

| Category | Requirement |
|----------|-------------|
| **Performance** | API P95 response time ≤ 300 ms under normal load; ≤ 800 ms under peak (2× normal) |
| **Availability** | 99.9% uptime SLA (≤ 8.7 hrs downtime/year); 99.95% target for Enterprise tier |
| **Scalability** | Support 500 tenants at launch; architected for 10,000+ tenants without re-platforming |
| **Throughput** | Handle 10,000 concurrent active users across all tenants |
| **Data Volume** | Support tenants with up to 5 million contact records; bulk operations ≤ 100K rows |
| **Security** | OWASP Top 10 compliance; penetration test prior to GA release |
| **Compliance** | GDPR (EU), CCPA (California) data handling compliance |
| **Browser Support** | Latest 2 versions of Chrome, Firefox, Edge, Safari |
| **Mobile** | Responsive web (PWA) + native iOS and Android apps (React Native) |
| **Internationalisation** | UTF-8 throughout; UI internationalisation (i18n) framework; date/currency per locale |

---

## 9. Technology Stack

### 9.1 Frontend

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | **Next.js 15** (App Router) | SSR/SSG for SEO, streaming, edge rendering |
| UI Library | **React 19** | Component ecosystem, concurrent rendering |
| Component System | **shadcn/ui** + **Tailwind CSS v4** | Design-system consistency, zero-runtime CSS |
| State Management | **Zustand** (client) + **React Query / TanStack Query** (server) | Lightweight, predictable |
| Form Handling | **React Hook Form** + **Zod** | Type-safe validation, minimal re-renders |
| Charts / BI | **Recharts** (embedded) / **Apache ECharts** (complex dashboards) | Open source, performant |
| Mobile | **React Native** (Expo SDK 52) | Shared business logic with web |
| Build | **Turborepo** monorepo + **Vite** (where applicable) | Fast incremental builds |

### 9.2 Backend

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Runtime | **Node.js 22 LTS** | V8 performance, async I/O, npm ecosystem |
| API Framework | **Fastify v5** | 2× throughput vs Express, schema validation built-in |
| API Style | **REST** (primary) + **GraphQL** (Mercurius) | Broad compatibility + flexible client queries |
| ORM | **Prisma 6** | Type-safe queries, schema-per-tenant migration support |
| Authentication | **Lucia Auth** + **Arctic** (OAuth) | Modern, framework-agnostic, standards-compliant |
| Background Jobs | **BullMQ** (Redis-backed) | Priority queues, cron, retry with back-off |
| Validation | **Zod** | Runtime + compile-time type safety |
| Email Service | **Resend** (primary) / **Nodemailer** (SMTP fallback) | Deliverability, templating |

### 9.3 Data Layer

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Primary Database | **PostgreSQL 16** | ACID compliance, JSONB for custom fields, schema-per-tenant |
| Database Hosting | **Neon** (serverless Postgres) or self-managed on **RDS** | Auto-scaling connections, branching for dev/test |
| Cache / Sessions | **Redis 7** (Upstash or ElastiCache) | Session store, BullMQ, rate limiting, query cache |
| Full-Text Search | **Elasticsearch 8** / **Typesense** (cost-optimised) | Sub-100 ms cross-entity search at scale |
| File / Blob Storage | **AWS S3** / **Cloudflare R2** | Import files, attachments, report exports |
| Analytics Store | **ClickHouse** (read replica events) | Columnar, sub-second aggregation over 100M+ rows |
| Message Queue | **AWS SQS** / **NATS JetStream** | Decoupled async processing, exactly-once delivery |

### 9.4 Infrastructure & DevOps

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Container Runtime | **Docker** + **Kubernetes (EKS / GKE)** | Horizontal pod autoscaling per service |
| IaC | **Terraform** (modules per environment) | Reproducible, version-controlled infrastructure |
| CI/CD | **GitHub Actions** + **ArgoCD** (GitOps) | PR-gated tests, progressive delivery |
| API Gateway | **AWS API Gateway** / **Kong** | Rate limiting, auth offload, canary routing |
| CDN | **Cloudflare** | Edge caching, DDoS protection, WAF |
| Observability | **OpenTelemetry** → **Grafana Stack** (Loki + Tempo + Prometheus) | Vendor-neutral traces, metrics, logs |
| Secret Management | **AWS Secrets Manager** / **HashiCorp Vault** | Tenant KMS keys, third-party credentials |
| Error Tracking | **Sentry** | Real-time error alerting per tenant |

---

## 10. Deployment Architecture

```
                         ┌─────────────────────────────────┐
Internet ──────────────▶ │  Cloudflare (WAF + CDN + DDoS)  │
                         └────────────────┬────────────────┘
                                          │
                         ┌────────────────▼────────────────┐
                         │       API Gateway / Kong         │
                         │  (Auth offload, rate limiting)   │
                         └──┬──────────────┬───────────────┘
                            │              │
               ┌────────────▼──┐   ┌───────▼──────────────┐
               │  Web Tier     │   │  API Tier             │
               │  (Next.js)    │   │  (Fastify + Node)     │
               │  K8s HPA      │   │  K8s HPA (2–50 pods)  │
               └────────────┬──┘   └───────┬──────────────┘
                            │              │
               ┌────────────▼──────────────▼──────────────┐
               │            Service Mesh (internal)        │
               │  ┌──────────┐  ┌──────────┐  ┌────────┐  │
               │  │ PostgreSQL│  │  Redis   │  │ Search │  │
               │  │ (Primary +│  │ Cluster  │  │ Engine │  │
               │  │ Replicas) │  └──────────┘  └────────┘  │
               │  └──────────┘                              │
               │  ┌──────────┐  ┌──────────┐  ┌────────┐  │
               │  │ ClickHouse│  │  BullMQ  │  │  S3    │  │
               │  │ Analytics│  │  Workers │  │  Blobs │  │
               │  └──────────┘  └──────────┘  └────────┘  │
               └────────────────────────────────────────────┘

Environments: dev → staging → canary (5%) → production
```

### 10.1 Environment Strategy

| Environment | Purpose | Tenant Data |
|-------------|---------|-------------|
| Development | Local/branch work | Seeded synthetic data |
| Staging | Integration & regression testing | Anonymised production copy |
| Canary | 5% production traffic, new releases | Real (opted-in tenants) |
| Production | Full traffic | Real |

---

## 11. Scalability & Growth Considerations

| Dimension | Phase 1 (0–6 months) | Phase 2 (6–18 months) | Phase 3 (18 months+) |
|-----------|---------------------|----------------------|---------------------|
| Tenants | Up to 500 | Up to 5,000 | 10,000+ |
| Records/tenant | < 100K | < 1M | < 10M |
| API req/sec | 500 | 5,000 | 50,000+ |
| DB Strategy | Single cluster, schema-per-tenant | Read replicas + connection pooling (PgBouncer) | Sharded clusters by tenant cohort |
| Search | Typesense (single node) | Typesense cluster | Elasticsearch / OpenSearch cluster |
| Queue | BullMQ (single Redis) | Redis Cluster + BullMQ | Dedicated NATS JetStream |
| Analytics | PostgreSQL views | ClickHouse single node | ClickHouse cluster |

### 11.1 Tenant Sharding Strategy (Phase 3)

When per-schema isolation reaches database limits, tenants are migrated to shard clusters by:
1. Tenant cohort size (Enterprise tenants get dedicated clusters)
2. Geographic region (EU, US, APAC data residency)
3. Subscription tier

---

## 12. Assumptions & Constraints

### Assumptions

- A-01: Initial deployment targets AWS; multi-cloud (Azure, GCP) is a Phase 2 consideration
- A-02: OpsNext will not replicate billing/subscription management; Stripe will be used as the billing engine
- A-03: AI/ML features (lead scoring, deal probability) will use third-party LLM APIs (Claude API) in Phase 1 before building in-house models
- A-04: Mobile apps will be thin clients sharing API layer with web; offline-first is a Phase 3 requirement
- A-05: Salesforce and Zoho connectors are read-only in Phase 1; bi-directional sync in Phase 2

### Constraints

- C-01: All personal data for EU tenants MUST be stored in EU regions (GDPR data residency)
- C-02: The platform MUST be accessible to users with disabilities (WCAG 2.1 AA minimum)
- C-03: API breaking changes MUST follow semantic versioning with 6-month deprecation windows
- C-04: Vendor lock-in for the core database layer MUST be minimised; Prisma abstracts the ORM

---

## 13. Glossary

| Term | Definition |
|------|-----------|
| **Tenant** | An organisation (company) using OpsNext as a customer of the SaaS platform |
| **Account** | A company or organisation record within a tenant's CRM data |
| **Contact** | An individual person record associated with an Account |
| **Lead** | An unqualified prospect not yet converted to a Contact/Opportunity |
| **Opportunity / Deal** | A qualified sales prospect with a tracked pipeline stage and expected value |
| **Pipeline** | A configured sequence of sales stages used to track Opportunities |
| **Workflow** | An automated trigger-condition-action rule defined by a Tenant Admin |
| **Activity** | Any logged interaction (call, email, meeting, note, task) against a CRM entity |
| **Schema-per-tenant** | A PostgreSQL design pattern where each tenant's tables reside in a dedicated schema |
| **RBAC** | Role-Based Access Control — permissions granted by role, not individual user |
| **TOTP** | Time-based One-Time Password (RFC 6238) — used for MFA |
| **HPA** | Kubernetes Horizontal Pod Autoscaler — scales pods based on CPU/memory metrics |
| **KMS** | Key Management Service — manages cryptographic keys for data encryption |
| **IaC** | Infrastructure as Code — infrastructure provisioned via declarative configuration files |

---

*Document Owner: Business Architecture Team*  
*Next Review Date: 2026-09-11*  
*Change Control: All amendments require sign-off from Product Owner and Lead Architect*
