# Quickstart Validation Guide: Deal & Pipeline Management

**Feature**: `005-deal-pipeline`
**Date**: 2026-06-15
**Prerequisites**: Local Docker Compose stack running (Postgres, Redis, MinIO);
tenant seeded with at least one Admin user, one Manager user, and one Sales Rep user.
See root `docker-compose.yml` for startup command.

---

## Scenario 1: Pipeline Setup (US1 — P1)

**Goal**: Admin creates a pipeline with stages; stage reorder and deletion guard verified.

**Steps**:

1. Sign in as Tenant Admin.
2. Navigate to **Settings → Pipelines → New Pipeline**.
3. Create pipeline "Enterprise Sales" with stages:

   | Order | Name | Probability | Type |
   |-------|------|-------------|------|
   | 1 | Prospecting | 10% | OPEN |
   | 2 | Qualification | 30% | OPEN |
   | 3 | Proposal | 60% | OPEN |
   | 4 | Negotiation | 80% | OPEN |
   | 5 | Closed Won | 100% | CLOSED_WON |
   | 6 | Closed Lost | 0% | CLOSED_LOST |

4. Reorder stages so "Negotiation" appears before "Proposal" (drag up).

**Expected**: Pipeline saves successfully. Stage order on the Kanban board now shows Negotiation at position 3, Proposal at 4.

5. Create a test deal in "Qualification" (see Scenario 2, step 1).
6. Attempt to delete the "Qualification" stage.

**Expected**: Deletion blocked. Message: "1 deal is in this stage — reassign before deleting."

**API verification**:
```
GET /api/v1/pipelines
→ Response includes "Enterprise Sales" with 6 stages in correct display order
```

---

## Scenario 2: Deal CRUD (US2 — P1)

**Goal**: Sales Rep creates a deal, updates it, marks it Won, verifies Won Deals view.

**Steps**:

1. Sign in as Sales Rep. Navigate to **Deals → New Deal**.
2. Create deal:
   - Name: "Acme Corp — Q3 Licence"
   - Value: £25,000
   - Close Date: 2026-09-30
   - Pipeline: Enterprise Sales / Stage: Qualification
   - Probability: 60%
   - Contact: (leave blank)
   - Company: (leave blank)
3. Save. **Expected**: Deal card appears in "Qualification" column on Kanban board.
4. Edit deal — change value to £30,000. **Expected**: Deal card value updates to £30,000.
5. Mark deal as **Won**. **Expected**: Card disappears from active board.
6. Navigate to **Deals → Closed → Won**. **Expected**: "Acme Corp — Q3 Licence" at £30,000 appears.
7. Click deal → **Stage History**. **Expected**: Two entries:
   - Created → Qualification (at step 2 timestamp)
   - Qualification → Closed Won (at step 5 timestamp)

**API verification**:
```
GET /api/v1/deals/{id}/stage-history
→ Response has 2 history entries; fromStage is null for first entry
```

---

## Scenario 3: Kanban Board & Stage Transitions (US3 — P1)

**Goal**: Drag-and-drop move, stage history recorded, Manager view with filter, List View sort.

**Steps**:

1. Sign in as Sales Rep. Open **Deals → Kanban** (Enterprise Sales pipeline).
2. Create a second deal "Beta Ltd Pilot" at £10,000 in "Prospecting" (30 days close).
3. Drag "Beta Ltd Pilot" card from "Prospecting" to "Proposal".

**Expected**: Card moves to Proposal column. Stage history adds entry: Prospecting → Proposal.

4. Sign in as Sales Manager. Open Deals Kanban. **Expected**: Both deals visible.
5. Filter by owner "Sales Rep A". **Expected**: Only Sales Rep A's deals shown.
6. Switch to **List View**. Sort by Close Date ascending.

**Expected**: Deals displayed in a sortable table; sort order is correct.

**API verification**:
```
GET /api/v1/deals/kanban?pipelineId={id}
→ stages array includes "Proposal" with "Beta Ltd Pilot" in deals array

GET /api/v1/deals/kanban?pipelineId={id}&ownerId={repAId}
→ Only Rep A's deals appear
```

---

## Scenario 4: Weighted Value & Revenue Targets (US4 — P2)

**Goal**: Weighted value calculation and revenue target progress verified.

**Steps**:

1. Sign in as Sales Manager. Navigate to **Deals → Pipeline Summary** (or Dashboard).
2. Verify weighted value shown for each active deal:
   - "Beta Ltd Pilot" £10,000 × 60% (Proposal default) = **£6,000**
3. Navigate to **Settings → Pipelines → Enterprise Sales → Revenue Targets**.
4. Set a Q3 2026 (start: 2026-07-01) quarterly target of **£500,000**.
5. Mark "Beta Ltd Pilot" as Won (value £10,000).

**Expected**: Revenue target widget shows: **£10,000 of £500,000 (2%)**.

6. Update Won deal value to £50,000 (re-open and change value, or set it before winning).

**Expected**: Progress updates to **£50,000 of £500,000 (10%)** within 3 seconds.

**API verification**:
```
GET /api/v1/pipelines/{id}/revenue-targets
→ { periodType: "QUARTERLY", targetValue: 500000, progress: { wonValue: 50000, percentage: 10 } }
```

---

## Scenario 5: Custom Fields & Clone (US5 — P2/P3)

**Goal**: Admin defines custom field; Rep creates deal with field; clone copies field value.

**Steps**:

1. Sign in as Admin. Navigate to **Settings → Deal Fields → Add Field**.
2. Create field:
   - Name: Lead Source
   - Type: DROPDOWN
   - Options: Inbound, Outbound, Referral, Event
   - Required: Yes

3. Sign in as Sales Rep. Create new deal "Clone Test Deal" in Qualification.
4. Verify "Lead Source" dropdown appears as a required field. Select **Referral**.
5. Save deal. **Expected**: Deal saved with Lead Source = Referral.

6. Open "Clone Test Deal" → **Clone**.
7. **Expected**: New deal created with:
   - Name: "Copy of Clone Test Deal"
   - Value: same as original
   - Close Date: blank
   - Owner: cloning user
   - Lead Source: Referral (copied)

**API verification**:
```
POST /api/v1/deals/{id}/clone
→ Response: new deal with name "Copy of Clone Test Deal", closeDate null, ownerId = caller, 
   customFields.Lead Source = "Referral"
```

---

## Common Failure Checks

| Check | How to verify |
|-------|---------------|
| Stage deletion guard | Attempt `DELETE /api/v1/pipelines/{id}/stages/{stageId}` with active deals → expect 409 `STAGE_HAS_ACTIVE_DEALS` |
| RBAC: Rep cannot move others' deal | Sign in as Rep B, call `PUT /api/v1/deals/{repA-deal-id}/stage` → expect 403 `FORBIDDEN` |
| Stage history immutability | No `PUT` or `DELETE` endpoint exists for `/api/v1/deals/{id}/stage-history` → expect 404/405 |
| Weighted value cross-check | `stageWeightedValue` in kanban response = sum of `weightedValue` for all deals in that stage |
| Required custom field | Create deal without Lead Source → expect 400 `CUSTOM_FIELD_REQUIRED` |
