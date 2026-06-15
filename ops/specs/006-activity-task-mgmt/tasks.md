# Tasks: Activity & Task Management

**Input**: Design documents from `specs/006-activity-task-mgmt/`

**Prerequisites**: [plan.md](plan.md) · [spec.md](spec.md) · [research.md](research.md) · [data-model.md](data-model.md) · [contracts/](contracts/)

**Organization**: Tasks are grouped by user story to enable independent implementation
and testing of each increment. All paths are relative to `OpsNext/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependency on incomplete work)
- **[Story]**: User story this task belongs to (US1–US6 maps to spec.md stories)
- All paths are relative to the `OpsNext/` monorepo root

---

## Phase 1: Setup (Schema + Configuration)

**Purpose**: Apply the database migration, add missing DTOs, and enable the scheduler.
These are pre-requisites for every user story phase.

**⚠️ COMPLETE BEFORE ANY FEATURE WORK BEGINS**

- [ ] T001 Apply tenant schema migration V2: make `activities.entity_type` and `activities.entity_id` nullable; add recurrence columns (`is_recurring`, `recurrence_pattern`, `recurrence_enabled`, `parent_task_id`) to `tasks`; add `task_email_reminders` table — in `backend/src/main/resources/db/tenant-schema-template.sql`
- [ ] T002 [P] Add `Update` record to `ActivityRequest` (fields: subject, body, outcome, scheduledAt, durationMinutes — all optional) in `backend/src/main/java/io/opsnext/api/activity/dto/ActivityRequest.java`
- [ ] T003 [P] Create `SchedulerConfig` with `@Configuration @EnableScheduling` in `backend/src/main/java/io/opsnext/api/config/SchedulerConfig.java`
- [ ] T004 [P] Update `paths.activities.list` in `frontend/src/lib/api.ts` from path-param form (`/entity/{type}/{id}`) to query-param form (`?entityType={type}&entityId={id}`) to match the existing `ActivityController` GET endpoint

**Checkpoint**: Migration applied, DTOs compiled, scheduling enabled — user story work can begin.

---

## Phase 2: Foundational — Notification Backend

**Purpose**: Build the `NotificationService` and `NotificationController` that US2 (task
reassignment), US3 (due-soon bell), and US4 (overdue reassignment) all depend on.

**⚠️ BLOCKS US2, US3, and US4 — complete before those phases start**

- [ ] T005 Create `NotificationService` with methods: `create(tenantId, userId, type, title, body, data)`, `list(userId, unreadOnly, page, limit)` → `PageResponse`, `markRead(notificationId, userId)`, `markAllRead(userId)` — in `backend/src/main/java/io/opsnext/api/notification/NotificationService.java`
- [ ] T006 Create `NotificationController` mapped to `/api/v1/notifications` with: `GET /` (list, query params `unread`, `page`, `limit`), `POST /{id}/read`, `POST /read-all` — in `backend/src/main/java/io/opsnext/api/notification/NotificationController.java`

**Checkpoint**: `GET /api/v1/notifications`, `POST /api/v1/notifications/read-all` return 200 on localhost. Notification bell user stories can now proceed.

---

## Phase 3: User Story 1 — Log Activity (Priority: P1) 🎯 MVP

**Goal**: Sales Rep can log a Call, Email, Meeting, or Note against any CRM record or
standalone, edit it, delete it (own or as Manager), and see it in the CRM record Timeline.

**Independent Test**:
1. `POST /api/v1/activities` with `entityType=CONTACT` + `entityId` → 201
2. `POST /api/v1/activities` without entityType/entityId (standalone) → 201
3. `PUT /api/v1/activities/{id}` by owner → 200; by non-owner Sales Rep → 403
4. `DELETE /api/v1/activities/{id}` by non-owner Sales Rep → 403; by Manager → 204
5. `GET /api/v1/activities?entityType=CONTACT&entityId={id}` → includes logged activity

### Backend — Activity Service & Controller

- [ ] T007 [US1] Extend `ActivityService.create()`: remove `@NotNull` from entityType/entityId validation; allow both null (standalone) or both non-null; throw `ValidationException` if only one is provided — in `backend/src/main/java/io/opsnext/api/activity/ActivityService.java`
- [ ] T008 [US1] Implement `ActivityService.update(id, req, principal)`: fetch activity `owner_id`; allow update only if `owner_id == principal.userId()` OR principal has Manager/Admin role; update subject, body, outcome, scheduledAt, durationMinutes; write audit log UPDATE entry — in `backend/src/main/java/io/opsnext/api/activity/ActivityService.java`
- [ ] T009 [US1] Extend `ActivityService.delete(id, principal)`: fetch `owner_id` before soft-delete; throw `AppException.forbidden("ACTIVITY_FORBIDDEN")` if caller is not the author AND not a Manager/Admin — in `backend/src/main/java/io/opsnext/api/activity/ActivityService.java`
- [ ] T010 [US1] Add audit log writes (using `TenantJdbcTemplate` INSERT into `audit_logs`) for every `create()`, `update()`, and `delete()` call in `ActivityService` — in `backend/src/main/java/io/opsnext/api/activity/ActivityService.java`
- [ ] T011 [US1] Add `PUT /api/v1/activities/{id}` endpoint to `ActivityController` delegating to `ActivityService.update()` — in `backend/src/main/java/io/opsnext/api/activity/ActivityController.java`

### Frontend — Activity Feed & Log Activity Modal

- [ ] T012 [P] [US1] Create `useActivities(entityType, entityId)`, `useLogActivity()`, `useUpdateActivity()`, `useDeleteActivity()` TanStack Query hooks — in `frontend/src/hooks/use-activities.ts`
- [ ] T013 [P] [US1] Create `ActivityFeed` component: renders a list of activities from the API with type icon (Call/Email/Meeting/Note), subject, author name, timestamp, duration badge — in `frontend/src/components/activities/activity-feed.tsx`
- [ ] T014 [US1] Create `LogActivityModal` slide-over or Dialog: fields for type, subject, body, outcome, date, duration; pre-fills entityType/entityId from context prop; calls `useLogActivity()` mutation on submit — in `frontend/src/components/activities/log-activity-modal.tsx`

**Checkpoint**: Log a Call on a Contact via the UI. It appears in `GET /api/v1/activities?entityType=CONTACT&entityId={id}`. Edit the outcome — change persists. Non-owner rep's delete returns 403.

---

## Phase 4: User Story 2 — Create and Manage Tasks (Priority: P1)

**Goal**: Sales Rep can create a Task (standalone or linked to a CRM record), assign it,
mark it complete, and view it in both the global Task list and the CRM record Timeline.

**Independent Test**:
1. `POST /api/v1/tasks` with full fields → 201; task appears in `GET /api/v1/tasks?myTasks=true`
2. `PUT /api/v1/tasks/{id}` by non-owner Sales Rep → 403
3. `PUT /api/v1/tasks/{id}` by Sales Manager → 200
4. `POST /api/v1/tasks/{id}/complete` → 200, status = COMPLETED; task stays in Timeline
5. Task linked to Contact appears in `GET /api/v1/tasks?entityType=CONTACT&entityId={id}`

### Backend — Task Service RBAC & Notifications

- [ ] T015 [US2] Add RBAC ownership check to `TaskService.update()`: fetch task `created_by` and `assignee_id`; allow update only if caller is in `{created_by, assignee_id}` OR has Manager/Admin role; throw `AppException.forbidden("TASK_FORBIDDEN")` otherwise — in `backend/src/main/java/io/opsnext/api/task/TaskService.java`
- [ ] T016 [US2] Add RBAC ownership check to `TaskService.delete()` using same logic as T015 — in `backend/src/main/java/io/opsnext/api/task/TaskService.java`
- [ ] T017 [US2] In `TaskService.update()`, after verifying RBAC: if `assigneeId` field is changing, call `NotificationService.create()` with type `NEW_ASSIGNMENT`, title `"Task reassigned: {title}"`, and `data: {taskId}` for the new assignee — in `backend/src/main/java/io/opsnext/api/task/TaskService.java`
- [ ] T018 [US2] Add audit log writes for every `create()`, `update()`, `delete()`, and `complete()` call in `TaskService` — in `backend/src/main/java/io/opsnext/api/task/TaskService.java`

### Frontend — Task Cards, Timeline, and My Tasks Page

- [ ] T019 [P] [US2] Create `useTasks(filters)`, `useMyTasks()`, `useOverdueTasks()`, `useCreateTask()`, `useUpdateTask()`, `useCompleteTask()`, `useCancelTask()` TanStack Query hooks — in `frontend/src/hooks/use-tasks.ts`
- [ ] T020 [P] [US2] Create `TaskCard` component: checkbox (calls `useCompleteTask()`), title, due date, priority badge, assignee avatar, status chip, "Completed" visual when done — in `frontend/src/components/tasks/task-card.tsx`
- [ ] T021 [US2] Create `CreateTaskModal` Dialog: fields for title, description, due date picker, priority dropdown, assignee user picker (fetches tenant users), CRM association select (entityType + entityId); recurrence controls hidden/disabled for now (P3 placeholder) — in `frontend/src/components/tasks/create-task-modal.tsx`
- [ ] T022 [US2] Create `TaskList` reusable component: renders a list of `TaskCard` entries; accepts filters prop; includes "Add Task" button triggering `CreateTaskModal`; shows "Show completed" toggle — in `frontend/src/components/tasks/task-list.tsx`
- [ ] T023 [US2] Create `Timeline` component: fetches activities (`useActivities`) and tasks (`useTasks`) for a given entityType/entityId in parallel; merges and sorts by date descending; renders `ActivityFeed` entries and `TaskCard` entries interleaved; "Log Activity" and "Add Task" buttons at top — in `frontend/src/components/timeline/timeline.tsx`
- [ ] T024 [US2] Create `/tasks` page with "My Tasks" default view (calls `useMyTasks()`) and a "Overdue" tab visible to Managers (calls `useOverdueTasks()`); sidebar nav link added — in `frontend/src/app/(app)/tasks/page.tsx`
- [ ] T025 [US2] Extend Contact detail page to include a "Timeline" tab that renders `<Timeline entityType="CONTACT" entityId={contactId} />`; "Log Activity" and "Add Task" buttons scoped to the contact — in `frontend/src/app/(app)/contacts/[id]/page.tsx`

**Checkpoint**: Create task linked to a Contact, mark it complete → card shows "Completed" in Timeline. Navigate to `/tasks` → see task in My Tasks. Verify `PUT /api/v1/tasks/{id}` by non-owner returns 403.

---

## Phase 5: User Story 3 — Task Due Notifications (Priority: P1)

**Goal**: The system automatically notifies the task assignee within 5 minutes when a task's
due date is within 24 hours, and cancels queued notifications when due date is extended.

**Independent Test**:
1. Create task with `dueDate` = now + 20 hours. Wait ≤ 5 min. `GET /api/v1/notifications?unread=true` returns a TASK_DUE notification for the assignee.
2. Mark task complete → notification shows as stale (no new DUE_SOON fires for this task).
3. Update task `dueDate` to now + 36 hours → `tasks.reminder_at` is cleared; no notification re-fires until the new window is crossed.

### Backend — Scheduler & Service Hooks

- [ ] T026 [US3] Create `TaskDueNotificationJob`: annotate `@Scheduled(fixedDelay = 5, timeUnit = MINUTES)`; iterate active tenants from platform schema; for each tenant set `TenantContext`; query tasks where `due_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours' AND status IN ('OPEN','IN_PROGRESS') AND reminder_at IS NULL AND assignee_id IS NOT NULL`; for each row call `NotificationService.create(TASK_DUE, assignee, "Task due soon: {title}", {taskId, dueAt})`; then `UPDATE tasks SET reminder_at = NOW() WHERE id = ?` — in `backend/src/main/java/io/opsnext/api/notification/scheduler/TaskDueNotificationJob.java`
- [ ] T027 [US3] In `TaskService.update()`, after field updates: if `dueDate` field is changing AND new `due_at > NOW() + INTERVAL '24 hours'`, execute `UPDATE tasks SET reminder_at = NULL WHERE id = ?` to re-arm the notification — in `backend/src/main/java/io/opsnext/api/task/TaskService.java`
- [ ] T028 [US3] In `TaskService.complete()`, after status update to COMPLETED: execute `UPDATE tasks SET reminder_at = NOW() WHERE id = ? AND reminder_at IS NULL` so the scheduler does not re-notify on a completed task — in `backend/src/main/java/io/opsnext/api/task/TaskService.java`

### Frontend — Notification Bell

- [ ] T029 [P] [US3] Create `useNotifications()` hook: `GET /api/v1/notifications?unread=true&limit=10` via TanStack Query, `useMarkRead()` mutation, `useMarkAllRead()` mutation; polling interval 60 s — in `frontend/src/hooks/use-notifications.ts`
- [ ] T030 [US3] Add notification bell to topbar: bell icon with unread count badge (from `useNotifications()`); click opens dropdown listing 5 most recent notifications; each row shows title, body, relative time, and navigates to `data.taskId` on click; "Mark all read" link at bottom — in `frontend/src/components/layout/topbar.tsx`

**Checkpoint**: Verify with a task due in ≤ 23 hours that a TASK_DUE notification appears in the bell within 5 minutes. Marking the task complete makes the bell count drop.

---

## Phase 6: User Story 4 — Manager Overdue Task View (Priority: P2)

**Goal**: Sales Manager sees all overdue Open/In Progress tasks in the tenant, can filter
by assignee and priority, and can reassign any task with the new assignee receiving a
NEW_ASSIGNMENT notification.

**Independent Test**:
1. Create 3 tasks with past due dates (OPEN). Sign in as Manager. Open `/tasks` Overdue tab → all 3 appear with "X days overdue" label.
2. Filter by assignee "Sales Rep A" → only rep's tasks shown.
3. Reassign a task to Sales Rep B → assignee updates; Rep B receives a bell notification.

### Backend — Verify Overdue Query Scoping

- [ ] T031 [US4] Verify `TaskService.list()` with `overdue=true`: confirm the query does NOT filter by `assignee_id = principal.userId()` when the caller has Manager/Admin role — any overdue task in the tenant must be returned; fix scoping if needed — in `backend/src/main/java/io/opsnext/api/task/TaskService.java`

### Frontend — Overdue Tab + Reassign

- [ ] T032 [P] [US4] Add `useReassignTask(id, newAssigneeId)` mutation (calls `PUT /api/v1/tasks/{id}` with `assigneeId`) to `use-tasks.ts` — in `frontend/src/hooks/use-tasks.ts`
- [ ] T033 [US4] Extend `/tasks` Overdue tab (built in T024): show table columns — title, original due date, days-overdue count, priority badge, current assignee, linked CRM record name; add "Reassign" dropdown per row (fetches tenant users); wire to `useReassignTask()`; add filter controls for assignee and priority — in `frontend/src/app/(app)/tasks/page.tsx`

**Checkpoint**: Manager view shows all tenant overdue tasks with correct days-overdue count. Reassign updates immediately; new assignee's bell shows the NEW_ASSIGNMENT notification.

---

## Phase 7: User Story 5 — Email Reminders for Tasks (Priority: P2)

**Goal**: Email reminders are sent to task assignees 1 day and 1 hour before the due date
(both intervals enabled by default). Completed/cancelled tasks never trigger reminders.

**Independent Test**:
1. Create task due 25 hours from now. Verify `task_email_reminders` has two PENDING rows (ONE_DAY and ONE_HOUR). Wait for ONE_DAY scheduled_at to pass; verify row status = SENT and email arrives in MailHog.
2. Create task, then mark complete before reminder fires. Verify ONE_DAY row status = CANCELLED.

### Backend — Email Reminder Scheduler & Scheduling Logic

- [ ] T034 [US5] Create `TaskEmailReminderJob`: `@Scheduled(fixedDelay = 5, timeUnit = MINUTES)`; iterate active tenants; for each tenant query `task_email_reminders` WHERE `status = 'PENDING' AND scheduled_at <= NOW()`; for each row fetch the task's current status; if status ∈ {OPEN, IN_PROGRESS}: send email via `JavaMailSender` with task title, due date, priority, and link; UPDATE row `status = 'SENT', sent_at = NOW()`; if task status is COMPLETED/CANCELLED: UPDATE row `status = 'CANCELLED'`; on send failure: UPDATE `status = 'FAILED', failure_reason = {error}, retry_count++` (max 3 retries) — in `backend/src/main/java/io/opsnext/api/notification/scheduler/TaskEmailReminderJob.java`
- [ ] T035 [US5] In `TaskService.create()`, if `due_at IS NOT NULL`: insert rows into `task_email_reminders` for ONE_DAY (`scheduled_at = due_at - INTERVAL '1 day'`) and ONE_HOUR (`scheduled_at = due_at - INTERVAL '1 hour'`); skip any interval where `scheduled_at <= NOW()` (window already passed) — in `backend/src/main/java/io/opsnext/api/task/TaskService.java`
- [ ] T036 [US5] In `TaskService.update()`, if `dueDate` is changing: UPDATE all PENDING `task_email_reminders` rows for this task to `status = 'CANCELLED'`; then insert fresh reminder rows for the new `due_at` (same skip logic as T035) — in `backend/src/main/java/io/opsnext/api/task/TaskService.java`
- [ ] T037 [US5] In `TaskService.complete()` and `TaskService.delete()`: UPDATE all PENDING `task_email_reminders` rows for this task to `status = 'CANCELLED'` — in `backend/src/main/java/io/opsnext/api/task/TaskService.java`

**Checkpoint**: Task due 25 hrs from now → ONE_DAY email received in MailHog. Task marked complete before ONE_HOUR fires → ONE_HOUR row is CANCELLED.

---

## Phase 8: User Story 6 — Recurring Tasks (Priority: P3)

**Goal**: Sales Rep can create a recurring task (daily/weekly/monthly); completing any
instance automatically creates the next instance with the due date advanced by the interval.

**Independent Test**:
1. `POST /api/v1/tasks` with `isRecurring: true, recurrencePattern: "WEEKLY", dueDate: next Monday` → task created with `is_recurring = true`.
2. `POST /api/v1/tasks/{id}/complete` → response includes `data.nextRecurrence` with same fields, `dueAt = original + 7 days`.
3. Set `recurrenceEnabled = false` via PUT, then complete → `data.nextRecurrence = null`.

### Backend — Recurrence DTO & Completion Logic

- [ ] T038 [US6] Add `isRecurring` (boolean, default false) and `recurrencePattern` (String: DAILY/WEEKLY/MONTHLY) to `TaskRequest.Create`; add `recurrenceEnabled` (boolean) to `TaskRequest.Update` — in `backend/src/main/java/io/opsnext/api/task/dto/TaskRequest.java`
- [ ] T039 [US6] Extend `TaskService.complete()`: after setting COMPLETED, check `is_recurring AND recurrence_enabled`; if true: calculate `nextDueAt` (`due_at + 1 day | 7 days | 1 calendar month`); INSERT a new task row with same title, description, priority, assignee_id, entity_type, entity_id, is_recurring, recurrence_pattern, recurrence_enabled = true, `parent_task_id = completedTaskId`; schedule email reminders for the new instance (same logic as T035); return `{completedTask, nextRecurrence}` in the response — in `backend/src/main/java/io/opsnext/api/task/TaskService.java`

### Frontend — Recurrence UI

- [ ] T040 [P] [US6] Unhide recurrence controls in `CreateTaskModal`: add "Recurring" toggle; when enabled show pattern dropdown (Daily/Weekly/Monthly); wire to `isRecurring` and `recurrencePattern` fields in the create request — in `frontend/src/components/tasks/create-task-modal.tsx`
- [ ] T041 [US6] Show a recurring-chain icon/badge on `TaskCard` when `isRecurring = true`; display `recurrencePattern` as tooltip text — in `frontend/src/components/tasks/task-card.tsx`

**Checkpoint**: Create weekly recurring task, complete 2 instances, verify each spawns the next with correct due date. Disable recurrence on instance 2 and complete it; verify no third instance.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Performance index, validation against quickstart, and final audit checks.

- [ ] T042 [P] Add `tasks_due_notification_idx` partial index (`ON tasks (due_at) WHERE status IN ('OPEN','IN_PROGRESS') AND reminder_at IS NULL AND due_at IS NOT NULL`) to `backend/src/main/resources/db/tenant-schema-template.sql` for notification scheduler query performance
- [ ] T043 [P] Verify `SecurityPrincipal` role-check helper is consistent across `ActivityService` and `TaskService` — extract a shared `RoleChecker.isManagerOrAdmin(principal)` method or confirm inlined checks are identical
- [ ] T044 Run all six scenarios from [quickstart.md](quickstart.md) on localhost and confirm each passes; record any failures for follow-up before phase gate approval

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    └─► Phase 2 (Notification Backend)  ──────────────────────┐
    └─► Phase 3 (US1: Activity)         (can start after P1)  │
    └─► Phase 4 (US2: Tasks)            (needs P2 for US2 T17)│
              └─► Phase 5 (US3: Scheduler)  (needs P1 + P2)  ◄┘
              └─► Phase 6 (US4: Overdue)    (needs P2 + P4 frontend)
              └─► Phase 7 (US5: Email)      (needs P1 migration)
              └─► Phase 8 (US6: Recurring)  (needs P1 migration + P4 task complete)
Phase 9 (Polish): Depends on all desired stories being complete
```

### User Story Dependencies

| Story | Depends on | Notes |
|-------|-----------|-------|
| US1 (Log Activity) | Phase 1 | Fully independent after schema migration |
| US2 (Tasks) | Phase 1 + Phase 2 (for T017 NEW_ASSIGNMENT) | T015–T018 can start after P1; T019–T025 after P2 |
| US3 (Notifications) | Phase 2 + Phase 4 T028 (complete hook) | Scheduler runs independently; bell UI needs T029 |
| US4 (Manager View) | Phase 2 + Phase 4 T024 (tasks page scaffold) | Extends the overdue tab from P4 |
| US5 (Email Reminders) | Phase 1 T001 (task_email_reminders table) | Backend only; no additional frontend |
| US6 (Recurring Tasks) | Phase 1 T001 (recurrence columns) + Phase 4 T039 (complete hook) | Extends complete() added in P4 |

### Within Each User Story

- Backend service changes → Backend controller changes → Frontend hooks → Frontend components
- Audit log task (T010, T018) can be done alongside the service method it applies to

### Parallel Opportunities

```bash
# Phase 1 — all four tasks are independent:
T001 (migration), T002 (DTO), T003 (SchedulerConfig), T004 (api.ts) — run in parallel

# Phase 3 — backend and frontend are independent once P1 is done:
T007–T011 (backend ActivityService/Controller) in parallel with T012–T014 (frontend)

# Phase 4 — backend RBAC (T015–T018) and frontend hooks/components (T019–T020) in parallel:
T015–T018 (backend) with T019–T020 (hooks + card)

# Phase 5 — scheduler (T026–T028) and notification bell (T029–T030) in parallel:
T026–T028 (backend scheduler) with T029–T030 (frontend bell)
```

---

## Parallel Execution Examples

### Phase 3: US1 Parallelism

```text
Backend agent:
  T007 → T008 → T009 → T010 → T011 (sequential — all in ActivityService)

Frontend agent (starts after T004):
  T012 (use-activities.ts)        [P — parallel with T013]
  T013 (activity-feed.tsx)        [P — parallel with T012]
  T014 (log-activity-modal.tsx)   (after T012 complete)
```

### Phase 4: US2 Parallelism

```text
Backend agent (starts after T005–T006):
  T015 → T016 → T017 → T018 (sequential — all in TaskService)

Frontend agent:
  T019 (use-tasks.ts)             [P — parallel with T020]
  T020 (task-card.tsx)            [P — parallel with T019]
  T021 (create-task-modal.tsx)    (after T019)
  T022 → T023 → T024 → T025      (sequential — each builds on prior)
```

---

## Implementation Strategy

### MVP Scope (US1 + US2 Backend Only — Phases 1–4 backend tasks)

Minimum to demonstrate value to the Product Owner for the first phase gate:
1. Complete Phase 1 (setup + migration)
2. Complete Phase 2 (NotificationService + Controller)
3. Complete T007–T011 (Activity API completion)
4. Complete T015–T018 (Task RBAC + notifications)

**Phase gate test**: Use Swagger UI or curl to log an activity, create a task, complete it, and verify RBAC on non-owner update. All API scenarios in [quickstart.md](quickstart.md) Scenarios 1 and 2 must pass.

### Incremental Delivery

```
After Phase 1 + 2:   Core infrastructure ready
After Phase 3:       Log Activity fully functional (backend + frontend)
After Phase 4:       Task lifecycle complete (Timeline visible, /tasks page live)
After Phase 5:       In-app notifications firing automatically           ← Phase Gate
After Phase 6:       Manager overdue view + reassign
After Phase 7:       Email reminders sending                            ← Phase Gate
After Phase 8:       Recurring tasks (P3 enhancement)
After Phase 9:       Performance verified, quickstart validated          ← Final Gate
```

---

## Notes

- `[P]` = tasks in different files with no shared incomplete dependency; safe to run in parallel
- `[US?]` labels map exactly to user stories in [spec.md](spec.md)
- All `TenantJdbcTemplate` queries in schedulers (T026, T034) MUST set `TenantContext` per tenant before querying — failure to do so will result in cross-tenant leakage (Constitution Principle I)
- Do NOT start a new phase until the prior phase gate is explicitly approved by the Product Owner running the application on localhost (Constitution Principle III)
- Commit after each logical group (e.g., after T007–T011 backend is working; after T012–T014 frontend compiles)
- Avoid string-concatenated SQL — use parameterised statements in all `TenantJdbcTemplate` calls (Constitution Principle IV)
