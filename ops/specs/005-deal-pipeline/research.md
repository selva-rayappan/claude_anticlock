# Research: Deal & Pipeline Management

**Feature**: `005-deal-pipeline`
**Date**: 2026-06-15
**Status**: Complete — no NEEDS CLARIFICATION markers remained in spec or plan

---

## Decision 1: Drag-and-Drop Library

**Decision**: Use `@dnd-kit/core` + `@dnd-kit/sortable` for the Kanban board.

**Rationale**: `@dnd-kit` is the current de-facto standard for accessible drag-and-drop in
React 19. It supports keyboard navigation (WAI-ARIA), has no peer-dependency on a specific
React version, and is actively maintained. The sortable preset handles the column→column
card movement pattern directly.

**Alternatives considered**:
- `react-beautiful-dnd` — archived/unmaintained; last release 2022; not recommended for new projects.
- Native HTML5 Drag-and-Drop API — no accessible keyboard support; inconsistent cross-browser behaviour on touch.
- `react-dnd` — lower-level; requires more boilerplate for the Kanban column pattern.

---

## Decision 2: Custom Field Storage — JSONB vs EAV Table

**Decision**: Store custom field values as JSONB in a `custom_fields` column on the `deal`
table.

**Rationale**: The EAV (Entity–Attribute–Value) pattern with a separate `deal_custom_field_value`
table creates join complexity and makes queries unwieldy. PostgreSQL 16 JSONB with GIN indexing
supports fast key-existence and value queries. Because deals are always fetched by pipeline/stage
(filtered set), full-scan JSONB queries are not a concern. The schema stays simple.

**Alternatives considered**:
- EAV table (`deal_custom_field_value(deal_id, field_id, value_text, value_number, ...)`) — more
  normalised but requires a wide union or pivot query to reconstruct a deal; complex to sort/filter
  by custom field values.
- Separate typed columns (one column per custom field) — impossible at schema time for
  admin-defined fields; requires DDL on every new field definition.

---

## Decision 3: Stage History — Immutability Pattern

**Decision**: `deal_stage_history` is an append-only table with no update or delete endpoints.

**Rationale**: Stage history is a compliance and coaching artefact. Once recorded, it must
not be editable by any user role, including Tenant Admin. The table has no `updated_at`
column and the API exposes no `PUT` or `DELETE` endpoints for history records. History rows
are written inside the same database transaction as the `deal.stage_id` update to guarantee
consistency.

**Alternatives considered**:
- Soft-delete pattern — still allows logical deletion; rejected to prevent any route to history loss.
- Event sourcing (full event stream) — architecturally heavier than required for Phase 1;
  may be revisited when the Reporting feature requires time-series pipeline analytics.

---

## Decision 4: Kanban Board Data Shape

**Decision**: A dedicated `/api/v1/deals/kanban` endpoint returns a pre-grouped payload:
`{ stages: [{ stageId, stageName, deals: [DealCard] }] }`.

**Rationale**: Fetching the full deal list and grouping client-side is wasteful for 500+
deals; the API can apply the tenant-filter and group by stage in a single query. A
`DealCard` projection (id, name, value, currency, closeDate, ownerName, ownerAvatarUrl,
probability, weightedValue) is lighter than the full Deal entity and fits the card display
requirements without over-fetching.

**Alternatives considered**:
- Client-side grouping from `GET /api/v1/deals?status=OPEN` — works but transfers unnecessary
  field data; pagination conflicts with the "all columns visible" Kanban requirement.
- WebSocket push for real-time board — deferred to Phase 2; polling (`refetchInterval: 30s`)
  is sufficient for Phase 1.

---

## Decision 5: Revenue Target Progress Calculation

**Decision**: Revenue target progress is calculated server-side at query time by summing
`deal.value` where `status = WON` and `close_date` falls within the target period. No
pre-aggregated progress column is stored.

**Rationale**: Won deal values are immutable once set; a live `SUM()` query on the filtered
deals set is O(n) on Won deals for the period — acceptable at Phase 1 scale (< 10,000 Won
deals per pipeline per quarter). A cached materialised view may be introduced in the
Reporting feature if query time degrades.

**Alternatives considered**:
- Materialised view refreshed on deal Won event — adds trigger complexity without benefit
  at current scale.
- Redis increment counter — requires careful invalidation; overkill for a < 100 ms query.

---

## Decision 6: Single Currency per Tenant (Phase 1)

**Decision**: Currency is a tenant-level setting (stored in `tenant` table as `default_currency
CHAR(3)`). All monetary values (deal value, pipeline weighted value, revenue targets) use
this currency. Multi-currency is deferred.

**Rationale**: Multi-currency requires exchange rate management, rounding rules, and display
formatting complexity that is not requested in the current spec. Defaulting to a single tenant
currency keeps the data model clean and the weighted-value calculation straightforward.

**Alternatives considered**:
- Per-deal currency with conversion to display currency — requires an exchange rate API
  integration and FX risk considerations; deferred to Phase 3 integration work.
