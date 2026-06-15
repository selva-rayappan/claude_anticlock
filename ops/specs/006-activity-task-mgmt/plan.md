# Implementation Plan: Activity & Task Management

**Branch**: `006-activity-task-mgmt` | **Date**: 2026-06-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-activity-task-mgmt/spec.md`

---

## Summary

Deliver the Activity & Task Management capability for OpsNext CRM: logging Call/Email/Meeting/Note activities against CRM records, full Task lifecycle (create → assign → complete), in-app due-date notifications via a scheduled background job, a Notifications API, and a Manager overdue task view. P2 email reminders and P3 recurring tasks follow in later phases. The backend Activity and Task controllers are partially implemented; this plan extends them with RBAC, update endpoints, a Notifications API, frontend UI, and the scheduler infrastructure. All work runs within the existing Spring Boot + Next.js + PostgreSQL tenant-per-schema stack.

---

## Technical Context

**Language/Version**: Java 21 (backend) / TypeScript (frontend)

**Primary Dependencies**: Spring Boot 3.4.1, Next.js 15 App Router, React 19, shadcn/ui, TanStack Query, Zustand, JJWT 0.12.6

**Storage**: PostgreSQL 16 (schema-per-tenant via `TenantJdbcTemplate`); Redis 7 (Lettuce)

**Testing**: JUnit 5 + Spring Boot Test (backend); Playwright / React Testing Library (frontend)

**Target Platform**: Linux server container (Docker Compose locally, Kubernetes in production)

**Project Type**: Multi-tenant SaaS web application (Spring Boot API + Next.js frontend)

**Performance Goals**: Timeline load < 2 s (200 items); notification delivery ≤ 5 min; list endpoints p95 ≤ 200 ms

**Constraints**: All reads/writes via `TenantJdbcTemplate`; no cross-tenant queries; soft-delete only; audit log every mutation; API response envelope `{ data, meta?, errors? }`

**Scale/Scope**: Up to 500 concurrent tenants; up to 10,000 concurrent users; Tasks/Activities indexed per-tenant

---

## Constitution Check

*GATE: Must pass before Phase 1 implementation begins. Re-check after Phase 2.*

| Principle | Check | Assessment |
|-----------|-------|------------|
| I. Multi-Tenancy First | All `TenantJdbcTemplate` queries for activities, tasks, notifications. No direct datasource access. | ✅ PASS — existing code already uses `TenantJdbcTemplate`; extension follows same pattern |
| II. API Contract Integrity | Versioned REST at `/api/v1/`. Response envelope `{ data }`. Machine-readable error codes. Contracts defined in `contracts/`. | ✅ PASS — contracts defined in [contracts/](contracts/) |
| III. Phase-Gate Delivery | Each implementation phase ends with a localhost review of working endpoints. Product Owner must approve before next phase. | ✅ PASS — phase gate in each phase below |
| IV. Security & Auth Discipline | JWT via `SecurityPrincipal`. RBAC checks in service layer. No string-concatenated queries. | ✅ PASS — existing pattern; RBAC enforcement added in Phase 1 |
| V. Simplicity & Integration-Ready | Spring `@Scheduled` for notifications (no separate process). `JavaMailSender` for email. No speculative abstractions. | ✅ PASS — no new dependencies required |
| VI. Observability by Default | Structured audit log entries for every activity/task mutation. Scheduler logs per run. Email reminder failures logged per row. | ✅ PASS — audit log writes mandated in FR-ATM-006 and FR-ATM-013 |

---

## Project Structure

### Documentation (this feature)

```text
specs/006-activity-task-mgmt/
├── plan.md              # This file
├── research.md          # Phase 0 findings
├── data-model.md        # Phase 1 data model
├── quickstart.md        # Phase 1 validation guide
├── contracts/
│   ├── activities.yaml  # Activities API contract
│   ├── tasks.yaml       # Tasks API contract
│   └── notifications.yaml  # Notifications API contract
└── tasks.md             # Phase 2 output (/speckit-tasks — not yet created)
```

### Source Code (repository root under `OpsNext/`)

```text
backend/src/main/java/io/opsnext/api/
├── activity/
│   ├── ActivityController.java        # EXTEND: add PUT /{id}, fix standalone
│   ├── ActivityService.java           # EXTEND: update(), RBAC on delete/update
│   └── dto/
│       ├── ActivityRequest.java       # EXTEND: add Update record
│       └── ActivityResponse.java      # NEW: typed response (optional — Map ok for now)
├── task/
│   ├── TaskController.java            # EXTEND: RBAC enforcement pass-through
│   ├── TaskService.java               # EXTEND: RBAC checks, recurrence on complete (P3)
│   └── dto/
│       └── TaskRequest.java           # EXTEND: add isRecurring, recurrencePattern (P3)
├── notification/                       # NEW package
│   ├── NotificationController.java    # NEW: GET /, POST /{id}/read, POST /read-all
│   ├── NotificationService.java       # NEW: list, markRead, markAllRead, create (internal)
│   └── scheduler/
│       ├── TaskDueNotificationJob.java   # NEW: @Scheduled every 5 min (P1)
│       └── TaskEmailReminderJob.java     # NEW: @Scheduled every 5 min (P2)
└── config/
    └── SchedulerConfig.java           # NEW: enable @EnableScheduling

backend/src/main/resources/db/
└── migration/
    └── (tenant schema migrations managed per-tenant via TenantSchemaService)

frontend/src/
├── app/(app)/
│   ├── tasks/
│   │   └── page.tsx                   # NEW: My Tasks + Overdue view toggle
│   ├── contacts/[id]/
│   │   └── page.tsx                   # EXTEND: add Timeline tab
│   └── (deal pages added in 005-deal-pipeline or future phase)
├── components/
│   ├── activities/
│   │   ├── log-activity-modal.tsx     # NEW: Log Activity slide-over
│   │   └── activity-feed.tsx          # NEW: Timeline Activity entries
│   ├── tasks/
│   │   ├── task-card.tsx              # NEW: Task card (Timeline + list)
│   │   ├── create-task-modal.tsx      # NEW: Create/Edit Task dialog
│   │   └── task-list.tsx              # NEW: Tasks list view with filters
│   ├── timeline/
│   │   └── timeline.tsx               # NEW: Combined Activity + Task Timeline
│   └── layout/
│       └── topbar.tsx                 # EXTEND: add notification bell
├── hooks/
│   ├── use-activities.ts              # NEW: TanStack Query hooks for activities
│   ├── use-tasks.ts                   # NEW: TanStack Query hooks for tasks
│   └── use-notifications.ts           # NEW: notification list + mark-read
└── lib/
    └── api.ts                         # EXTEND: align activities.list path, add tasks.complete
```

---

## Complexity Tracking

> No Constitution violations — this section is N/A for this feature.

---

## Implementation Phases

---

### Phase 1: Backend API Completion (P1 — Backend) *(GATE: localhost API review)*

**Goal**: All Activity and Task API endpoints behave correctly per contracts. NotificationService and NotificationController are live. RBAC is enforced. Schema migration V2 applied.

**Deliverables**:

1. **Schema migration** (`V2__activity_task_enhancements.sql` applied to tenant schemas):
   - `ALTER TABLE activities ALTER COLUMN entity_type DROP NOT NULL`
   - `ALTER TABLE activities ALTER COLUMN entity_id DROP NOT NULL`
   - Add recurrence columns to `tasks` (P3 columns added now to avoid second migration)
   - Add `task_email_reminders` table

2. **ActivityService** — add `update(id, req, principal)` method:
   - Fetch activity; verify `owner_id = principal.userId()` OR principal has Manager role
   - Update subject, body, outcome, scheduledAt, durationMinutes
   - Audit log: write UPDATE entry

3. **ActivityController** — add `PUT /{id}` endpoint mapping to `ActivityService.update()`

4. **ActivityRequest** — add `Update` record (subject, body, outcome, scheduledAt, durationMinutes — all optional)

5. **ActivityService.delete()** — add ownership check:
   - Fetch `owner_id` from the row; compare to `principal.userId()` OR Manager role
   - Throw `AppException.forbidden()` if neither condition met

6. **ActivityService.create()** — fix standalone support:
   - Change validation to allow `entityType == null AND entityId == null`
   - Remove `@NotNull` from `ActivityRequest.Create.entityType` and `.entityId`

7. **TaskService.update()** — add RBAC:
   - Fetch task `created_by` and `assignee_id`
   - Allow if `principal.userId() in {created_by, assignee_id}` OR Manager role
   - If `assignee_id` changed: call `NotificationService.create()` with type NEW_ASSIGNMENT

8. **TaskService.delete()** — add RBAC (same ownership check)

9. **TaskService.complete()** — after setting COMPLETED:
   - Set `tasks.reminder_at = due_at` to mark notification as "fired" (prevents re-queuing)
   - Cancel PENDING entries in `task_email_reminders` for this task
   - (P3 hook point: if `is_recurring AND recurrence_enabled`, spawn next instance)

10. **NotificationService** (new):
    - `create(tenantId, userId, type, title, body, data)` — INSERT into notifications
    - `list(userId, unread, page, limit)` — SELECT with pagination
    - `markRead(id, userId)` — UPDATE read_at
    - `markAllRead(userId)` — UPDATE read_at WHERE read_at IS NULL

11. **NotificationController** (new):
    - `GET /api/v1/notifications` → `list()`
    - `POST /api/v1/notifications/{id}/read` → `markRead()`
    - `POST /api/v1/notifications/read-all` → `markAllRead()`

12. **api.ts path alignment**:
    - `activities.list` currently points to `/api/v1/activities/entity/{type}/{id}` (path params)
    - Controller uses query params; align controller to match OR update api.ts path
    - Decision: Update `api.ts` to use query params (simpler, already implemented in controller)

**Phase 1 gate**: Run `./gradlew bootRun`. Using curl or Swagger UI (`/swagger-ui.html`):
- `POST /api/v1/activities` (with and without entityType/entityId) — expect 201
- `PUT /api/v1/activities/{id}` — expect 200
- `DELETE /api/v1/activities/{id}` (own activity) — expect 204
- `DELETE /api/v1/activities/{id}` (different user) — expect 403
- `GET /api/v1/tasks?overdue=true` — expect 200
- `PUT /api/v1/tasks/{id}` (non-owner) — expect 403
- `GET /api/v1/notifications` — expect 200
- `POST /api/v1/notifications/read-all` — expect 200

---

### Phase 2: Frontend — Timeline + Task List + Log Activity (P1 — Frontend) *(GATE: localhost UI review)*

**Goal**: Sales Rep can log activities, create tasks, see the combined Timeline on Contact detail, and manage their task list.

**Deliverables**:

1. **`use-activities.ts`** — TanStack Query hooks:
   - `useActivities(entityType, entityId)` — GET /api/v1/activities with filters
   - `useLogActivity()` — mutation for POST /api/v1/activities
   - `useUpdateActivity()` — mutation for PUT
   - `useDeleteActivity()` — mutation for DELETE

2. **`use-tasks.ts`** — TanStack Query hooks:
   - `useTasks(filters)` — GET /api/v1/tasks with query params
   - `useMyTasks()` — GET /api/v1/tasks?myTasks=true
   - `useOverdueTasks()` — GET /api/v1/tasks?overdue=true
   - `useCreateTask()` — mutation for POST
   - `useUpdateTask()` — mutation for PUT
   - `useCompleteTask()` — mutation for POST /{id}/complete
   - `useCancelTask()` — mutation for DELETE

3. **`activity-feed.tsx`** — renders a list of Activity items from the API.
   Each entry shows: type icon, subject, author, date, duration (if Call/Meeting), outcome.

4. **`task-card.tsx`** — renders a single Task entry in Timeline or list context.
   Shows: checkbox (complete action), title, due date, priority badge, assignee avatar.

5. **`timeline.tsx`** — merges activities + tasks for a CRM record into a reverse-chronological feed.
   Fetches both via `useActivities` and `useTasks` in parallel; merges client-side by date.
   "Log Activity" button and "Add Task" button live at the top.

6. **`log-activity-modal.tsx`** — slide-over or dialog for logging activities:
   - Type selector (Call/Email/Meeting/Note)
   - Subject, body, outcome, date, duration
   - Pre-fills entityType/entityId from context (Contact/Deal page)

7. **`create-task-modal.tsx`** — dialog for creating/editing tasks:
   - Title, due date (date picker), priority dropdown, assignee user picker
   - CRM association pre-filled from context
   - Recurrence controls (P3 — hidden behind feature flag or placeholder for now)

8. **`task-list.tsx`** — reusable task list with status/priority column badges and completion checkbox.

9. **`app/(app)/tasks/page.tsx`** — My Tasks page:
   - Default view: my open tasks (sorted by due date)
   - Toggle for Sales Manager: switch to "Overdue Tasks" view
   - Filters: priority, linked record type
   - Reassign action (Manager only)

10. **`app/(app)/contacts/[id]/page.tsx`** — extend Contact detail:
    - Add "Timeline" tab showing `<Timeline entityType="CONTACT" entityId={id} />`
    - "Log Activity" and "Add Task" buttons scoped to this contact

11. **Topbar notification bell** (`components/layout/topbar.tsx`):
    - Bell icon with unread count badge
    - Dropdown listing the 5 most recent notifications
    - "Mark all read" link
    - Each notification links to the relevant task

**Phase 2 gate**: On localhost browser:
- Log a Call on a Contact — appears in Timeline immediately
- Create a Task linked to a Contact — appears in Timeline with task card
- Mark the Task Complete from the Timeline — card shows "Completed" state
- Navigate to `/tasks` — see "My Tasks" list with the completed task filtered out
- (Manager) Switch to "Overdue Tasks" — see tasks with past due dates

---

### Phase 3: In-App Notification Scheduler (P1 — Backend) *(GATE: notification delivery verified on localhost)*

**Goal**: Tasks entering the 24-hour window trigger in-app notifications automatically.

**Deliverables**:

1. **`SchedulerConfig.java`** — `@Configuration @EnableScheduling` bean.

2. **`TaskDueNotificationJob.java`**:
   ```
   @Scheduled(fixedDelay = 5, timeUnit = MINUTES)
   run():
     For each active tenant:
       Query tasks WHERE due_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
         AND status IN ('OPEN', 'IN_PROGRESS')
         AND reminder_at IS NULL
         AND assignee_id IS NOT NULL
       For each task:
         NotificationService.create(TASK_DUE, assignee, "Task due soon: {title}", data: {taskId})
         UPDATE tasks SET reminder_at = NOW() WHERE id = {taskId}
   ```
   - Runs within `TenantContext` per tenant; uses `TenantJdbcTemplate`
   - Structured log entry per batch: `{job: TaskDueNotificationJob, tenant: ..., notified: N}`

3. **TaskService.update()** addition:
   - If `dueDate` is being updated AND new `due_at > NOW() + INTERVAL '24 hours'`:
     - `UPDATE tasks SET reminder_at = NULL WHERE id = ?` (re-arm notification)
   - If `dueDate` is updated to null or a past date, do not re-arm

**Phase 3 gate**: Create a task with `dueDate` 10 minutes from now. After ≤ 5 min, a TASK_DUE notification appears in the notification bell for the assignee. Verify via `GET /api/v1/notifications?unread=true`.

---

### Phase 4: Email Reminders + Manager Overdue View (P2) *(GATE: localhost email + overdue UI review)*

**Goal**: Email reminders send to task assignees at the 1-day and 1-hour intervals. Manager can see and reassign overdue tasks.

**Deliverables**:

1. **`TaskEmailReminderJob.java`**:
   ```
   @Scheduled(fixedDelay = 5, timeUnit = MINUTES)
   run():
     For each active tenant:
       Query task_email_reminders WHERE status = 'PENDING' AND scheduled_at <= NOW()
       For each reminder:
         If task.status IN (OPEN, IN_PROGRESS):
           Send email via JavaMailSender
           UPDATE status = 'SENT', sent_at = NOW()
         Else:
           UPDATE status = 'CANCELLED'
   ```

2. **Email template** — plain text and HTML email with task title, due date, priority, and link.

3. **Email reminder scheduling in `TaskService`**:
   - On `create()`: if `due_at IS NOT NULL`, insert rows for ONE_DAY and ONE_HOUR intervals
     (skip intervals whose `scheduled_at <= NOW()`)
   - On `update()` where `due_at` changes: cancel existing PENDING reminders; insert fresh rows
   - On `complete()` and `delete()`: cancel all PENDING reminders

4. **Overdue task management in `TaskService.update()`**:
   - When `assignee_id` changes: create NEW_ASSIGNMENT notification (already in Phase 1)

5. **Frontend Manager Overdue View** (`app/(app)/tasks/page.tsx`):
   - Already partially built in Phase 2; activate the "Overdue Tasks" tab for Managers
   - Add "Reassign" dropdown on each task row (opens user picker)
   - Filters: assignee name, priority, linked record type

**Phase 4 gate**:
- Create task due 25 hours from now. Check `task_email_reminders` table for PENDING ONE_DAY row.
- Advance system time or wait; verify email arrives in MailHog / Mailtrap.
- Mark task Completed; verify email reminder status → CANCELLED.
- As Manager: view Overdue Tasks, filter by rep, reassign — rep receives NEW_ASSIGNMENT notification.

---

### Phase 5: Recurring Tasks (P3) *(GATE: localhost recurring task chain verified)*

**Goal**: Sales Reps can create recurring tasks; completing an instance auto-creates the next.

**Deliverables**:

1. **`TaskRequest.Create`** — add `isRecurring` (boolean), `recurrencePattern` (string).

2. **`TaskService.create()`** — if `isRecurring = true AND recurrencePattern != null`:
   - Set `is_recurring = true`, `recurrence_pattern`, `recurrence_enabled = true` on INSERT

3. **`TaskService.complete()`** — after COMPLETED:
   - If `is_recurring = true AND recurrence_enabled = true`:
     - Calculate `nextDueAt = due_at + (1 day | 7 days | 1 calendar month)`
     - INSERT new task with same fields, `parent_task_id = completedTaskId`, `due_at = nextDueAt`
     - Schedule email reminders for the new instance
     - Return `{ completedTask, nextRecurrence }` in the response

4. **`TaskRequest.Update`** — add `recurrenceEnabled` (boolean) to allow stopping the chain.

5. **Frontend** (`create-task-modal.tsx`):
   - Unhide recurrence toggle and pattern dropdown
   - Show "Recurring" badge on task cards where `isRecurring = true`

**Phase 5 gate**: Create weekly recurring task; complete 3 consecutive instances; verify each spawns the next with correct due date. Disable recurrence on instance 3; verify no 4th instance after completion.

---

## Cross-Cutting Concerns

### Audit Logging

Every `ActivityService` and `TaskService` mutation must write to `audit_logs`. Use the existing pattern from `ContactService` or equivalent. Target `entity_type` in the audit log:
- Activity mutations: log against the activity's `entity_type` / `entity_id` (or a synthetic `ACTIVITY` type if the enum is extended)
- Task mutations: log against the task's `entity_type` / `entity_id` (or synthetic `TASK` type)

Check with the Product Owner whether `audit_logs.entity_type` enum needs extending to include `ACTIVITY` and `TASK` values, or whether mutation audit is handled through the existing entity association.

### Structured Logging

Each request touching a task or activity must emit a structured log entry with `tenantId`, `userId`, `operation`, `entityId`, `durationMs` per Constitution Principle VI. Add this to the service methods using the existing logging infrastructure.

### TenantContext

The `TaskDueNotificationJob` and `TaskEmailReminderJob` must iterate over active tenants (from the platform schema) and set `TenantContext` per tenant before executing queries. Follow the same pattern used by any existing background job. The `TenantJdbcTemplate` will fail without a set tenant context — this must be done explicitly in the scheduler.
