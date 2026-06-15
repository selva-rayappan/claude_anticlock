# Feature Template

Use this as a planning checklist when starting a new feature from the execution plan.

---

## Feature: [TASK-XXX — Title]

**Phase:** Phase N — [Phase Name]  
**FRD Requirements:** [e.g., CON-F-01, CON-F-04]  
**Priority:** P1 / P2 / P3  
**Estimated effort:** ~Xd  
**Roles involved:** BE / FE / DBA

---

## Subtasks

Copy from `docs/EXECUTION_PLAN.md` and track status:

| # | Subtask | Status |
|---|---------|--------|
| XXX.1 | | ⏳ |
| XXX.2 | | ⏳ |
| XXX.3 | | ⏳ |

---

## Backend Changes

### New API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/... | TENANT_ADMIN | |
| GET | /api/v1/... | all | |

### New/Modified Files

```
backend/src/main/java/io/opsnext/api/{module}/
├── {Module}Controller.java       [new / modified]
├── {Module}Service.java          [new / modified]
├── {Module}Repository.java       [new / modified]
└── dto/
    ├── Create{Module}Request.java  [new]
    └── {Module}Response.java       [new]
```

### Database Changes

- [ ] New Prisma model in `packages/db/prisma/schema.prisma`
- [ ] Migration file created via `pnpm prisma migrate dev`
- [ ] JPA entity added/updated in `backend/src/main/java/io/opsnext/api/{module}/{Module}.java`
- [ ] Indexes added for common query patterns

### Domain Events Published

```
events:{tenantId}
├── {module}.created
├── {module}.updated
└── {module}.deleted
```

---

## Frontend Changes

### New Pages / Components

```
frontend/src/
├── app/(app)/{route}/
│   └── page.tsx                  [new]
├── components/{module}/
│   ├── {module}-list.tsx         [new]
│   ├── {module}-form.tsx         [new]
│   └── {module}-slideover.tsx    [new]
└── hooks/
    └── use-{module}.ts           [new]
```

### Shared Schema Changes

```
packages/shared/src/schemas/
└── {module}.schema.ts            [new / modified]
```

---

## Tests Required

- [ ] `{Module}ServiceTest.java` — unit tests for all service methods
- [ ] `{Module}ControllerTest.java` — MockMvc integration tests for all endpoints
- [ ] Tenant isolation test — verify tenant A cannot access tenant B records
- [ ] Frontend hook test with MSW mock

---

## Acceptance Criteria

Copied from FRD section [requirement ID]:

> [Paste the FRD requirement text here]

### Definition of Done

- [ ] All subtasks from EXECUTION_PLAN.md implemented
- [ ] All FRD acceptance criteria met
- [ ] All tests passing
- [ ] No `TODO` comments or placeholder implementations
- [ ] Audit log written for all mutations
- [ ] Search sync enqueued for entity mutations
- [ ] RBAC enforced on service methods
- [ ] Reviewed running on localhost
