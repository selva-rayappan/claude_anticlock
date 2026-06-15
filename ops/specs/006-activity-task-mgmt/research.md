# Research: Activity & Task Management

**Feature**: 006-activity-task-mgmt
**Date**: 2026-06-15
**Status**: Complete — no NEEDS CLARIFICATION items remain

---

## Current Implementation Audit

All decisions below are derived from reading the existing codebase under `OpsNext/`.

---

### Finding 1: Activity API — Partial Implementation

**Decision**: Extend `ActivityController` and `ActivityService` rather than rewrite.

**What exists**:
- `GET /api/v1/activities` — list with `entityType` / `entityId` query params ✅
- `POST /api/v1/activities` — create activity ✅
- `DELETE /api/v1/activities/{id}` — soft-delete ✅

**What is missing**:
- `PUT /api/v1/activities/{id}` — update (subject, body, outcome, duration) — **not implemented**
- Standalone activities — `entity_type` column is `NOT NULL` in schema; spec allows activities with no CRM record — **schema migration required**
- RBAC enforcement — delete does not verify that the caller is either the activity author or a Manager role — **missing**
- Frontend path mismatch — `api.ts` defines `activities.list` as `/api/v1/activities/entity/{type}/{id}` (path params) but the controller uses query params — **alignment fix required**

**Rationale**: The existing service uses `TenantJdbcTemplate` consistently; extending it follows the established pattern. No service replacement needed.

---

### Finding 2: Task API — Substantially Complete

**Decision**: Add RBAC enforcement only; core CRUD is already production-quality.

**What exists**:
- Full CRUD: `GET`, `POST`, `GET /{id}`, `PUT /{id}`, `POST /{id}/complete`, `DELETE /{id}` ✅
- Overdue filter (`overdue=true` query param) ✅
- My tasks filter (`myTasks=true`) ✅
- `entity_type` and `entity_id` are nullable in the `tasks` table ✅ (standalone tasks allowed)
- `reminder_at` column exists — usable as a "due-notification sent" marker ✅

**What is missing**:
- Ownership check on update/delete — any authenticated user can modify any task; spec requires reps to only edit tasks they own or created — **missing**
- Recurrence columns: `is_recurring`, `recurrence_pattern`, `recurrence_enabled`, `parent_task_id` — **not in schema** (P3)

**Rationale**: The `tasks` table already has `created_by` and `assignee_id`, giving both sides of the ownership check.

---

### Finding 3: Notification Infrastructure — Schema Exists, No Controller

**Decision**: Build `NotificationController` + `NotificationService` + `TaskDueNotificationJob`.

**What exists**:
- `notifications` table in tenant schema with: `user_id`, `type` (enum including `TASK_DUE`, `NEW_ASSIGNMENT`), `title`, `body`, `data` (JSONB), `read_at` ✅
- `notification_type` PostgreSQL enum: `TASK_DUE`, `DEAL_STAGE_CHANGED`, `NEW_ASSIGNMENT`, etc. ✅
- Redis 7 available (Lettuce driver configured in `application.yml`) ✅
- `app.mail.from` configured in `application.yml` ✅

**What is missing**:
- `NotificationController` — API to list, mark-read, mark-all-read — **not implemented**
- `NotificationService` — service to insert and query notifications — **not implemented**
- `TaskDueNotificationJob` — Spring `@Scheduled` job to poll tasks entering the 24-hour window — **not implemented**
- Frontend notification bell in topbar — **not implemented**

**Rationale**: No notification controller or scheduler exists in the backend source tree. The `api.ts` `paths.notifications.*` entries define the expected API paths (`/api/v1/notifications`, `/api/v1/notifications/stream`, etc.) — implementation must match these.

---

### Finding 4: Email Reminder System — No Infrastructure Exists

**Decision**: Add `task_email_reminders` tracking table + `TaskEmailReminderJob` + Spring `JavaMailSender`.

**What exists**:
- `app.mail.from` configured; SMTP env var injection is set up ✅
- `notification_type` enum does not have a specific `EMAIL_REMINDER` value — use the `notifications` table for in-app only; email is separate ✅

**What is missing**:
- `task_email_reminders` table for tracking scheduled/sent/failed email reminders — **schema migration required**
- `TaskEmailReminderJob` — scheduled job to process pending email reminders — **not implemented**
- Tenant-level email reminder settings (enable/disable 1-day and 1-hour intervals) — **no tenant settings table scoped for this**

**Decision for tenant settings**: Add a `notification_settings` JSONB column to the tenant settings or use a dedicated `tenant_notification_settings` table. Simplest approach (YAGNI): store reminder intervals as a JSONB field on an existing tenant preferences record. If no such record exists, default to both intervals enabled.

**Rationale**: Spring's `JavaMailSender` is the standard Spring Boot 3 email abstraction and is already included transitively via `spring-boot-starter-mail`.

---

### Finding 5: Scheduler Pattern

**Decision**: Use Spring `@Scheduled` with virtual thread executor (already enabled: `spring.threads.virtual.enabled: true`).

**Polling interval**: Every 5 minutes matches SC-003 (notification within 5 minutes of threshold crossing).

**Deduplication**: Use `tasks.reminder_at` — set it to `NOW()` when a DUE_SOON notification is created. Query only tasks where `reminder_at IS NULL` or `reminder_at < due_at - interval '24 hours'` (reset case). When `due_at` is pushed out, clear `reminder_at` in the `TaskService.update()` method.

---

### Finding 6: Entity Type Alignment

**Decision**: The `entity_type` enum in PostgreSQL uses `CONTACT`, `ACCOUNT`, `LEAD`, `OPPORTUNITY` — the spec and FRS use `Contact`, `Company`, `Deal`. Map at the API layer:

| Spec term | API value | DB enum value |
|-----------|-----------|---------------|
| Contact   | CONTACT   | CONTACT       |
| Company   | ACCOUNT   | ACCOUNT       |
| Deal      | OPPORTUNITY | OPPORTUNITY |

The existing code already uses `CONTACT`, `ACCOUNT`, `OPPORTUNITY` — no change needed in the DB schema. Document the mapping in contracts.

---

### Finding 7: Frontend Structure

**Decision**: Extend existing Next.js App Router pattern under `(app)` route group.

**What exists**:
- `/contacts` — list page + `[id]` detail page ✅
- `/dashboard` — summary page ✅
- Sidebar (`components/layout/sidebar.tsx`) — navigation exists ✅
- Topbar (`components/layout/topbar.tsx`) — notification bell placeholder location ✅
- `api.ts` already defines `paths.activities`, `paths.tasks`, `paths.notifications` ✅

**What is missing**:
- `/tasks` — task list page (my tasks + overdue view) — **not implemented**
- Timeline component for CRM record detail pages — **not implemented**
- Log Activity slide-over/modal — **not implemented**
- Notification bell + dropdown in topbar — **not implemented**
- `components/activities/` directory — **not created**
- `components/tasks/` directory — **not created**

---

### Finding 8: Worker App

The `apps/worker/src/` tree has `jobs/`, `processors/`, `utils/` directories but no source files were found. The scheduled jobs will live in the `backend/` Spring Boot app using `@Scheduled` — this is simpler, avoids a separate process, and virtual threads handle the I/O without blocking. The worker app can be used for heavier async processing in future phases.

---

## Alternatives Considered

| Decision | Alternative Rejected | Reason |
|----------|----------------------|--------|
| `@Scheduled` in backend for notifications | Worker app (Node) | Adds cross-process complexity; Spring `@Scheduled` + virtual threads is sufficient for 5-min polling |
| `reminder_at` as deduplication marker | Separate `task_notification_log` table | Extra table adds complexity; `reminder_at` already exists and serves this exact purpose |
| SMTP via Spring `JavaMailSender` | SendGrid SDK | Spring Boot starter handles SMTP; SendGrid can be substituted via SMTP relay without code changes |
| JSONB for tenant notification settings | Separate settings table | YAGNI — one field on an existing record is sufficient for two boolean flags |

---

## Schema Migrations Required

### V2 — Activity & Task Enhancements

```sql
-- Allow standalone activities (no CRM record association)
ALTER TABLE activities ALTER COLUMN entity_type DROP NOT NULL;
ALTER TABLE activities ALTER COLUMN entity_id DROP NOT NULL;

-- Recurring task support (P3)
ALTER TABLE tasks ADD COLUMN is_recurring BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN recurrence_pattern VARCHAR(20) 
  CHECK (recurrence_pattern IN ('DAILY', 'WEEKLY', 'MONTHLY'));
ALTER TABLE tasks ADD COLUMN recurrence_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE tasks ADD COLUMN parent_task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL;

-- Email reminder tracking (P2)
CREATE TABLE task_email_reminders (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task_id        TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  recipient_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interval_type  VARCHAR(20) NOT NULL CHECK (interval_type IN ('ONE_DAY', 'ONE_HOUR')),
  scheduled_at   TIMESTAMPTZ NOT NULL,
  sent_at        TIMESTAMPTZ,
  status         VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                   CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'CANCELLED')),
  failure_reason TEXT,
  retry_count    INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX task_email_reminders_pending_idx 
  ON task_email_reminders (scheduled_at) WHERE status = 'PENDING';
CREATE INDEX task_email_reminders_task_idx 
  ON task_email_reminders (task_id);
```

Note: This migration runs as a Flyway versioned script (`V2__activity_task_enhancements.sql`) applied to each tenant schema, not the platform schema.
