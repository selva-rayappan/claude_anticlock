# Feature Specification: Deal & Pipeline Management

**Feature Branch**: `005-deal-pipeline`

**Created**: 2026-06-15

**Status**: Draft

**Input**: User description: "Deal & Pipeline Management" — covers pipeline configuration,
deal lifecycle (creation through close), a visual Kanban board with stage transitions and
history, weighted pipeline value, revenue targets, and deal custom fields within OpsNext CRM.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Pipeline Setup (Priority: P1)

A Tenant Admin can create one or more named sales pipelines, each with an ordered list of
stages. Stages can be added, renamed, reordered, or deleted (subject to deal-count guards).
Each stage may carry a default win probability that pre-fills new deals placed in that stage.
At least one pipeline must exist before any deals can be created.

**Why this priority**: Pipelines are the structural container for all deals. Without at least
one configured pipeline and stage set, no deal record can be created. All other user stories
in this feature depend on pipeline setup being complete.

**Independent Test**: Sign in as Tenant Admin. Create a pipeline named "Enterprise Sales"
with five stages: Prospecting (10%), Qualification (30%), Proposal (60%), Negotiation (80%),
Closed Won (100%). Reorder stages so Negotiation appears before Proposal. Verify the new
order is reflected when a deal is created. Attempt to delete the Qualification stage while it
has deals — verify the deletion is blocked with a deal count shown. No other feature needed.

**Acceptance Scenarios**:

1. **Given** a Tenant Admin, **When** they create a pipeline "Enterprise Sales" with five
   ordered stages, **Then** the pipeline is available for deal creation and stages appear in
   the defined order on the Kanban board.
2. **Given** an existing pipeline, **When** the admin reorders two stages, **Then** the new
   order is immediately reflected on the Kanban board and all existing deals remain in their
   current (renamed) stage.
3. **Given** a pipeline stage that contains 12 active deals, **When** the admin attempts to
   delete that stage, **Then** the deletion is blocked with the message "12 deals are in this
   stage — reassign them before deleting."
4. **Given** a stage with a default probability of 60%, **When** a new deal is placed in that
   stage, **Then** the deal's probability field is pre-filled with 60%.

---

### User Story 2 — Deal Creation & Management (Priority: P1)

A Sales Rep can create a Deal record and associate it with a Contact and/or Company. The deal
captures the name, monetary value, expected close date, owner, probability, and current
pipeline stage. Deals can be updated, marked as Won or Lost (with optional reason), and
archived. A complete stage transition history is recorded for every deal.

**Why this priority**: Creating and tracking individual deals is the core commercial function
of a CRM. Without deal records, pipeline analytics, revenue tracking, and sales reporting have
no data to work with.

**Independent Test**: Create a deal "Acme Corp — Q3 Licence" worth £25,000, close date
30 September, in the Qualification stage, assigned to Sales Rep A. Update the value to
£30,000. Mark the deal Won. Verify it disappears from the active Kanban board and appears
in the Won Deals list. Verify the stage history shows: Qualification → Won with timestamp
and actor. Separately, create a deal with no contact or company — verify it saves successfully.

**Acceptance Scenarios**:

1. **Given** a Sales Rep, **When** they create a deal with name, value, close date, stage,
   owner, and probability, **Then** the deal appears on the Kanban board in the correct stage.
2. **Given** an open deal owned by a Sales Rep, **When** the rep updates the deal value,
   **Then** the new value is saved and the weighted pipeline value for that stage updates
   immediately.
3. **Given** an open deal, **When** the rep marks it as Won, **Then** the deal status changes
   to Won, it is removed from the active Kanban board, and it appears in the Won Deals view
   for that pipeline.
4. **Given** an open deal, **When** the rep marks it as Lost with reason "Budget cut",
   **Then** the deal status changes to Lost with the reason recorded, and it appears in the
   Lost Deals view.
5. **Given** a deal created with no Contact and no Company association, **When** saved,
   **Then** the deal is created successfully; contact and company are not mandatory fields.

---

### User Story 3 — Kanban Board & Stage Transitions (Priority: P1)

A Sales Rep can view all active deals on a visual Kanban board, organised by pipeline stage.
Deals are moved between stages by dragging and dropping a card or by selecting a new stage
from the deal detail page. Every stage transition is recorded in the deal's immutable stage
history (from-stage, to-stage, timestamp, actor). Sales Managers see all team deals on the
same board and can filter by owner, close date range, or deal value range.

**Why this priority**: The Kanban board is the primary day-to-day working interface for Sales
Reps. Pipeline visualisation and the ability to progress deals through stages is the core UX
that drives CRM adoption. Stage history enables pipeline coaching and audit.

**Independent Test**: Open the Kanban board for "Enterprise Sales" pipeline. Drag a deal from
Prospecting to Qualification. Verify the card moves, the stage history on the deal detail page
shows the transition with the correct actor and timestamp, and the pipeline stage counts update.
Sign in as Sales Manager, view the board, filter by owner "Sales Rep A" — verify only that
rep's deals appear. Switch to list view and sort by close date — verify correct ordering. No
reporting feature needed.

**Acceptance Scenarios**:

1. **Given** a Sales Rep on the Kanban board, **When** they drag a deal card from
   "Prospecting" to "Qualification", **Then** the deal moves to the new column and the
   stage history records the transition with the rep's name and the current timestamp.
2. **Given** a deal detail page, **When** a user selects a new stage from the stage dropdown,
   **Then** the deal is moved to that stage and a history entry is created; this works as a
   fallback to drag-and-drop.
3. **Given** a Sales Manager on the Kanban board, **When** they filter by owner "Sales Rep A",
   **Then** only deals assigned to that rep are displayed across all stages.
4. **Given** the Kanban board, **When** a user switches to List View, **Then** all active
   deals are shown in a sortable table with columns: name, value, stage, owner, close date,
   probability.
5. **Given** a deal that has been moved across 3 stages, **When** the stage history is
   viewed, **Then** all 3 transitions appear in chronological order with actor names,
   from-stage, to-stage, and timestamps.

---

### User Story 4 — Weighted Pipeline Value & Revenue Targets (Priority: P2)

The system automatically calculates the weighted pipeline value (deal value × probability) and
displays it aggregated per stage and for the full pipeline. A Sales Manager can set a monthly
or quarterly revenue target for a pipeline and track progress (Won deal value to date vs.
target) on their dashboard.

**Why this priority**: Raw deal value overstates revenue likelihood. Weighted value gives
managers a realistic revenue forecast. Revenue targets enable quota management without
requiring a separate analytics tool, directly driving sales coaching decisions.

**Independent Test**: Set a Q3 revenue target of £500,000 on the Enterprise Sales pipeline.
Place three deals: £20,000 at 60%, £50,000 at 40%, £100,000 at 80%. Verify pipeline summary
shows weighted values: £12,000, £20,000, £80,000 and total £112,000. Mark the £100,000 deal
Won. Verify the Q3 progress shows £100,000 of £500,000 (20%). No reporting feature needed.

**Acceptance Scenarios**:

1. **Given** a deal worth £10,000 with probability 60% in the Proposal stage, **When** viewed
   on the pipeline summary, **Then** the weighted value shown for that deal is £6,000.
2. **Given** a pipeline with multiple deals across stages, **When** the pipeline summary is
   viewed, **Then** the total weighted value equals the sum of (value × probability) for all
   open deals.
3. **Given** a Sales Manager sets a Q3 revenue target of £500,000 for a pipeline, **When**
   the current quarter has £150,000 in Won deals, **Then** the dashboard shows "£150,000 of
   £500,000 (30%)" with a progress indicator.
4. **Given** a deal's probability is updated from 60% to 80%, **When** saved, **Then** the
   weighted pipeline value updates in the pipeline summary within 3 seconds without a page
   refresh.

---

### User Story 5 — Deal Custom Fields & Deal Clone (Priority: P2 / P3)

A Tenant Admin can define custom fields for deal records (text, number, date, dropdown,
multi-select, boolean). Custom fields appear on all deal creation and edit forms. A Sales Rep
can clone an existing deal as a new deal, with all fields copied except the close date
(cleared) and owner (reset to the cloning user).

**Why this priority**: Custom fields (P2) allow organisations to capture industry-specific
deal data without platform workarounds. Deal clone (P3) reduces data entry time for recurring
deal patterns (e.g., annual renewals).

**Independent Test (Custom Fields)**: As Tenant Admin, define a "Lead Source" dropdown
custom field (options: Inbound, Outbound, Referral, Event). Create a new deal and verify
the Lead Source dropdown appears and a selection is saved with the deal.

**Independent Test (Clone)**: Clone a deal named "Acme Annual Renewal" with Lead Source =
Referral. Verify a new deal is created with the same name (prefixed "Copy of"), same value,
same Lead Source = Referral, close date blank, and owner set to the cloning user.

**Acceptance Scenarios**:

1. **Given** a Tenant Admin defines a "Lead Source" dropdown custom field, **When** a Sales
   Rep creates or edits a deal, **Then** the Lead Source field appears with the defined
   options and a selection is required if the field is marked mandatory.
2. **Given** a custom field is deleted by the Tenant Admin, **When** an existing deal with
   a value for that field is viewed, **Then** the deleted field is hidden but the deal
   record is otherwise unaffected.
3. **Given** a Sales Rep clones a deal, **When** the clone is created, **Then**: the name
   is prefixed with "Copy of", the close date is blank, the owner is set to the cloning user,
   all other fields (including custom field values) are copied from the original.
4. **Given** a deal clone where the original had a Contact association, **When** cloned,
   **Then** the new deal retains the same Contact association.

---

### Edge Cases

- What if a deal's associated Contact or Company is soft-deleted? → The deal retains the
  association; the contact/company is displayed as "Archived" with a link to restore it.
  The deal remains active.
- What if two users drag the same deal card to different stages simultaneously? → Last write
  wins; both transitions are recorded in the stage history so neither is silently lost.
- What if a pipeline is deactivated (not deleted)? → Existing deals remain in their current
  stages but no new deals can be assigned to that pipeline. The board shows an "Inactive
  pipeline" banner and the pipeline is excluded from new deal stage selection.
- What if a deal probability is manually set to 0%? → Weighted value = £0; the deal still
  appears on the board and counts in the pipeline.
- What if a revenue target has no Won deals in the current period yet? → Progress = £0 /
  target amount (0%); target and progress bar are displayed.
- What if a deal is moved to a "Closed Won" stage type without using the Won action? → The
  system auto-updates deal status to Won; the stage history records the transition. Users
  cannot be in a Closed Won stage without the deal being marked Won.
- What if a deal is moved between pipelines? → Cross-pipeline deal movement is out of scope
  for Phase 1; deals must be archived and a new deal created in the target pipeline.

---

## Requirements *(mandatory)*

### Functional Requirements

**Pipeline Configuration (P1 — User Story 1)**
- **FR-DPM-001**: Tenant Admin MUST be able to create one or more named Pipelines; each
  pipeline MUST support a configurable, ordered list of named stages.
- **FR-DPM-002**: Tenant Admin MUST be able to add, rename, and reorder stages on any
  pipeline; existing deals MUST remain in their current stage after reordering.
- **FR-DPM-003**: Tenant Admin MUST be able to delete a pipeline stage only if it contains
  zero active deals; if deals exist, the system MUST display the count and block deletion.
- **FR-DPM-004**: Each pipeline stage MAY carry a default probability (0–100%) that
  pre-fills the deal Probability field when a deal is placed in that stage.
- **FR-DPM-005**: Two stage types MUST be designatable per pipeline: Closed Won and Closed
  Lost; moving a deal to either type MUST automatically update the deal status accordingly.

**Deal Lifecycle (P1 — User Story 2)**
- **FR-DPM-006**: Sales Rep MUST be able to create a Deal with: name (required), value
  (amount, required), close date (required), pipeline stage (required), owner (required),
  probability 0–100% (required), and optional associations to a Contact and/or Company.
- **FR-DPM-007**: Sales Rep MUST be able to update any field on a deal they own; Sales
  Manager MUST be able to update any deal within the tenant.
- **FR-DPM-008**: Sales Rep MUST be able to mark a deal as Won or Lost; a Lost deal MUST
  accept an optional loss reason (free text).
- **FR-DPM-009**: The system MUST record an immutable stage transition history for every
  deal: from-stage, to-stage, timestamp, and the identity of the user who made the change.
- **FR-DPM-010**: Deals MUST NOT be permanently deleted by Sales Reps or Managers; only
  Tenant Admin MAY permanently delete an archived deal.

**Kanban Board & Stage Transitions (P1 — User Story 3)**
- **FR-DPM-011**: The system MUST provide a Kanban board view showing active deals (status
  OPEN) grouped by stage; each deal card MUST display: name, value, owner avatar, and close
  date.
- **FR-DPM-012**: Sales Rep MUST be able to move a deal to any stage in its pipeline via
  drag-and-drop on the Kanban board; a stage dropdown on the deal detail page MUST serve as
  an accessible alternative.
- **FR-DPM-013**: Sales Manager MUST be able to view all team deals on the Kanban board;
  the board MUST support filtering by owner, close date range, and deal value range.
- **FR-DPM-014**: The system MUST provide a sortable List View of deals as an alternative
  to the Kanban board; columns MUST include name, value, stage, owner, close date,
  probability; all columns MUST be sortable.

**Weighted Value & Revenue Targets (P2 — User Story 4)**
- **FR-DPM-015**: The system MUST calculate and display the weighted pipeline value
  (deal value × probability) per stage and as a total for the entire pipeline on the
  pipeline board.
- **FR-DPM-016**: Weighted value MUST update in the pipeline summary within 3 seconds of
  a deal's value or probability being changed, without a full page reload.
- **FR-DPM-017**: Sales Manager MUST be able to set a monthly or quarterly revenue target
  for a pipeline; the system MUST display current-period Won deal value versus the target
  with a percentage progress indicator.

**Custom Fields & Clone (P2/P3 — User Story 5)**
- **FR-DPM-018**: Tenant Admin MUST be able to define custom fields for Deal records; field
  types supported: text, number, date, dropdown (single select), multi-select, boolean.
- **FR-DPM-019**: Custom deal fields MUST appear on deal creation, edit, and detail views
  for all users within the tenant.
- **FR-DPM-020**: Deleting a custom field definition MUST hide the field from all deal
  forms; existing values MUST be preserved and restored if the field is re-added with the
  same name.
- **FR-DPM-021**: Sales Rep SHOULD be able to clone an existing deal as a new deal; all
  fields MUST be copied except close date (cleared) and owner (set to the cloning user);
  the name MUST be prefixed with "Copy of".

### Key Entities

- **Pipeline**: Named container for an ordered set of stages. Attributes: id, tenantId,
  name, description, isDefault, isActive.
- **PipelineStage**: An ordered stage within a pipeline. Attributes: id, pipelineId,
  tenantId, name, displayOrder, defaultProbability (0–100%), stageType (OPEN / CLOSED_WON /
  CLOSED_LOST).
- **Deal**: Core sales opportunity record. Attributes: id, tenantId, pipelineId, stageId,
  name, value, currency, closeDate, ownerId, probability (0–100%), status (OPEN / WON /
  LOST), contactId (optional), companyId (optional), lossReason (optional), archivedAt.
- **DealStageHistory**: Immutable transition record. Attributes: id, dealId, tenantId,
  fromStageId (nullable for creation), toStageId, changedAt, changedByUserId.
- **RevenueTarget**: Period-based quota set by a Sales Manager. Attributes: id, tenantId,
  pipelineId, periodType (MONTHLY / QUARTERLY), targetValue, currency, startDate.
- **DealCustomFieldDefinition**: Admin-defined field schema for deals. Attributes: id,
  tenantId, name, fieldType, options (JSON array for dropdown/multi-select), isRequired,
  displayOrder, isActive.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tenant Admin can create a pipeline with 5 stages and assign a first deal
  to it in under 3 minutes from a fresh tenant setup.
- **SC-002**: Sales Rep can move a deal through 3 consecutive stages within 30 seconds;
  the stage history reflects all 3 transitions with correct actor and timestamp.
- **SC-003**: The Kanban board loads with up to 500 active deals across all stages in
  under 2 seconds on a standard broadband connection.
- **SC-004**: Weighted pipeline value recalculates and is visible in the pipeline summary
  within 3 seconds of a deal's value or probability being updated.
- **SC-005**: 100% of stage transitions are captured in the deal stage history; no
  transition is lost during concurrent drag-and-drop operations.
- **SC-006**: Sales Manager can set a quarterly revenue target and see progress with Won
  deals reflected within 5 seconds of a deal being marked Won.

---

## Assumptions

- Each tenant may have multiple pipelines; a deal belongs to exactly one pipeline at a time.
  Cross-pipeline movement is out of scope for Phase 1.
- Currency is configured at the tenant level (single currency per tenant for Phase 1);
  multi-currency support is deferred to a future phase.
- The Kanban board shows only OPEN (not Won, not Lost) deals by default; Won and Lost deals
  are accessible via a separate "Closed Deals" filtered view on the same pipeline.
- A deal must belong to a pipeline stage at all times; a "no stage" state does not exist.
- Contact and Company associations on a deal are optional; a deal may exist with neither.
- Revenue targets in Phase 1 are set at the pipeline level only; per-rep quota tracking is
  handled by the Reporting feature (future phase).
- The probability field on a deal is manually editable; it is pre-filled with the stage's
  default probability when a deal is placed into that stage but the user may override it.
- Drag-and-drop is the primary stage-transition interaction on desktop; the stage dropdown
  on the deal detail page is the fallback and the primary interaction on tablet/mobile.
- A "Closed Won" stage type and a "Closed Lost" stage type must each be designated exactly
  once per pipeline; a pipeline without both types cannot be set as the default pipeline.
- Deal cloning (US5) is limited to deals within the same pipeline; cloning to a different
  pipeline is out of scope.
- The `Deal` entity references the same `Contact` and `Company` entities managed by the
  Contacts & Companies feature (001-contacts-companies); no duplicate entities are created.
