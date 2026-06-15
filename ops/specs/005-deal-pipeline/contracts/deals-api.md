# API Contract: Deals

**Base path**: `/api/v1/deals`
**Auth**: All endpoints require a valid session (JWT Bearer or personal API token)
**Envelope**: All responses use `{ data, meta, errors }` per Constitution Principle II

---

## GET /api/v1/deals/kanban

Board payload: all active (non-archived, status=OPEN) deals grouped by stage for a pipeline.
This is the primary data source for the Kanban board component.

**Auth**: Any role

**Query params**:
- `pipelineId` (required) — UUID of the target pipeline
- `ownerId` (optional) — filter cards by owner UUID
- `closeDateFrom` / `closeDateTo` (optional) — ISO date range filter
- `valueMin` / `valueMax` (optional) — deal value range filter

**Response 200**:
```json
{
  "data": {
    "pipeline": { "id": "uuid", "name": "Enterprise Sales" },
    "weightedTotal": 87500.00,
    "currency": "GBP",
    "stages": [
      {
        "stageId": "uuid",
        "stageName": "Qualification",
        "displayOrder": 2,
        "defaultProbability": 30,
        "stageType": "OPEN",
        "dealCount": 3,
        "stageValue": 45000.00,
        "stageWeightedValue": 13500.00,
        "deals": [
          {
            "id": "uuid",
            "name": "Acme Corp — Q3 Licence",
            "value": 25000.00,
            "currency": "GBP",
            "probability": 60,
            "weightedValue": 15000.00,
            "closeDate": "2026-09-30",
            "ownerName": "Jane Smith",
            "ownerAvatarUrl": "https://cdn.example.com/avatars/jane.jpg",
            "contactName": "John Doe",
            "companyName": "Acme Corp"
          }
        ]
      }
    ]
  },
  "meta": {},
  "errors": []
}
```

---

## GET /api/v1/deals

List deals with filtering, sorting, and pagination. Used for List View.

**Auth**: Any role

**Query params**:
- `pipelineId` (optional) — filter by pipeline
- `stageId` (optional) — filter by stage
- `status` (optional, default: OPEN) — OPEN | WON | LOST
- `ownerId` (optional) — filter by owner
- `closeDateFrom` / `closeDateTo` (optional) — date range
- `sort` (optional, default: `closeDate:asc`) — field:direction (name, value, closeDate, probability, stage)
- `page` / `size` (optional, default: 1/25) — pagination

**Response 200**: Paginated list of deal summaries with `meta.total`, `meta.page`, `meta.pages`

---

## POST /api/v1/deals

Create a new deal.

**Auth**: Rep, Manager, Admin

**Request body**:
```json
{
  "name": "Acme Corp — Q3 Licence",
  "pipelineId": "uuid",
  "stageId": "uuid",
  "value": 25000.00,
  "closeDate": "2026-09-30",
  "ownerId": "uuid",
  "probability": 60,
  "contactId": "uuid",
  "companyId": "uuid",
  "customFields": {
    "Lead Source": "Referral",
    "Contract Type": "Annual"
  }
}
```

**Response 201**: Created deal with full entity shape

**Error codes**:
- `STAGE_NOT_IN_PIPELINE` — stageId does not belong to pipelineId
- `OWNER_NOT_IN_TENANT` — ownerId not found in tenant
- `CONTACT_NOT_IN_TENANT` / `COMPANY_NOT_IN_TENANT`
- `CUSTOM_FIELD_REQUIRED` — a required custom field was omitted (body includes field name)
- `CUSTOM_FIELD_INVALID_OPTION` — DROPDOWN value not in defined options

---

## PUT /api/v1/deals/{id}/stage

Move a deal to a different stage. Records a `deal_stage_history` entry in the same transaction.

**Auth**: Rep (own deal only), Manager, Admin

**Request body**:
```json
{
  "stageId": "uuid-new-stage",
  "lossReason": "Budget cut"
}
```
(`lossReason` required when `stageId` maps to a `CLOSED_LOST` stage)

**Response 200**: Updated deal entity

**Error codes**:
- `STAGE_NOT_IN_PIPELINE` — target stage not in deal's pipeline
- `DEAL_ARCHIVED` — cannot move an archived deal
- `LOSS_REASON_REQUIRED` — target stage is CLOSED_LOST and lossReason was omitted
- `FORBIDDEN` — Rep attempting to move another user's deal

---

## PUT /api/v1/deals/{id}/close

Explicitly mark a deal as Won or Lost without moving it to a different stage.

**Auth**: Rep (own deal only), Manager, Admin

**Request body**:
```json
{
  "outcome": "WON"
}
```
or
```json
{
  "outcome": "LOST",
  "lossReason": "Chose competitor"
}
```

**Response 200**: Updated deal with new status

**Error codes**:
- `DEAL_ALREADY_CLOSED` — deal status is already WON or LOST
- `LOSS_REASON_REQUIRED` — outcome is LOST and lossReason omitted

---

## GET /api/v1/deals/{id}/stage-history

Retrieve the full stage transition history for a deal in chronological order.

**Auth**: Any role

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "fromStage": null,
      "toStage": { "id": "uuid", "name": "Prospecting" },
      "changedAt": "2026-06-15T09:30:00Z",
      "changedBy": { "id": "uuid", "name": "Jane Smith" }
    },
    {
      "id": "uuid",
      "fromStage": { "id": "uuid", "name": "Prospecting" },
      "toStage": { "id": "uuid", "name": "Qualification" },
      "changedAt": "2026-06-17T14:15:00Z",
      "changedBy": { "id": "uuid", "name": "Jane Smith" }
    }
  ],
  "meta": { "total": 2 },
  "errors": []
}
```

---

## POST /api/v1/deals/{id}/clone (P3)

Clone a deal. Copies all fields except `closeDate` (cleared) and `ownerId` (set to caller).
Name is prefixed with "Copy of".

**Auth**: Rep, Manager, Admin

**Response 201**: New deal entity (same shape as POST /api/v1/deals)

---

## GET /api/v1/deal-custom-fields

List all active custom field definitions for the tenant.

**Auth**: Any role

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Lead Source",
      "fieldType": "DROPDOWN",
      "options": ["Inbound", "Outbound", "Referral", "Event"],
      "isRequired": true,
      "displayOrder": 1,
      "isActive": true
    }
  ],
  "meta": {},
  "errors": []
}
```

---

## DELETE /api/v1/deal-custom-fields/{id}

Soft-delete a custom field definition (sets `isActive = false`). Existing deal JSONB values
are preserved but the field is hidden from all deal forms.

**Auth**: Admin only

**Response 204**

**Error codes**:
- `CUSTOM_FIELD_NOT_FOUND`
