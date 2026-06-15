# Quickstart & Validation Guide: Activity & Task Management

**Feature**: 006-activity-task-mgmt
**Date**: 2026-06-15

---

## Prerequisites

A running local OpsNext stack is required:

```bash
# 1. Start infrastructure (Postgres, Redis, Typesense, MinIO)
docker compose -f OpsNext/infra/docker/docker-compose.yml up -d

# 2. Start backend API (port 3001)
cd OpsNext/backend && ./gradlew bootRun --args="--spring.profiles.active=dev"

# 3. Start web frontend (port 3000)
cd OpsNext/frontend && pnpm dev
```

You need at least two tenant users:
- **Sales Rep A** (Sales Rep role) — `rep-a@example.com`
- **Sales Manager** (Sales Manager role) — `manager@example.com`
- An existing Contact record and an Opportunity (Deal) record to associate activities/tasks with.

---

## Phase Gate Checklist

Each section below maps to a user story. The Product Owner should verify each scenario on localhost before approving the phase gate (Constitution Principle III).

---

## Scenario 1: Log Activity (P1 — US1)

**Validates**: FR-ATM-001 through FR-ATM-007

### 1a — Log a Call against a Contact

1. Sign in as Sales Rep A.
2. Navigate to a Contact record (e.g., "Jane Smith").
3. Click "Log Activity" → select type **Call**.
4. Fill in: Subject = "Initial outreach", Date = today, Duration = 15 min, Outcome = "Positive".
5. Save.

**Expected**: The Call appears at the top of the Contact Timeline with the type icon, subject, duration, and "Sales Rep A" as author. The timestamp reflects today's date.

**API verification**:
```
GET /api/v1/activities?entityType=CONTACT&entityId={contact-id}
```
Response should include the logged Call in `data.items[0]`.

### 1b — Log a standalone Note (no CRM record)

1. Navigate to the global Activities log or use the "+" button in the nav.
2. Log a Note with Subject = "Meeting prep notes", Body = "Review Q2 numbers".
3. Do not select any CRM record association.
4. Save.

**Expected**: Note saves successfully. It does not appear in any CRM record Timeline but is visible in a standalone activities list.

**API verification**: `GET /api/v1/activities` (without entityType filter) should include the standalone Note.

### 1c — RBAC: Sales Rep cannot delete another rep's activity

1. As Sales Rep A, log a Call against a Contact.
2. Sign in as Sales Rep B.
3. Attempt `DELETE /api/v1/activities/{id}` for Sales Rep A's activity.

**Expected**: HTTP 403 with error code `FORBIDDEN`.

### 1d — Update an activity

1. As Sales Rep A, open a previously logged Call.
2. Edit the outcome field to "Follow-up email sent".
3. Save.

**Expected**: The Timeline shows the updated outcome. The `scheduledAt` (activity date) is unchanged.

---

## Scenario 2: Create and Manage Tasks (P1 — US2)

**Validates**: FR-ATM-007 through FR-ATM-013

### 2a — Create a task linked to a Deal

1. Sign in as Sales Rep A.
2. Navigate to Deal "Acme Corp Q3".
3. Click "Add Task".
4. Fill: Title = "Send proposal to Acme", Due date = 3 days from now, Priority = High, Assignee = Sales Rep A.
5. Save.

**Expected**: Task appears in the Deal Timeline alongside activities (visually distinct). Task also appears in Sales Rep A's global task list (`myTasks=true`).

**API verification**:
```
GET /api/v1/tasks?entityType=OPPORTUNITY&entityId={deal-id}
```

### 2b — Mark a task Complete

1. Open the task from step 2a.
2. Click "Mark Complete".

**Expected**: Status = COMPLETED, `completedAt` set. Task remains in Deal Timeline with "Completed" indicator. Task is absent from the Open Tasks view but retrievable with `status=COMPLETED` filter.

### 2c — RBAC: Sales Rep B cannot update Sales Rep A's task

1. As Sales Rep A, create a task (not assigned to Rep B, created by Rep A).
2. Sign in as Sales Rep B.
3. Attempt `PUT /api/v1/tasks/{id}` with any field change.

**Expected**: HTTP 403.

### 2d — Sales Manager can update any task

1. As Sales Manager, open any task.
2. Update priority to "Low".

**Expected**: Save succeeds. HTTP 200.

---

## Scenario 3: Task Due Notifications (P1 — US3)

**Validates**: FR-ATM-014 through FR-ATM-017

> Scheduler fires every 5 minutes. To test quickly, either:
> - Create a task with `dueAt = NOW() + 20 minutes` and wait for the next scheduler run
> - Or advance the DB clock in a test environment

### 3a — Notification appears for imminent task

1. Create a task assigned to Sales Rep A with `dueDate` 20 hours from now.
2. Wait ≤ 5 minutes for the `TaskDueNotificationJob` to run.
3. Sign in as Sales Rep A.
4. Click the notification bell in the topbar.

**Expected**: A notification: "Task due soon: Send proposal to Acme" with a link to the task.

**API verification**:
```
GET /api/v1/notifications?unread=true
```
Response should include a TASK_DUE notification with `data.taskId` matching the task.

### 3b — Notification is stale after completion

1. Mark the task from 3a as Completed.
2. Verify the notification in the bell is marked as stale or no longer actionable.

**Expected**: `GET /api/v1/notifications` — the notification has `readAt` set or is removed from unread count.

### 3c — Notification is cancelled when due date is pushed out

1. Create a task due in 22 hours.
2. Before the scheduler fires, update `dueDate` to 48 hours from now.
3. Verify no TASK_DUE notification is created for Sales Rep A.

**Expected**: `GET /api/v1/notifications?unread=true` — no TASK_DUE notification for the rescheduled task.

---

## Scenario 4: Manager Overdue Task View (P2 — US4)

**Validates**: FR-ATM-018 through FR-ATM-021

### 4a — Overdue tasks list

1. Create 3 tasks with due dates in the past and status OPEN, assigned to Sales Rep A (2 tasks, one HIGH, one LOW) and Sales Rep B (1 task, MEDIUM).
2. Sign in as Sales Manager.
3. Navigate to "Overdue Tasks".

**Expected**: All 3 tasks appear with: title, due date, "X days overdue", priority, assignee name.

**API verification**:
```
GET /api/v1/tasks?overdue=true
```

### 4b — Filter by assignee

1. In the Overdue Tasks view, filter by assignee = Sales Rep A.

**Expected**: Only Sales Rep A's 2 overdue tasks are shown.

### 4c — Reassign an overdue task

1. In the Overdue Tasks view, reassign one of Sales Rep A's tasks to Sales Rep B.
2. Check Sales Rep B's notifications.

**Expected**: Sales Rep B receives a NEW_ASSIGNMENT in-app notification. The task now shows Sales Rep B as assignee in the Overdue Tasks view.

---

## Scenario 5: Email Reminders (P2 — US5)

**Validates**: FR-ATM-022 through FR-ATM-025

> Email requires SMTP configured in environment (`MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`). Use MailHog or Mailtrap in local dev.

### 5a — 1-day email reminder is sent

1. Create a task due 25 hours from now, assignee = Sales Rep A.
2. Verify `task_email_reminders` has a row for this task with `interval_type = ONE_DAY` and `scheduled_at ≈ dueAt - 24h`.
3. Wait for the `TaskEmailReminderJob` to process the pending row.

**Expected**: An email is received at Sales Rep A's registered address with the task title, due date, and a link.

### 5b — No reminder for Completed task

1. Create a task due 25 hours from now.
2. Mark it Completed.
3. Check `task_email_reminders` — the ONE_DAY row should have status = CANCELLED.

**Expected**: No email is sent.

---

## Scenario 6: Recurring Tasks (P3 — US6)

**Validates**: FR-ATM-026 through FR-ATM-029

### 6a — Weekly recurring task auto-creates next instance

1. Create a task: Title = "Weekly pipeline review", recurrence = WEEKLY, due = next Monday.
2. Mark it Completed.
3. Query tasks.

**Expected**: A new task is created: same title, same assignee, priority, due date = original due date + 7 days. The completed task has `parentTaskId` set or the new task has `parentTaskId` pointing to the completed one.

**API verification**: `POST /api/v1/tasks/{id}/complete` response should include `data.nextRecurrence` populated.

### 6b — Disable recurrence stops the chain

1. Open the recurring task from 6a (the second instance).
2. Set `recurrenceEnabled = false` via `PUT /api/v1/tasks/{id}`.
3. Mark it Completed.

**Expected**: `POST /api/v1/tasks/{id}/complete` returns `data.nextRecurrence = null`. No third instance is created.

---

## API Error Cases

| Scenario | Request | Expected response |
|----------|---------|-------------------|
| Create activity without subject | `POST /api/v1/activities` body missing `subject` | HTTP 400, code `VALIDATION_FAILED` |
| Get task that doesn't exist | `GET /api/v1/tasks/nonexistent-id` | HTTP 404, code `TASK_NOT_FOUND` |
| Complete an already-completed task | `POST /api/v1/tasks/{id}/complete` (twice) | HTTP 409, code `TASK_ALREADY_COMPLETED` |
| Rep updates task they don't own | `PUT /api/v1/tasks/{id}` by non-owner rep | HTTP 403, code `FORBIDDEN` |
| Provide entityType without entityId | `POST /api/v1/activities` with only entityType | HTTP 400, code `VALIDATION_FAILED` |

---

## Performance Baselines

| Metric | Target | How to verify |
|--------|--------|---------------|
| Timeline load (200 items) | < 2 s | Browser network tab — `GET /api/v1/activities?entityId=...&limit=100` + `GET /api/v1/tasks?entityId=...` |
| Overdue task list (500 tasks) | < 2 s | `GET /api/v1/tasks?overdue=true&limit=100` — check API response time |
| Task due notification delivery | ≤ 5 min after threshold | Check `notifications` table row `created_at` vs. task `due_at - 24h` |
| Email reminder delivery | ≤ 10 min after interval | Check `task_email_reminders.sent_at` vs. `scheduled_at` |

---

## Audit Log Verification

After any create/update/delete operation on activities or tasks, verify the audit log:

```sql
-- Run in the tenant schema (SET search_path TO tenant_acme;)
SELECT entity_type, entity_id, action, user_id, created_at
FROM audit_logs
WHERE entity_type IN ('CONTACT', 'ACCOUNT', 'OPPORTUNITY')
ORDER BY created_at DESC LIMIT 10;
```

> Note: Activities and Tasks are currently logged under the entity_type of their associated CRM record. If logged standalone, use a separate audit strategy. Confirm with implementation that every FR-ATM-006 and FR-ATM-013 operation writes a row.
