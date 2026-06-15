# Data Model: Activity & Task Management

**Feature**: 006-activity-task-mgmt
**Date**: 2026-06-15
**Schema scope**: Tenant schema (`tenant_{slug}`) — all tables below live per-tenant

---

## Entity Relationship Overview

```
users ──────────────────────────────────────────────────────────┐
  │                                                             │
  │ owner_id / created_by                        assignee_id   │
  ▼                                                             ▼
activities ──────────────────────────────────── tasks ──────────┘
  │                      │                        │
  │ entity_type          │ entity_type            │ entity_type
  │ entity_id            │ entity_id              │ entity_id
  ▼                      ▼                        ▼
contacts / accounts / leads / opportunities (CRM records — cross-ref only)

tasks ──── parent_task_id ──── tasks  (recurring chain, self-reference)
  │
  ├── notifications  (user_id = assignee_id, type = TASK_DUE / NEW_ASSIGNMENT)
  └── task_email_reminders  (recipient_id = assignee_id)
```

---

## Table: `activities`

Stores logged interactions (Call, Email, Meeting, Note) against CRM records or standalone.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PK, default gen_random_uuid() | |
| `type` | activity_type | NOT NULL | Enum: CALL, EMAIL, MEETING, NOTE, TASK |
| `entity_type` | entity_type | **NULLABLE** (migration V2) | Enum: CONTACT, ACCOUNT, LEAD, OPPORTUNITY |
| `entity_id` | TEXT | **NULLABLE** (migration V2) | FK-by-convention to the related record |
| `subject` | VARCHAR(500) | NOT NULL | Required field — free text |
| `body` | TEXT | NULLABLE | Description / notes body |
| `outcome` | TEXT | NULLABLE | Call outcome, meeting result, etc. |
| `duration_minutes` | INT | NULLABLE | Populated for CALL and MEETING types |
| `scheduled_at` | TIMESTAMPTZ | NULLABLE | When the activity occurred (activity date) |
| `completed_at` | TIMESTAMPTZ | NULLABLE | For TASK type activities (legacy) |
| `participants` | JSONB | DEFAULT '[]' | Array of participant objects |
| `attachments` | JSONB | DEFAULT '[]' | Array of attachment metadata |
| `owner_id` | TEXT | FK users(id), ON DELETE SET NULL | The user who logged the activity (author) |
| `pinned` | BOOLEAN | NOT NULL DEFAULT FALSE | Pinned to top of Timeline |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Auto-updated via trigger |
| `deleted_at` | TIMESTAMPTZ | NULLABLE | Soft-delete marker |

**Indexes** (existing):
- `activities_entity_idx` ON `(entity_type, entity_id, created_at DESC)` WHERE `deleted_at IS NULL`
- `activities_owner_id_idx` ON `(owner_id)` WHERE `deleted_at IS NULL`
- `activities_type_idx` ON `(type)` WHERE `deleted_at IS NULL`

**Validation rules**:
- `entity_type` and `entity_id` must both be non-null or both null (checked in service layer)
- `duration_minutes` is only meaningful for CALL and MEETING types; ignored for others
- `scheduled_at` defaults to creation time if not provided (service layer)

**State transitions**: None — activities are point-in-time records. Soft-delete via `deleted_at`.

---

## Table: `tasks`

Stores actionable work items with lifecycle tracking, assignments, and optional CRM associations.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PK, default gen_random_uuid() | |
| `title` | VARCHAR(500) | NOT NULL | Required |
| `description` | TEXT | NULLABLE | Optional detail |
| `priority` | task_priority | NOT NULL DEFAULT 'MEDIUM' | Enum: LOW, MEDIUM, HIGH, URGENT |
| `status` | task_status | NOT NULL DEFAULT 'OPEN' | Enum: OPEN, IN_PROGRESS, COMPLETED, CANCELLED |
| `due_at` | TIMESTAMPTZ | NULLABLE | Optional due date; drives notifications |
| `completed_at` | TIMESTAMPTZ | NULLABLE | Set when status → COMPLETED |
| `assignee_id` | TEXT | FK users(id), ON DELETE SET NULL | Required at creation |
| `entity_type` | entity_type | NULLABLE | CRM record type |
| `entity_id` | TEXT | NULLABLE | CRM record id |
| `reminder_at` | TIMESTAMPTZ | NULLABLE | Set when DUE_SOON notification is dispatched; cleared when due_at is pushed out |
| `created_by` | TEXT | FK users(id), ON DELETE SET NULL | Author of the task |
| `is_recurring` | BOOLEAN | NOT NULL DEFAULT FALSE | **(migration V2)** |
| `recurrence_pattern` | VARCHAR(20) | NULLABLE, CHECK IN ('DAILY','WEEKLY','MONTHLY') | **(migration V2)** |
| `recurrence_enabled` | BOOLEAN | NOT NULL DEFAULT TRUE | **(migration V2)** False = stop chain after this instance |
| `parent_task_id` | TEXT | FK tasks(id), ON DELETE SET NULL, NULLABLE | **(migration V2)** Links recurring instance chain |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Auto-updated via trigger |

**Indexes** (existing):
- `tasks_assignee_status_due_idx` ON `(assignee_id, status, due_at)`
- `tasks_entity_idx` ON `(entity_type, entity_id)` WHERE `status != 'COMPLETED'`

**Additional indexes needed (V2)**:
```sql
CREATE INDEX tasks_due_notification_idx 
  ON tasks (due_at) 
  WHERE status IN ('OPEN', 'IN_PROGRESS') 
    AND reminder_at IS NULL 
    AND due_at IS NOT NULL;
```

**Status state machine**:

```
OPEN ──► IN_PROGRESS ──► COMPLETED
  │            │
  └────────────┴──► CANCELLED
```

- Transitions from COMPLETED are not allowed (terminal state for normal flow)
- CANCELLED is a soft-delete equivalent; the task remains visible to managers

**RBAC enforcement** (service layer, not DB):
- Sales Rep may UPDATE/DELETE only tasks where `created_by = userId OR assignee_id = userId`
- Sales Manager may UPDATE/DELETE any task within the tenant
- Read-Only users may only call GET endpoints

---

## Table: `notifications`

Existing table — records in-app notifications for task-due alerts and reassignments.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PK | |
| `user_id` | TEXT | FK users(id), NOT NULL | Recipient |
| `type` | notification_type | NOT NULL | TASK_DUE, NEW_ASSIGNMENT, etc. |
| `title` | VARCHAR(500) | NOT NULL | Short title for notification centre |
| `body` | TEXT | NOT NULL | Detail message |
| `data` | JSONB | DEFAULT '{}' | Structured payload; `taskId` field for deep-link |
| `read_at` | TIMESTAMPTZ | NULLABLE | NULL = unread |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

**Key index** (existing):
- `notifications_user_unread_idx` ON `(user_id, created_at DESC)` WHERE `read_at IS NULL`

**Notification creation rules**:
- `TASK_DUE`: created by `TaskDueNotificationJob` when `due_at <= NOW() + interval '24 hours'` AND `reminder_at IS NULL`
- `NEW_ASSIGNMENT`: created by `TaskService.update()` when `assignee_id` changes

---

## Table: `task_email_reminders` *(new — migration V2)*

Tracks scheduled and sent email reminders for tasks, one row per task per reminder interval.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PK, default gen_random_uuid() | |
| `task_id` | TEXT | FK tasks(id), ON DELETE CASCADE, NOT NULL | |
| `recipient_id` | TEXT | FK users(id), ON DELETE CASCADE, NOT NULL | Assignee at time of scheduling |
| `interval_type` | VARCHAR(20) | NOT NULL, CHECK IN ('ONE_DAY','ONE_HOUR') | |
| `scheduled_at` | TIMESTAMPTZ | NOT NULL | When the reminder email should be sent |
| `sent_at` | TIMESTAMPTZ | NULLABLE | Set on successful delivery |
| `status` | VARCHAR(20) | NOT NULL DEFAULT 'PENDING', CHECK | PENDING, SENT, FAILED, CANCELLED |
| `failure_reason` | TEXT | NULLABLE | SMTP error or bounce reason |
| `retry_count` | INT | NOT NULL DEFAULT 0 | Incremented on each retry attempt |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

**Indexes**:
- `task_email_reminders_pending_idx` ON `(scheduled_at)` WHERE `status = 'PENDING'`
- `task_email_reminders_task_idx` ON `(task_id)`

**Reminder scheduling rules** (service layer):
- When a task with a due date is created: schedule reminders for each enabled interval (1 day before = `due_at - interval '1 day'`, 1 hour before = `due_at - interval '1 hour'`)
- If `scheduled_at <= NOW()` already, skip that interval (window already passed)
- When `due_at` is updated: cancel existing PENDING reminders for this task; reschedule based on new `due_at`
- When task is COMPLETED or CANCELLED: cancel all PENDING reminders

---

## Enum Reference

All enums are PostgreSQL types in the tenant schema.

| Enum | Values |
|------|--------|
| `activity_type` | CALL, EMAIL, MEETING, NOTE, TASK |
| `task_priority` | LOW, MEDIUM, HIGH, URGENT |
| `task_status` | OPEN, IN_PROGRESS, COMPLETED, CANCELLED |
| `entity_type` | CONTACT, ACCOUNT, LEAD, OPPORTUNITY |
| `notification_type` | TASK_DUE, DEAL_STAGE_CHANGED, NEW_ASSIGNMENT, MENTION, WORKFLOW_TRIGGERED, IMPORT_COMPLETE, STALE_DEAL, SYSTEM_ALERT |

**Spec-to-schema priority mapping**:

| Spec value | DB enum value | Notes |
|------------|---------------|-------|
| Low        | LOW           | |
| Medium     | MEDIUM        | |
| High       | HIGH          | |
| (not in spec) | URGENT     | Available in DB; not exposed in this feature |

**Spec-to-schema entity type mapping**:

| Spec / API term | DB enum value |
|-----------------|---------------|
| Contact         | CONTACT       |
| Company         | ACCOUNT       |
| Deal            | OPPORTUNITY   |
| Lead            | LEAD          |

---

## Relationships Summary

| Relationship | Cardinality | Notes |
|-------------|-------------|-------|
| Activity → CRM record | N:0..1 | entity_type + entity_id FK-by-convention (nullable) |
| Task → CRM record | N:0..1 | entity_type + entity_id FK-by-convention (nullable) |
| Task → User (assignee) | N:1 | assignee_id FK |
| Task → User (creator) | N:1 | created_by FK |
| Task → Notification | 1:N | via TASK_DUE and NEW_ASSIGNMENT types |
| Task → task_email_reminders | 1:N | up to 2 rows per task (ONE_DAY, ONE_HOUR) |
| Task → Task (recurring chain) | 1:0..1 | parent_task_id self-reference |
| Notification → User | N:1 | user_id FK |
| Activity → User (author) | N:1 | owner_id FK |
