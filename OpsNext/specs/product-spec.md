# OpsNext — Product Spec

> This is the Spec Kit `/speckit.specify` output — a concise summary of **what** OpsNext builds and **why**. For full acceptance criteria, see [`docs/FRD.md`](../docs/FRD.md).

---

## Strategic Goals

| ID | Goal | KPI |
|---|---|---|
| G-01 | Accelerate sales pipeline visibility | Reduce deal review time by 40% |
| G-02 | Centralise customer interaction history | 100% interaction capture rate |
| G-03 | Enable no-code workflow automation | 60% of routine tasks automated |
| G-04 | Support multi-tenant SaaS model | Onboard new tenant < 10 minutes |
| G-05 | Interoperate with existing toolchains | Zero data re-entry across integrated tools |

---

## Modules & Key Requirements

### IAM — Identity & Access Management
`IAM-F-01` Tenant self-registration with schema provisioning  
`IAM-F-02` Email/password login with RS256 JWT  
`IAM-F-03` Refresh token rotation (httpOnly cookie)  
`IAM-F-04` Role-based access: SUPER_ADMIN, TENANT_ADMIN, SALES_MANAGER, SALES_REP, READ_ONLY  
`IAM-F-05` MFA (TOTP + SMS OTP)  
`IAM-F-06` SSO via OAuth 2.0 / OIDC (Entra ID, Google)  

### CON — Contact & Account Management
`CON-F-01` Contact CRUD with custom fields (JSONB)  
`CON-F-02` Account (company) CRUD  
`CON-F-03` Contact → Account association  
`CON-F-04` Dynamic segmentation with saved filters  
`CON-F-05` Bulk import via CSV/XLSX  
`CON-F-06` Deduplication detection  

### LEA — Lead Management
`LEA-F-01` Lead CRUD with source tracking  
`LEA-F-02` Lead scoring rules engine  
`LEA-F-03` Lead → Contact/Opportunity conversion  

### OPP — Opportunity Management
`OPP-F-01` Opportunity CRUD with pipeline stage  
`OPP-F-02` Stage history and probability  
`OPP-F-03` Revenue forecasting  

### PIP — Pipeline & Kanban
`PIP-F-01` Multi-pipeline support per tenant  
`PIP-F-02` Drag-and-drop Kanban board  
`PIP-F-03` Stage WIP limits and guardrails  

### ACT — Activity & Interaction Tracking
`ACT-F-01` Activity log (call, email, meeting, note) on contacts/accounts/opportunities  
`ACT-F-02` Timeline view per entity  
`ACT-F-03` Google Calendar / Outlook sync  

### TSK — Tasks & Workflow Automation
`TSK-F-01` Task assignment, due dates, reminders  
`TSK-F-02` No-code workflow builder (trigger → condition → action)  
`TSK-F-03` Workflow execution with retry/idempotency  

### NOT — Notifications & Alerts
`NOT-F-01` In-app notification feed  
`NOT-F-02` Email notification digest  
`NOT-F-03` Slack / Teams webhook alerts  

### RPT — Reporting & Analytics
`RPT-F-01` Pipeline funnel report  
`RPT-F-02` Forecasting dashboard  
`RPT-F-03` Activity leaderboard  
`RPT-F-04` Custom report builder  

### ADM — Tenant Administration
`ADM-F-01` User management (invite, deactivate, role assignment)  
`ADM-F-02` Custom field builder  
`ADM-F-03` Branding settings  
`ADM-F-04` Pipeline and stage configuration  
`ADM-F-05` Billing dashboard  

### INT — Integration Framework
`INT-F-01` REST webhook subscriptions  
`INT-F-02` GraphQL API  
`INT-F-03` Microsoft Excel Add-in  
`INT-F-04` PowerApps connector  
`INT-F-05` Zoho CRM / Salesforce migration  

---

## Subscription Tiers

| Tier | API Rate Limit | Target |
|---|---|---|
| Basic | 500 req/min | Startups |
| Professional | 2,000 req/min | SMB teams |
| Enterprise | 5,000 req/min | Mid-market |

---

## External Integrations Roadmap

| Integration | Phase |
|---|---|
| Microsoft Excel import/export + Add-in | Phase 14 |
| Microsoft PowerApps Connector | Phase 14 |
| Zoho CRM migration + sync | Phase 14 |
| Salesforce migration + sync | Phase 14 |
| Google Calendar / Gmail | Phase 7 |
| Microsoft 365 / Outlook | Phase 7 |
| Slack / Microsoft Teams | Phase 10 |
