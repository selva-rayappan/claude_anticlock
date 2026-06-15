# API Contract: Pipelines & Stages

**Base path**: `/api/v1/pipelines`
**Auth**: All endpoints require a valid session (JWT Bearer or personal API token)
**Envelope**: All responses use `{ data, meta, errors }` per Constitution Principle II

---

## GET /api/v1/pipelines

List all active pipelines for the current tenant with their stages.

**Auth**: Any role

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Enterprise Sales",
      "description": "Main new-business pipeline",
      "isDefault": true,
      "isActive": true,
      "stages": [
        {
          "id": "uuid",
          "name": "Prospecting",
          "displayOrder": 1,
          "defaultProbability": 10,
          "stageType": "OPEN"
        },
        {
          "id": "uuid",
          "name": "Closed Won",
          "displayOrder": 5,
          "defaultProbability": 100,
          "stageType": "CLOSED_WON"
        }
      ]
    }
  ],
  "meta": { "total": 2 },
  "errors": []
}
```

---

## POST /api/v1/pipelines

Create a new pipeline.

**Auth**: Admin only

**Request body**:
```json
{
  "name": "Renewals Pipeline",
  "description": "Annual licence renewals",
  "isDefault": false,
  "stages": [
    { "name": "Identified", "displayOrder": 1, "defaultProbability": 20, "stageType": "OPEN" },
    { "name": "Negotiation", "displayOrder": 2, "defaultProbability": 70, "stageType": "OPEN" },
    { "name": "Closed Won",  "displayOrder": 3, "defaultProbability": 100, "stageType": "CLOSED_WON" },
    { "name": "Closed Lost", "displayOrder": 4, "defaultProbability": 0, "stageType": "CLOSED_LOST" }
  ]
}
```

**Response 201**: Created pipeline with generated IDs (same shape as GET item)

**Error codes**:
- `PIPELINE_NAME_DUPLICATE` — pipeline name already exists for this tenant
- `MISSING_CLOSED_WON_STAGE` — no stage with stageType CLOSED_WON provided
- `MISSING_CLOSED_LOST_STAGE` — no stage with stageType CLOSED_LOST provided

---

## PUT /api/v1/pipelines/{id}/stages/reorder

Reorder all stages for a pipeline by supplying the full ordered array of stage IDs.

**Auth**: Admin only

**Request body**:
```json
{
  "orderedStageIds": ["uuid-stage-3", "uuid-stage-1", "uuid-stage-2"]
}
```

**Response 200**: Updated stage list with new displayOrder values

**Error codes**:
- `STAGE_IDS_MISMATCH` — supplied IDs don't match all stages in the pipeline

---

## DELETE /api/v1/pipelines/{id}/stages/{stageId}

Delete a pipeline stage. Blocked if active (non-archived) deals are in this stage.

**Auth**: Admin only

**Response 204**: Stage deleted

**Error codes**:
- `STAGE_HAS_ACTIVE_DEALS` — body includes `{ "dealCount": 7 }` — caller must reassign deals first
- `LAST_OPEN_STAGE` — cannot delete the only remaining OPEN stage in a pipeline

---

## GET /api/v1/pipelines/{id}/revenue-targets

List revenue targets for a pipeline.

**Auth**: Manager, Admin

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "periodType": "QUARTERLY",
      "targetValue": 500000.00,
      "currency": "GBP",
      "startDate": "2026-07-01",
      "progress": {
        "wonValue": 120000.00,
        "percentage": 24.0
      }
    }
  ],
  "meta": {},
  "errors": []
}
```

---

## POST /api/v1/pipelines/{id}/revenue-targets

Set (upsert) a revenue target for a pipeline period.

**Auth**: Manager, Admin

**Request body**:
```json
{
  "periodType": "QUARTERLY",
  "targetValue": 500000.00,
  "startDate": "2026-07-01"
}
```

**Response 200**: Upserted target with current progress

**Error codes**:
- `INVALID_START_DATE` — start date is not the first day of the declared period
