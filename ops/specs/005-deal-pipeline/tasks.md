---
description: "Task list for 005-deal-pipeline — Deal & Pipeline Management"
---

# Tasks: Deal & Pipeline Management

**Feature Branch**: `005-deal-pipeline`
**Input**: `specs/005-deal-pipeline/spec.md` · `specs/005-deal-pipeline/plan.md`
**Constitution**: `.specify/memory/constitution.md` v1.0.0

**Tech Stack**:
- Backend: Java 21 + Spring Boot 3.4.1 · `apps/api/src/main/java/io/opsnext/api/`
- Frontend: Next.js 15 App Router + React 19 + shadcn/ui + `@dnd-kit/core` · `apps/web/src/`
- DB: PostgreSQL 16 (schema-per-tenant) · Redis 7 (pipeline summary cache)
- DnD: `@dnd-kit/core` + `@dnd-kit/sortable` (Kanban board drag-and-drop)

**Constitution Gates** (enforced throughout):
- All 6 entities scoped to `tenantId`; all reads/writes via `TenantJdbcTemplate` (Principle I)
- `{ data, meta, errors }` envelope; machine-readable error codes (`STAGE_HAS_ACTIVE_DEALS`, `LOSS_REASON_REQUIRED`) (Principle II)
- Phase gate: localhost board must be functional before Phase 4 (Contacts) starts (Principle III)
- Stage history is insert-only — no `UPDATE`/`DELETE` endpoint exists; written in same tx as stage move (Principle IV)
- All deal mutations emit structured logs: `tenantId`, `userId`, `dealId`, `operation`, `durationMs`, `outcome` (Principle VI)

---

## Phase 1: Setup

**Purpose**: DB migrations, shared types, Zod schemas, and route scaffolding.

- [ ] T001 Create Flyway migration `V005.1__pipeline.sql` in `apps/api/src/main/resources/db/migration/tenant/` — adds `pipeline` table (id, tenantId, name, description, isDefault, isActive, timestamps) with partial unique index on `is_default = TRUE`
- [ ] T002 [P] Create Flyway migration `V005.2__pipeline_stage.sql` in `apps/api/src/main/resources/db/migration/tenant/` — adds `stage_type` enum (OPEN/CLOSED_WON/CLOSED_LOST) and `pipeline_stage` table (id, pipelineId FK, tenantId, name, displayOrder, defaultProbability CHECK 0–100, stageType) with unique constraint on (pipelineId, displayOrder)
- [ ] T003 [P] Create Flyway migration `V005.3__deal.sql` in `apps/api/src/main/resources/db/migration/tenant/` — adds `deal_status` enum (OPEN/WON/LOST) and `deal` table (id, tenantId, pipelineId, stageId, name, value NUMERIC, currency CHAR(3), closeDate, ownerId, probability CHECK 0–100, status, contactId nullable, companyId nullable, lossReason, customFields JSONB DEFAULT '{}', archivedAt) with active-deal indexes on pipeline+stage and owner
- [ ] T004 [P] Create Flyway migration `V005.4__deal_stage_history.sql` in `apps/api/src/main/resources/db/migration/tenant/` — adds `deal_stage_history` table (id, dealId FK, tenantId, fromStageId FK nullable, toStageId FK, changedAt DEFAULT now(), changedById FK) with index on (dealId, changedAt)
- [ ] T005 [P] Create Flyway migration `V005.5__revenue_target.sql` in `apps/api/src/main/resources/db/migration/tenant/` — adds `period_type` enum (MONTHLY/QUARTERLY) and `revenue_target` table (id, tenantId, pipelineId FK, periodType, targetValue NUMERIC, currency, startDate) with unique constraint on (pipelineId, periodType, startDate)
- [ ] T006 [P] Create Flyway migration `V005.6__deal_custom_field_definition.sql` in `apps/api/src/main/resources/db/migration/tenant/` — adds `field_type` enum (TEXT/NUMBER/DATE/DROPDOWN/MULTI_SELECT/BOOLEAN) and `deal_custom_field_definition` table (id, tenantId, name, fieldType, options JSONB, isRequired, displayOrder, isActive) with unique constraint on (tenantId, name)
- [ ] T007 [P] Add shared TypeScript types `Pipeline`, `PipelineStage`, `Deal`, `DealCard`, `DealStageHistory`, `RevenueTarget`, `DealCustomFieldDefinition` to `packages/shared/src/types/deals.ts`
- [ ] T008 [P] Add Zod schemas `createPipelineSchema`, `createDealSchema`, `updateDealSchema`, `closeDealSchema`, `moveStageDealSchema`, `createCustomFieldSchema` to `packages/shared/src/schemas/deals.ts`
- [ ] T009 [P] Register `/api/v1/pipelines/**` and `/api/v1/deals/**` and `/api/v1/deal-custom-fields/**` route prefixes with authenticated-only access in `apps/api/src/main/java/io/opsnext/api/security/SecurityConfig.java`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: JPA entities, event logger, and DnD utility setup — required before any user story can be implemented.

**⚠️ CRITICAL**: No user story work begins until this phase is complete and all entities compile cleanly against the migrations.

- [ ] T010 Implement `Pipeline` JPA entity in `apps/api/src/main/java/io/opsnext/api/pipeline/Pipeline.java` — fields: id, tenantId, name, description, isDefault, isActive, createdAt, updatedAt; one-to-many relationship to `PipelineStage`
- [ ] T011 [P] Implement `PipelineStage` JPA entity in `apps/api/src/main/java/io/opsnext/api/pipeline/PipelineStage.java` — fields: id, pipelineId (FK), tenantId, name, displayOrder, defaultProbability, stageType (StageType enum); many-to-one to Pipeline
- [ ] T012 [P] Implement `Deal` JPA entity in `apps/api/src/main/java/io/opsnext/api/deal/Deal.java` — all fields from migration; `customFields` mapped as `@Type(JsonBinaryType.class)` JSONB column (`Map<String, Object>`); `status` mapped to `DealStatus` enum
- [ ] T013 [P] Implement `DealStageHistory` JPA entity in `apps/api/src/main/java/io/opsnext/api/deal/DealStageHistory.java` — fields: id, dealId (FK), tenantId, fromStageId (nullable FK), toStageId (FK), changedAt, changedById; no setter on `changedAt` (always NOW); no update/delete repository methods exposed
- [ ] T014 [P] Implement `RevenueTarget` JPA entity in `apps/api/src/main/java/io/opsnext/api/revenue/RevenueTarget.java` — fields: id, tenantId, pipelineId (FK), periodType (PeriodType enum), targetValue, currency, startDate
- [ ] T015 [P] Implement `DealCustomFieldDefinition` JPA entity in `apps/api/src/main/java/io/opsnext/api/customfield/DealCustomFieldDefinition.java` — fields: id, tenantId, name, fieldType (FieldType enum), options (JSONB → `List<String>`), isRequired, displayOrder, isActive
- [ ] T016 Implement `DealEventLogger` in `apps/api/src/main/java/io/opsnext/api/deal/DealEventLogger.java` — structured log emitter for events: `DEAL_CREATED`, `DEAL_UPDATED`, `DEAL_STAGE_MOVED`, `DEAL_WON`, `DEAL_LOST`, `DEAL_ARCHIVED`, `DEAL_CLONED`, `PIPELINE_CREATED`, `PIPELINE_STAGE_DELETED`; all entries include `tenantId`, `userId`, `dealId`, `operation`, `durationMs`, `outcome`
- [ ] T017 [P] Implement DnD utility types and helpers in `apps/web/src/lib/dnd-utils.ts` — `KanbanDragItem` type (dealId, fromStageId), `KanbanDropTarget` type (toStageId), `closestCorner` collision detection config for `@dnd-kit/core DndContext`

**Checkpoint**: All 6 entities compile, migrations run cleanly via Flyway, DnD utils import correctly → user story work may begin.

---

## Phase 3: User Story 1 — Pipeline Setup (Priority: P1) 🎯 MVP Foundation

**Goal**: Tenant Admin creates and configures named pipelines with ordered stages.
Stage reorder, rename, and deletion guard all function correctly.

**Independent Test**: Sign in as Admin → Settings → Pipelines → Create "Enterprise Sales" pipeline
with 6 stages (see quickstart.md Scenario 1). Reorder two stages — verify new order on Kanban.
Attempt to delete a stage with an active deal — verify 409 STAGE_HAS_ACTIVE_DEALS blocked. No
other feature needed.

### Backend — User Story 1

- [ ] T018 [P] [US1] Implement `PipelineService` in `apps/api/src/main/java/io/opsnext/api/pipeline/PipelineService.java` — CRUD for pipelines and stages; `reorderStages(pipelineId, orderedIds)` validates all stage IDs belong to pipeline; `deleteStage(stageId)` counts active non-archived deals in stage — throws `StageHasActiveDealsException` if count > 0; CLOSED_WON/CLOSED_LOST type uniqueness enforced per pipeline; emits structured event log via `DealEventLogger`
- [ ] T019 [US1] Implement `PipelineController` in `apps/api/src/main/java/io/opsnext/api/pipeline/PipelineController.java`:
  - `GET /api/v1/pipelines` — list all active pipelines with stages (all roles)
  - `POST /api/v1/pipelines` — create pipeline with initial stages (Admin only)
  - `PUT /api/v1/pipelines/{id}` — update name/description (Admin only)
  - `GET /api/v1/pipelines/{id}/stages` — list stages for pipeline (all roles)
  - `POST /api/v1/pipelines/{id}/stages` — add stage (Admin only)
  - `PUT /api/v1/pipelines/{id}/stages/{stageId}` — rename/update stage (Admin only)
  - `PUT /api/v1/pipelines/{id}/stages/reorder` — reorder all stages (Admin only)
  - `DELETE /api/v1/pipelines/{id}/stages/{stageId}` — delete stage (Admin only); returns 409 + dealCount if guarded

### Frontend — User Story 1

- [ ] T020 [P] [US1] Implement `PipelineSettingsForm` at `apps/web/src/components/deals/pipeline-settings-form.tsx` — pipeline name/description input; stage list with `@dnd-kit/sortable` drag handles for reordering; Add Stage button; per-stage: name, default probability, stage type selector (OPEN/CLOSED_WON/CLOSED_LOST), delete button; handles 409 response by showing deal count in error message
- [ ] T021 [P] [US1] Add `usePipelines`, `useCreatePipeline`, `useUpdatePipeline`, `useCreateStage`, `useUpdateStage`, `useReorderStages`, `useDeleteStage` hooks to `apps/web/src/lib/queries/pipelines.ts`
- [ ] T022 [US1] Implement Pipeline Settings page at `apps/web/src/app/(app)/settings/pipelines/page.tsx` — Admin-only; lists existing pipelines; "New Pipeline" button with create dialog; renders `PipelineSettingsForm` per pipeline in an accordion

**Checkpoint**: Pipeline CRUD fully functional. Stage reorder saves and renders correctly. Deletion guard shows deal count. US1 testable independently.

---

## Phase 4: User Story 2 — Deal Creation & Management (Priority: P1)

**Goal**: Sales Rep creates and manages deal records with full field set. Won/Lost close,
stage history recorded for every transition.

**Independent Test**: Create deal "Acme Q3" £25,000 in Qualification stage. Update value to
£30,000. Mark Won. Verify Won Deals view. Verify stage history: 2 entries (Qualification →
initial; Qualification → Closed Won). Create deal with no contact or company — verify success.

### Backend — User Story 2

- [ ] T023 [P] [US2] Implement `DealService.createDeal`, `updateDeal`, `archiveDeal`, `closeDeal(Won/Lost)` in `apps/api/src/main/java/io/opsnext/api/deal/DealService.java` — `createDeal` validates stageId in pipelineId; validates ownerId/contactId/companyId are tenant-members; validates required custom fields from active `DealCustomFieldDefinition` records; writes initial `DealStageHistory` (fromStageId=null) in same transaction; `closeDeal` sets status, moves to CLOSED_WON/CLOSED_LOST stage, writes history; emits events via `DealEventLogger`
- [ ] T024 [US2] Implement `DealController` in `apps/api/src/main/java/io/opsnext/api/deal/DealController.java`:
  - `GET /api/v1/deals` — filterable (pipelineId, stageId, status, ownerId, closeDateFrom/To), sortable, paginated (default 25)
  - `POST /api/v1/deals` — create; writes initial stage history in same tx
  - `GET /api/v1/deals/{id}` — full deal detail with associated contact/company names
  - `PUT /api/v1/deals/{id}` — update (Rep: own deal only; Manager/Admin: any)
  - `DELETE /api/v1/deals/{id}` — archive (Manager/Admin only; sets archivedAt)
  - `PUT /api/v1/deals/{id}/close` — mark Won or Lost; 400 `LOSS_REASON_REQUIRED` if LOST without reason
- [ ] T025 [US2] Implement `DealStageController` and `DealStageHistoryController` in `apps/api/src/main/java/io/opsnext/api/deal/`:
  - `PUT /api/v1/deals/{id}/stage` — move deal to new stage; write `DealStageHistory` in same transaction as `deal.stageId` update; auto-close if target stage is CLOSED_WON or CLOSED_LOST
  - `GET /api/v1/deals/{id}/stage-history` — return chronological history list with fromStage/toStage names and changedBy name

### Frontend — User Story 2

- [ ] T026 [P] [US2] Implement `DealForm` component at `apps/web/src/components/deals/deal-form.tsx` — name, value (currency-prefixed), close date picker, pipeline selector, stage selector (filtered by selected pipeline), owner selector, probability (0–100 slider or input); optional contact and company selectors; active custom field definitions rendered dynamically (see US5 T048 for custom field renderer — add placeholder rendering for now); react-hook-form + Zod validation; inline field errors
- [ ] T027 [P] [US2] Implement `StageHistoryTimeline` at `apps/web/src/components/deals/stage-history-timeline.tsx` — ordered list of transition entries; each entry: actor name, from-stage → to-stage arrow, formatted timestamp; first entry shows "Created in [stage]" when fromStage is null
- [ ] T028 [US2] Implement Deal create page at `apps/web/src/app/(app)/deals/new/page.tsx` — renders `DealForm`; on success navigates to deal detail `[id]` page
- [ ] T029 [US2] Implement Deal detail page at `apps/web/src/app/(app)/deals/[id]/page.tsx` — shows all deal fields in read mode with Edit button; stage dropdown for manual move (calls useMoveStage); Won/Lost close buttons (Lost opens loss-reason input modal); renders `StageHistoryTimeline`
- [ ] T030 [P] [US2] Add `useDeals`, `useCreateDeal`, `useDeal`, `useUpdateDeal`, `useCloseDeal`, `useMoveStage`, `useDealStageHistory` hooks to `apps/web/src/lib/queries/deals.ts` and `apps/web/src/lib/queries/deal-stage.ts`

**Checkpoint**: Full deal lifecycle functional. Stage history correct for create and close transitions. Rep cannot update another rep's deal (403). Won deals removed from active board. US2 testable independently.

---

## Phase 5: User Story 3 — Kanban Board & Stage Transitions (Priority: P1)

**Goal**: Visual Kanban board with drag-and-drop stage transitions. Every move recorded in
stage history. Manager can filter and switch to List View.

**Independent Test**: Drag deal card Prospecting → Proposal. Verify card moves, stage history
updated, column deal counts correct. Filter board by owner → only that owner's cards visible.
Switch to List View → sortable table renders. See quickstart.md Scenario 3.

### Backend — User Story 3

- [ ] T031 [P] [US3] Implement `DealKanbanController.getKanbanBoard` at `GET /api/v1/deals/kanban` in `apps/api/src/main/java/io/opsnext/api/deal/DealKanbanController.java` — query: join deal + pipeline_stage + users LEFT JOIN contacts LEFT JOIN companies; group by stage; project `DealCard` (id, name, value, currency, probability, weightedValue=value×probability/100, closeDate, ownerName, ownerAvatarUrl, contactName, companyName); support filter params: pipelineId (required), ownerId, closeDateFrom, closeDateTo, valueMin, valueMax; includes stageValue and stageWeightedValue aggregates per stage column

### Frontend — User Story 3

- [ ] T032 [P] [US3] Implement `DealCard` component at `apps/web/src/components/deals/deal-card.tsx` — shadcn Card; displays name, formatted value, owner avatar + name, close date (red if overdue), probability badge; wrapped with `@dnd-kit useDraggable` hook; `data` attribute carries `{ dealId, fromStageId }`; links to deal detail on click (disabled during drag)
- [ ] T033 [P] [US3] Implement `KanbanColumn` component at `apps/web/src/components/deals/kanban-column.tsx` — stage header: stage name, deal count badge, stage total value, weighted value; droppable via `@dnd-kit useDroppable`; renders `DealCard` list; visual drop indicator (border highlight) on active drag-over; "Add Deal" quick-add button that opens new deal form pre-filled with this stage
- [ ] T034 [US3] Implement `KanbanBoard` component at `apps/web/src/components/deals/kanban-board.tsx` — `@dnd-kit DndContext` wrapping all columns; uses `closestCorner` collision detection from `dnd-utils.ts`; on `onDragEnd`: extract `dealId` + `fromStageId` from active item, `toStageId` from over droppable; skip if same stage; call `useMoveStage` mutation; apply optimistic update (move card in local kanban data) and revert on mutation error
- [ ] T035 [US3] Implement main Deals page at `apps/web/src/app/(app)/deals/page.tsx` — pipeline selector (default: tenant default pipeline); filter bar (owner filter, close date range, value range — all optional); renders `KanbanBoard`; "List View" toggle button; renders `PipelineSummary` (US4) and `RevenueTargetWidget` (US4) above board
- [ ] T036 [US3] Implement Deals List View at `apps/web/src/app/(app)/deals/list/page.tsx` — shadcn Table; columns: name (link to detail), value, stage, owner, close date (with overdue highlight), probability; all columns sortable via query param; pagination controls; same filter bar as Kanban view
- [ ] T037 [P] [US3] Add `useKanbanBoard` hook to `apps/web/src/lib/queries/deals-kanban.ts` — TanStack Query; params: `pipelineId`, filter values; `refetchInterval: 30000`; query key includes all filter params; returns grouped stages + deals payload

**Checkpoint**: Drag-and-drop moves deal and writes stage history. Optimistic update works — card returns to original column on API error. Manager filter shows only filtered cards. List View renders and sorts correctly. US3 testable independently.

---

## Phase 6: User Story 4 — Weighted Pipeline Value & Revenue Targets (Priority: P2)

**Goal**: Weighted value (value × probability) displayed per stage and as pipeline total.
Sales Manager sets quarterly/monthly revenue targets and tracks Won deal progress.

**Independent Test**: Place deals with known values and probabilities. Verify weighted values
match calculation. Set Q3 target £500,000. Mark a £50,000 deal Won. Verify progress shows 10%.
See quickstart.md Scenario 4.

### Backend — User Story 4

- [ ] T038 [P] [US4] Implement `RevenueTargetService.upsert` and `getWithProgress` in `apps/api/src/main/java/io/opsnext/api/revenue/RevenueTargetService.java` — `upsert` validates startDate is first day of the period (e.g., 2026-07-01 for Q3); `getWithProgress` returns target + `SUM(deal.value) WHERE status=WON AND close_date BETWEEN startDate AND periodEndDate`; progress percentage rounded to 1 decimal
- [ ] T039 [US4] Implement `RevenueTargetController` in `apps/api/src/main/java/io/opsnext/api/revenue/RevenueTargetController.java`:
  - `GET /api/v1/pipelines/{id}/revenue-targets` — list targets for pipeline (Manager/Admin); includes live progress per target
  - `POST /api/v1/pipelines/{id}/revenue-targets` — upsert target (Manager/Admin); 400 `INVALID_START_DATE` if date is not period start

### Frontend — User Story 4

- [ ] T040 [P] [US4] Implement `PipelineSummary` component at `apps/web/src/components/deals/pipeline-summary.tsx` — reads `weightedTotal` and per-stage `stageWeightedValue` from `useKanbanBoard` response; displays pipeline total weighted value prominently; per-stage weighted value shown in `KanbanColumn` header (already rendered in T033 from kanban payload)
- [ ] T041 [P] [US4] Implement `RevenueTargetWidget` at `apps/web/src/components/deals/revenue-target-widget.tsx` — shows current period label (e.g., "Q3 2026"), target amount, progress bar, Won value, percentage; "Set Target" button (Manager/Admin only) opens inline form with period type selector and target amount input; calls `useSetRevenueTarget`; hides widget for Rep role
- [ ] T042 [US4] Embed `PipelineSummary` and `RevenueTargetWidget` into the deals page header at `apps/web/src/app/(app)/deals/page.tsx` — visible above Kanban board; summary collapses on mobile
- [ ] T043 [P] [US4] Add `useRevenueTarget` and `useSetRevenueTarget` hooks to `apps/web/src/lib/queries/revenue-targets.ts` — `useRevenueTarget` queries current period target + progress; `useSetRevenueTarget` mutation POSTs to revenue-targets endpoint and invalidates query on success

**Checkpoint**: Weighted values match manual calculation. Revenue target progress reflects Won deals within 3 seconds. Rep sees no "Set Target" button. US4 testable independently.

---

## Phase 7: User Story 5 — Deal Custom Fields & Deal Clone (Priority: P2/P3)

**Goal**: Tenant Admin defines custom fields for deals (dropdown, text, number, date,
multi-select, boolean). Sales Rep clones an existing deal.

**Independent Test (Custom Fields)**: Admin defines required "Lead Source" DROPDOWN. Create
deal — verify field appears, required validation fires, selection saves with deal.

**Independent Test (Clone)**: Clone "Acme Q3" deal. Verify: name "Copy of Acme Q3", close
date blank, owner = cloning user, custom field values copied. See quickstart.md Scenario 5.

### Backend — User Story 5

- [ ] T044 [P] [US5] Implement `DealCustomFieldDefinitionService.create`, `update`, `deactivate` in `apps/api/src/main/java/io/opsnext/api/customfield/DealCustomFieldDefinitionService.java` — `create` validates `options` non-empty array when fieldType is DROPDOWN or MULTI_SELECT; enforces unique name per tenant; `deactivate` sets `isActive = false` (preserves existing JSONB values on deals)
- [ ] T045 [P] [US5] Implement `DealCustomFieldDefinitionController` in `apps/api/src/main/java/io/opsnext/api/customfield/DealCustomFieldDefinitionController.java`:
  - `GET /api/v1/deal-custom-fields` — list active definitions (all roles)
  - `POST /api/v1/deal-custom-fields` — create (Admin only)
  - `PUT /api/v1/deal-custom-fields/{id}` — update name/options/required/order (Admin only)
  - `DELETE /api/v1/deal-custom-fields/{id}` — deactivate (Admin only); 204 response
- [ ] T046 [US5] Implement `DealService.clone(dealId, callerUserId)` in `apps/api/src/main/java/io/opsnext/api/deal/DealService.java` — copies all fields from source Deal; name = "Copy of " + source.name; closeDate = null; ownerId = callerUserId; status = OPEN; same pipelineId and stageId as source; copies `customFields` JSONB as-is; writes initial `DealStageHistory` (fromStageId=null, toStageId=source.stageId) for new deal; emits `DEAL_CLONED` event log
- [ ] T047 [US5] Add clone endpoint `POST /api/v1/deals/{id}/clone` to `apps/api/src/main/java/io/opsnext/api/deal/DealController.java` — returns 201 with new deal entity

### Frontend — User Story 5

- [ ] T048 [P] [US5] Add custom field dynamic renderer to `apps/web/src/components/deals/deal-form.tsx` — reads active definitions from `useCustomFields` query; renders per `fieldType`: TEXT→`<Input>`, NUMBER→`<Input type="number">`, DATE→`<DatePicker>`, DROPDOWN→shadcn `<Select>` with definition options, MULTI_SELECT→shadcn `<Combobox multiple>`, BOOLEAN→shadcn `<Checkbox>`; applies `isRequired` client-side validation via Zod `refine`; values stored in `customFields` object keyed by field name
- [ ] T049 [P] [US5] Add `useCustomFields`, `useCreateCustomField`, `useUpdateCustomField`, `useDeactivateCustomField` hooks to `apps/web/src/lib/queries/deals.ts`
- [ ] T050 [US5] Implement Deal Custom Fields admin page at `apps/web/src/app/(app)/settings/deal-fields/page.tsx` — Admin-only; table of field definitions with type badge, required indicator, active/inactive toggle; "Add Field" button opens dialog (name, type selector, options textarea for DROPDOWN/MULTI_SELECT, required toggle, display order); deactivate button with confirmation

**Checkpoint**: Custom field appears on deal form and saves in JSONB. Required validation blocks save. Clone creates correct new deal with custom fields copied. Deactivated field hidden from form but deal data intact. US5 testable independently.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Closed deals view, navigation, API envelope compliance, observability validation.

- [ ] T051 [P] Implement Closed Deals view at `apps/web/src/app/(app)/deals/closed/page.tsx` — Won / Lost tab toggle; sortable table; Lost tab includes "Loss Reason" column; links to deal detail; accessible from main Deals page nav
- [ ] T052 [P] Add "Deals" navigation link to main app sidebar at `apps/web/src/components/layout/sidebar.tsx` — with sub-links to Kanban (`/deals`), List View (`/deals/list`), and Closed Deals (`/deals/closed`)
- [ ] T053 [P] Verify all pipeline and deal API responses use `{ data, meta, errors }` envelope; apply shared `ApiResponse<T>` wrapper where missing in `apps/api/src/main/java/io/opsnext/api/common/ApiResponse.java`
- [ ] T054 Verify `DealEventLogger` emits all required fields (`tenantId`, `userId`, `dealId`, `operation`, `durationMs`, `outcome`) for all 8 event types in `apps/api/src/main/java/io/opsnext/api/deal/DealEventLogger.java`
- [ ] T055 [P] Run end-to-end validation: exercise all 5 quickstart scenarios from `specs/005-deal-pipeline/quickstart.md` — pipeline setup, deal CRUD, Kanban board + DnD transitions, weighted value + revenue targets, custom fields + clone

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately; all 9 tasks can run in parallel
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US1 Pipeline Setup (Phase 3)**: Depends on Phase 2 — no story dependencies; should be completed first as pipelines are required for deals
- **US2 Deal CRUD (Phase 4)**: Depends on Phase 2 + US1 (pipeline entity required for deal creation)
- **US3 Kanban Board (Phase 5)**: Depends on Phase 2 + US2 (deals must exist to display on board)
- **US4 Weighted Value (Phase 6)**: Depends on Phase 2; kanban payload already carries weighted values (from US3); revenue target is independent of US2/US3 backend (only needs pipeline)
- **US5 Custom Fields & Clone (Phase 7)**: Depends on Phase 2; custom field definitions are independent; clone depends on US2 DealService
- **Polish (Phase 8)**: Depends on all stories being complete

### User Story Dependencies

- **US1 (P1)**: After Phase 2 only — pure pipeline CRUD, no deal dependency
- **US2 (P1)**: After Phase 2 + US1 — deal entity references pipeline/stage from US1
- **US3 (P1)**: After Phase 2 + US2 — Kanban board requires deals to exist; stage move reuses US2 DealStageController
- **US4 (P2)**: After Phase 2 — revenue target service independent; weighted value built into kanban payload (US3 frontend)
- **US5 (P2/P3)**: After Phase 2 — custom field definitions are independent; clone service method added to US2 DealService

### Parallel Opportunities

- T002–T009 can all run in parallel with T001 (Phase 1)
- T011–T017 can run in parallel with T010 (Phase 2)
- US1 backend (T018–T019) and frontend (T020–T022) can run in parallel after Phase 2
- US2 backend (T023–T025) and frontend (T026–T030) can run in parallel within Phase 4
- US3 backend (T031) can run in parallel with US3 frontend (T032–T037) after Phase 2 + US2
- US4 and US5 can run in parallel after Phase 2 (different packages, no shared files)

---

## Parallel Example: User Story 3 (Kanban Board)

```bash
# Backend (single task, but can overlap with frontend):
Task: "Implement DealKanbanController GET /api/v1/deals/kanban"           # T031

# Frontend tasks in parallel (all different files):
Task: "Implement DealCard draggable component in deal-card.tsx"           # T032
Task: "Implement KanbanColumn droppable component in kanban-column.tsx"   # T033
Task: "Add useKanbanBoard hook to queries/deals-kanban.ts"                # T037

# Then sequentially (depends on T032 + T033 + T037):
Task: "Implement KanbanBoard DndContext wrapper in kanban-board.tsx"      # T034
Task: "Implement main Deals page with pipeline selector and filter bar"   # T035
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3 — P1 Stories Only)

1. Complete Phase 1: Setup (all migrations and types)
2. Complete Phase 2: Foundational (entities + event logger + dnd-utils)
3. Complete Phase 3: US1 Pipeline Setup — Admin can create pipelines
4. Complete Phase 4: US2 Deal CRUD — Rep can create/close deals
5. Complete Phase 5: US3 Kanban Board — board renders and drag-and-drop works
6. **STOP and VALIDATE**: Present working Kanban board on localhost to Product Owner
7. Proceed to US4 + US5 only after phase-gate approval

### Incremental Delivery

1. Setup + Foundational → schema ready
2. US1 → Pipeline configuration working (Admin can set up pipelines)
3. US2 → Deal CRUD working (Rep can manage deal lifecycle)
4. US3 → Kanban board live (full visual board with DnD) → **Phase gate review**
5. US4 → Weighted value + revenue targets
6. US5 → Custom fields + clone
7. Polish → navigation, observability, closed deals view

---

## Notes

- [P] tasks = different files, no dependencies between them
- [USn] label maps task to specific user story for traceability
- `DealStageHistory` is insert-only — `DealService` writes history in the same `@Transactional` block as `deal.stageId` update; never call `dealStageHistoryRepo.delete()`
- Custom field values stored as JSONB on `deal.customFields` keyed by field definition `name` — field rename requires a data migration (deferred; document in assumptions)
- `@dnd-kit` optimistic update pattern: update local React Query cache on `onDragEnd`, revert on `onError` callback of `useMoveStage` mutation
- CLOSED_WON/CLOSED_LOST stage moves auto-set deal status — handle this in `DealService.moveStage` by checking target stage's `stageType`
- Weighted value is a computed field — never stored; always `value * probability / 100` at query time
