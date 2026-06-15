# Feature Specification: Activity & Task Management

**Feature Branch**: `006-activity-task-mgmt`

**Created**: 2026-06-15

**Status**: Draft

**Input**: User description: "Activity & Task Management" — covers logging activities (Call,
Email, Meeting, Note) against CRM records, creating and managing tasks with due dates and
priorities, in-app task-due notifications, manager oversight of overdue tasks, configurable
email reminders, and recurring task scheduling within OpsNext CRM.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Log an Activity Against a CRM Record (Priority: P1)

A Sales Rep can log an activity (Call, Email, Meeting, or Note) against any Contact, Company,
or Deal within the tenant. Each activity captures the type, subject, date and time, duration
(for Calls and Meetings), outcome notes, and the logged-in user as author. All activities for a
record appear in its chronological Timeline, visible to any user with read access to that
record.

**Why this priority**: Activity logging is the day-to-day data entry that makes a CRM
valuable. Without a record of what happened — calls made, emails sent, meetings held, notes
written — the platform is just a contact database. The Timeline drives pipeline coaching,
rep hand-offs, and audit traceability, and is a dependency of the Contact Timeline defined
in the Contacts & Companies spec.

**Independent Test**: Sign in as Sales Rep. Open Contact "Jane Smith". Log a Call: subject
"Initial outreach", date today, duration 15 minutes, outcome "Positive — demo requested". Log
a Note: subject "Key pain points", notes "Budget approval needed from VP". Open Deal "Acme Corp
Q3". Log a Meeting: subject "Discovery call", date tomorrow, duration 60 minutes. Verify all
three activities appear in the respective record Timelines in reverse-chronological order with
correct metadata. No task or notification feature needed.

**Acceptance Scenarios**:

1. **Given** a Sales Rep is on a Contact record, **When** they log a Call with subject, date,
   duration, and outcome, **Then** the Call appears at the top of the Contact Timeline with the
   correct type icon, subject, timestamp, duration, and the rep's name as author.
2. **Given** a Sales Rep logs a Note against a Deal, **When** the Deal Timeline is viewed by
   another tenant user, **Then** the Note appears with the full note text and the authoring
   rep's name.
3. **Given** a Meeting activity is logged with a past date, **When** viewed in the Timeline,
   **Then** the Timeline positions it chronologically relative to other entries, not at the top.
4. **Given** a Sales Rep logs an activity against any tenant Contact (not their own), **When**
   saved, **Then** the activity is created — all tenant users with at least Sales Rep role may
   log activities against any record within the tenant.
5. **Given** a Read-Only user opens a Contact Timeline, **When** they view it, **Then** all
   activities are visible but the "Log Activity" action is absent or disabled.

---

### User Story 2 — Create and Manage Tasks (Priority: P1)

A Sales Rep can create a Task — a future-facing action item with a title, due date (optional),
priority (Low / Medium / High), assignee (any tenant user), status (Open / In Progress /
Completed), and an optional association to one Contact, Company, or Deal. Tasks appear in the
Timeline of any associated CRM record alongside activity entries. A Sales Rep can edit tasks
they own or created; a Sales Manager can edit any task in the tenant. Tasks are marked complete
from the task view or the Timeline, and completed tasks remain visible as historical records.

**Why this priority**: Tasks are the execution layer of CRM. Without structured follow-up
tracking, reps rely on memory and managers cannot monitor workload. Together with activity
logging, tasks represent the minimum viable daily workflow for a sales team.

**Independent Test**: As Sales Rep A, create a Task: title "Send proposal to Acme", due date
3 days from now, priority High, assignee Sales Rep A, associated with Deal "Acme Corp Q3".
Verify the task appears in the Deal Timeline. As Sales Manager, create a Task: title "Onboarding
call prep", due date tomorrow, priority Medium, assignee Sales Rep A, no CRM association. Verify
it appears in Sales Rep A's task list. As Sales Rep A, mark "Send proposal to Acme" Completed.
Verify status updates to Completed in both the task list and the Deal Timeline, with a
completion timestamp. No notification feature needed.

**Acceptance Scenarios**:

1. **Given** a Sales Rep creates a Task with title, priority, and assignee (due date optional),
   **When** saved, **Then** the task appears in the global task list under the assignee's name
   and in the Timeline of any associated CRM record.
2. **Given** a Task associated with a Deal, **When** the Deal Timeline is opened, **Then** the
   task appears with its title, due date, priority, assignee, and current status, visually
   distinct from Activity entries.
3. **Given** a Sales Rep marks a Task as Completed, **When** the status updates, **Then** the
   task remains visible in the Timeline with a "Completed" indicator and a completion timestamp;
   it is removed from the "Open Tasks" view but remains retrievable via filter.
4. **Given** a Task created by Sales Rep A, **When** Sales Rep B (not a Manager) attempts to
   update the task's priority, **Then** the update is denied with an appropriate message; Sales
   Rep B can view but not modify the task.
5. **Given** a Task assigned to a user who is then deactivated, **When** the task list is
   viewed, **Then** the task remains with the former assignee displayed as "(Deactivated)" and
   is surfaced in the Manager Overdue Tasks view for reassignment.

---

### User Story 3 — Task Due Notifications (Priority: P1)

The system automatically notifies the task assignee via an in-app notification when a task's
due date falls within the next 24 hours and the task is Open or In Progress. Notifications
appear in the in-app notification centre and link directly to the task. If a task is marked
Completed before the notification is acted upon, it is marked stale. If the due date is pushed
beyond 24 hours, any queued notification is cancelled.

**Why this priority**: Without proactive reminders, reps rely on memory to check due dates.
Missed follow-ups are a top CRM adoption failure mode. The 24-hour in-app notification is the
minimum viable reminder that keeps tasks visible without being disruptive.

**Independent Test**: Create a Task due 23 hours from now, assignee Sales Rep A, status Open.
Advance time past the 24-hour check (or simulate via test tooling). Sign in as Sales Rep A —
verify an in-app notification appears: "Task due soon: [Task Title]" linking to the task. Update
the due date to 36 hours from now — verify no active notification is queued. Reset to 20 hours
— verify a new notification appears. Mark the task Completed — verify the notification is marked
stale. No email reminder feature needed.

**Acceptance Scenarios**:

1. **Given** a Task with a due date 20 hours from now and status Open, **When** the 24-hour
   threshold check runs, **Then** the assignee receives an in-app notification: "Task due soon:
   [Task Title]" with a direct link to the task.
2. **Given** a Task with a pending due-soon notification, **When** the task is marked Completed
   before the notification is read, **Then** the notification is marked stale (visually inactive)
   and does not prompt further action.
3. **Given** a Task due in 20 hours, **When** the due date is updated to 36 hours from now,
   **Then** the queued notification is cancelled; a new notification is queued when the
   rescheduled due date re-enters the 24-hour window.
4. **Given** a Task with status In Progress and a due date 18 hours away, **When** the
   24-hour threshold check runs, **Then** the assignee receives a due-soon notification —
   In Progress status is included in the notification trigger.
5. **Given** a Sales Manager reassigns an overdue task (past due date) to Sales Rep B, **When**
   the reassignment is saved, **Then** Sales Rep B immediately receives an in-app notification
   of the assignment since the task is already past its due date.

---

### User Story 4 — Manager Overdue Task View (Priority: P2)

A Sales Manager can view a consolidated list of all Open and In Progress tasks within the tenant
whose due date has passed. The view supports filtering by assignee, priority, and linked CRM
record type. The manager can reassign any overdue task to a different team member directly from
this view, and the new assignee receives an in-app notification.

**Why this priority**: Overdue tasks represent dropped follow-ups, stalled proposals, and
missed onboarding steps. Without manager visibility, these remain invisible until a deal is
lost. Early visibility enables course correction via reassignment or escalation.

**Independent Test**: Create 5 tasks across 3 Sales Reps with past due dates and Open status.
Sign in as Sales Manager. Open the "Overdue Tasks" view — verify all 5 appear with title, due
date, days overdue, priority, assignee, and linked record. Filter by assignee "Sales Rep A" —
verify only their tasks appear. Filter by priority "High" — verify only High tasks appear.
Reassign one overdue task from Sales Rep A to Sales Rep B — verify the assignee updates and
Sales Rep B receives an in-app notification.

**Acceptance Scenarios**:

1. **Given** a Sales Manager opens the Overdue Tasks view, **When** tasks with past due dates
   and Open/In Progress status exist, **Then** all such tasks in the tenant are listed with:
   title, original due date, days overdue, priority, current assignee, and linked CRM record.
2. **Given** the Overdue Tasks view, **When** filtered by assignee "Sales Rep A", **Then** only
   Sales Rep A's overdue tasks are displayed.
3. **Given** the Overdue Tasks view, **When** filtered by priority "High" and assignee "Sales
   Rep A" simultaneously, **Then** only Sales Rep A's High-priority overdue tasks are displayed
   (filters are combinable).
4. **Given** an overdue task in the manager view, **When** the manager reassigns it to Sales
   Rep B, **Then** the assignee updates immediately, the task moves under Sales Rep B in the
   view, and Sales Rep B receives an in-app reassignment notification.
5. **Given** a task was overdue but has just been marked Completed, **When** the Overdue Tasks
   view is refreshed, **Then** the completed task no longer appears in the list.

---

### User Story 5 — Email Reminders for Tasks (Priority: P2)

The system sends email reminders to the task assignee at configurable intervals before the due
date: 1 day before and 1 hour before are enabled by default. Tenant Admin can enable or disable
each interval via tenant notification settings. Reminders are sent only for Open or In Progress
tasks; Completed tasks do not trigger further reminders.

**Why this priority**: In-app notifications only work when the user is actively in the platform.
Email reminders reach the assignee even when working outside the CRM, significantly improving
task completion rates. This requires the outbound email service (FR-NOT-003) to be configured.

**Independent Test**: Enable both reminder intervals in tenant settings. Create a Task due
25 hours from now assigned to Sales Rep A. Verify an email is sent at the 24-hour mark. Mark
the task Completed before the 1-hour mark — verify no 1-hour email is sent. Create a new Task
due in 50 minutes — verify no 1-day email is sent (window already passed) but a 1-hour email
is sent. Disable the "1 hour before" interval — verify a subsequent task only receives the
1-day email.

**Acceptance Scenarios**:

1. **Given** a Task due in 25 hours with Open status, **When** the 24-hour mark is reached,
   **Then** an email is sent to the assignee's registered address with: task title, due date,
   priority, and a link to the task.
2. **Given** a Task that received the 1-day email and is then marked Completed, **When** the
   1-hour mark would be reached, **Then** no further email reminder is sent.
3. **Given** a Tenant Admin disables the "1 hour before" interval, **When** any task due date
   approaches, **Then** only the 1-day-before email is sent; no 1-hour email is triggered for
   any task in the tenant.
4. **Given** an email reminder delivery fails (invalid address, SMTP error), **When** the
   failure occurs, **Then** it is logged with: task id, interval type, error reason, and retry
   count; the task's status is not affected and no error is surfaced to other users.

---

### User Story 6 — Recurring Tasks (Priority: P3)

A Sales Rep can configure a task as recurring with a frequency of Daily, Weekly, or Monthly.
When a recurring task instance is marked Completed, the system automatically creates the next
instance with the same title, description, priority, assignee, and CRM associations, advancing
the due date by the recurrence interval. Recurrence can be disabled on any instance to stop
the chain.

**Why this priority**: Many sales workflows are periodic — weekly pipeline reviews, monthly
check-in calls. Manually recreating identical tasks each cycle adds administrative overhead and
risks missed cycles. Recurring tasks are P3 because the base task management (P1/P2) must be
stable first, and they are not required for the MVP.

**Independent Test**: Create a recurring weekly Task: title "Weekly pipeline review", due
Monday next week, priority Medium, assignee Sales Rep A, no CRM association. Mark the first
instance Completed. Verify a new instance is auto-created: same title, same priority, same
assignee, due date 7 days later. Disable recurrence on the new instance. Mark it Completed.
Verify no further instances are created.

**Acceptance Scenarios**:

1. **Given** a recurring weekly Task is marked Completed, **When** the completion is saved,
   **Then** a new Task instance is created: same title, assignee, priority, CRM association;
   due date is set to 7 days after the completed instance's due date.
2. **Given** a recurring monthly Task is marked Completed, **When** the completion is saved,
   **Then** the next instance is due exactly one calendar month after the completed instance's
   due date.
3. **Given** a recurring Task with recurrence disabled on the current instance, **When** that
   instance is marked Completed, **Then** no new instance is generated.
4. **Given** a recurring Task whose current instance is overdue and still Open, **When** the
   due date passes, **Then** no new instance is created until the current instance is Completed
   — instances do not stack.

---

### Edge Cases

- What if a CRM record associated with an Activity or Task is soft-deleted? → The Activity/Task
  retains the association; the linked record is displayed as "Archived" with a restore option.
  The Activity/Task itself remains active and unaffected.
- What if the task assignee is removed from the tenant? → The task remains, with the deactivated
  user shown as "(Deactivated)". No auto-reassignment occurs; a Sales Manager is responsible for
  reassigning via the Overdue Tasks or task detail view.
- What if two managers simultaneously reassign the same task to different users? → Last write
  wins for the assignee field; both reassignment actions are captured in the tenant audit log so
  neither is silently lost.
- What if a task has no due date? → Tasks with no due date are valid. They never trigger in-app
  notifications, email reminders, or appear in the Overdue Tasks view. Due date is an optional
  field on Task.
- What if both the 1-day and 1-hour email reminders would fire at the same time (task created
  with 45 minutes remaining)? → Only reminder intervals whose scheduled window has not yet
  passed at task creation are queued. If the 24-hour window has already passed, only the 1-hour
  reminder is sent; the 1-day reminder is skipped.
- What if a recurring task's next occurrence falls on a weekend? → Due dates advance strictly
  by the interval (7 days, 30 days, 1 day) without calendar-day adjustments. Weekend-aware
  scheduling is deferred to a future enhancement.

---

## Requirements *(mandatory)*

### Functional Requirements

**Activity Logging (P1 — User Story 1)**

- **FR-ATM-001**: Sales Rep MUST be able to log an Activity of type Call, Email, Meeting, or
  Note against a Contact, Company, or Deal record, or with no CRM association (standalone).
- **FR-ATM-002**: Each Activity MUST capture: type (Call/Email/Meeting/Note), subject
  (required), description/notes (optional), activity date and time (required), and the
  logged-in user as author (system-set, not user-editable).
- **FR-ATM-003**: Call and Meeting Activities MUST additionally support duration in minutes
  (optional field).
- **FR-ATM-004**: All Activities associated with a CRM record MUST appear in that record's
  Timeline in reverse-chronological order by activity date.
- **FR-ATM-005**: Sales Rep MUST be able to edit or delete Activities they authored; Sales
  Manager MUST be able to edit or delete any Activity within the tenant. Read-Only users MUST
  NOT create, edit, or delete Activities.
- **FR-ATM-006**: All Activity create, update, and delete operations MUST be recorded in the
  tenant audit log with: tenantId, userId, operation, activityId, and timestamp.

**Task Management (P1 — User Story 2)**

- **FR-ATM-007**: Sales Rep MUST be able to create a Task with: title (required), due date
  (optional), priority — Low/Medium/High (required), assignee — a tenant user (required),
  status — Open/In Progress/Completed (default: Open), and an optional association to one
  Contact, Company, or Deal.
- **FR-ATM-008**: The system MUST prevent assigning a Task to a user outside the current
  tenant.
- **FR-ATM-009**: Sales Rep MUST be able to update a Task they own or created; Sales Manager
  MUST be able to update any Task within the tenant. Read-Only users MUST NOT create, update,
  or delete Tasks.
- **FR-ATM-010**: Sales Rep MUST be able to mark a Task as Completed; the system MUST record
  the completion timestamp. Completed Tasks MUST remain visible in the Timeline and retrievable
  via a "Show completed" filter.
- **FR-ATM-011**: Tasks associated with a CRM record MUST appear in that record's Timeline
  alongside Activity entries with clear visual distinction between the two entry types.
- **FR-ATM-012**: The system MUST provide a global Task list view for each user showing all
  Tasks assigned to them, sortable by due date, priority, and status.
- **FR-ATM-013**: All Task create, update, delete, and status-change operations MUST be
  recorded in the tenant audit log with: tenantId, userId, operation, taskId, and timestamp.

**Task Due Notifications (P1 — User Story 3)**

- **FR-ATM-014**: The system MUST deliver an in-app notification to a Task assignee when the
  task due date is within 24 hours and the task status is Open or In Progress.
- **FR-ATM-015**: In-app due-soon notifications MUST include: the task title, the due date and
  time, and a deep link to the task record.
- **FR-ATM-016**: If a Task is marked Completed while a due-soon notification is pending, the
  notification MUST be marked stale (visually inactive) and MUST NOT prompt further action.
- **FR-ATM-017**: If a Task's due date is updated to more than 24 hours in the future, any
  queued due-soon notification MUST be cancelled; a new notification MUST be queued when the
  new due date enters the 24-hour window.

**Manager Overdue Task View (P2 — User Story 4)**

- **FR-ATM-018**: Sales Manager MUST be able to view all Open and In Progress Tasks within the
  tenant whose due date is in the past ("Overdue Tasks" view).
- **FR-ATM-019**: The Overdue Tasks view MUST support filtering by: assignee, priority, and
  linked record type (Contact / Company / Deal / None); filters MUST be combinable.
- **FR-ATM-020**: The Overdue Tasks view MUST display per task: title, original due date, days
  overdue, priority, current assignee, and linked CRM record name and type (if any).
- **FR-ATM-021**: Sales Manager MUST be able to reassign any Task in the Overdue Tasks view to
  a different tenant user; the new assignee MUST receive an in-app notification of the
  assignment.

**Email Reminders (P2 — User Story 5)**

- **FR-ATM-022**: The system MUST send email reminders to a Task assignee at configurable
  intervals before the due date; default active intervals: 1 day before and 1 hour before.
- **FR-ATM-023**: Tenant Admin MUST be able to enable or disable each default reminder interval
  (1 day before, 1 hour before) via tenant notification settings.
- **FR-ATM-024**: Email reminders MUST only be sent for Tasks with Open or In Progress status;
  Completed Tasks MUST NOT trigger email reminders.
- **FR-ATM-025**: Email reminder delivery failures MUST be logged per task with: task id,
  interval type, scheduled time, error reason, and retry count. Failures MUST NOT affect task
  status or surface errors to users other than the Tenant Admin in notification settings.

**Recurring Tasks (P3 — User Story 6)**

- **FR-ATM-026**: Sales Rep SHOULD be able to configure a Task as recurring with a frequency
  of Daily, Weekly, or Monthly.
- **FR-ATM-027**: When a recurring Task instance is marked Completed, the system MUST
  automatically create the next instance with: the same title, description, priority, assignee,
  CRM association, and recurrence settings; the due date MUST be advanced by one recurrence
  interval from the completed instance's due date.
- **FR-ATM-028**: The next recurring instance MUST NOT be created if recurrence is disabled on
  the instance being completed.
- **FR-ATM-029**: No more than one pending (Open or In Progress) instance of a recurring task
  chain MUST exist at any time; the next instance is created only when the current instance is
  marked Completed.

### Key Entities

- **Activity**: A logged interaction against a CRM record or standalone. Attributes: id,
  tenantId, type (CALL/EMAIL/MEETING/NOTE), subject, description, activityDate, durationMinutes
  (nullable), authorUserId, linkedRecordType (CONTACT/COMPANY/DEAL/NONE), linkedRecordId
  (nullable), createdAt, updatedAt.
- **Task**: A future-facing action item with lifecycle tracking. Attributes: id, tenantId,
  title, description, dueDate (nullable), priority (LOW/MEDIUM/HIGH), status
  (OPEN/IN_PROGRESS/COMPLETED), assigneeUserId, completedAt (nullable), linkedRecordType
  (CONTACT/COMPANY/DEAL/NONE), linkedRecordId (nullable), isRecurring (boolean),
  recurrencePattern (DAILY/WEEKLY/MONTHLY, nullable), recurrenceEnabled (boolean),
  parentTaskId (nullable, links recurring chain), createdByUserId, createdAt, updatedAt.
- **TaskNotification**: In-app notification record for task-due and reassignment alerts.
  Attributes: id, tenantId, taskId, recipientUserId, notificationType (DUE_SOON/REASSIGNED),
  status (PENDING/DELIVERED/STALE), scheduledAt, deliveredAt.
- **EmailReminder**: Scheduled email reminder for a task. Attributes: id, tenantId, taskId,
  recipientUserId, intervalType (ONE_DAY/ONE_HOUR), scheduledAt, sentAt, status
  (PENDING/SENT/FAILED/CANCELLED), failureReason, retryCount.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A Sales Rep can log a Call activity against a Contact record, including all
  required fields, in under 30 seconds.
- **SC-002**: A Sales Rep can create a fully configured Task (title, due date, priority,
  assignee, CRM association) in under 45 seconds.
- **SC-003**: In-app due-soon notifications are delivered to the assignee's notification centre
  within 5 minutes of the 24-hour threshold being crossed.
- **SC-004**: A CRM record Timeline displaying up to 200 combined activities and tasks loads
  in under 2 seconds.
- **SC-005**: Sales Manager can view and filter the Overdue Tasks list across a team of 20
  users with 500 overdue tasks in under 2 seconds.
- **SC-006**: Email reminders are delivered to task assignees within 10 minutes of the
  configured reminder interval being reached.
- **SC-007**: 100% of Activity and Task create/update/delete/status-change operations are
  captured in the tenant audit log; no operation is silently missed under concurrent usage.

---

## Assumptions

- The CRM record Timeline (Contact, Company, Deal) displays both Activities and Tasks in
  reverse-chronological order by activity date (for Activities) or due date (for dated Tasks).
  Tasks with no due date appear ordered by creation date.
- In-app notifications for task due dates are evaluated by a background scheduler on an interval
  of at most 5 minutes. Real-time WebSocket push is a future enhancement.
- Email reminders depend on the outbound email integration (SMTP/SendGrid) defined in
  FR-NOT-003; if no email service is configured for the tenant, email reminders are silently
  skipped and logged.
- Due date is optional on Tasks. Tasks with no due date are valid action items but never
  generate notifications, email reminders, or appear in the Overdue Tasks view.
- Editing an Activity changes its stored content but preserves the original `activityDate`
  as the Timeline anchor; the timeline position of an edited activity does not change.
- The Activity/Task Timeline for a CRM record is the same Timeline surface described in
  FR-CON-009 (Contacts & Companies spec). This feature populates it; the Contacts spec governs
  overall Timeline presentation.
- An Activity or Task may be associated with at most one CRM record at a time. Multi-record
  associations are out of scope for Phase 1.
- All dates and times are stored in UTC and displayed in the tenant's configured timezone.
- Recurring task chain integrity is maintained server-side. Concurrent completion requests for
  the same task are guarded by idempotency to prevent duplicate instance creation.
- A Sales Rep may create a Task with themselves or any other tenant user as the assignee.
  Self-assignment is valid and common (personal task tracking).
