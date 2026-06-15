# Prompt: Implement a Feature

Use this prompt when starting work on any task from the execution plan.

---

## Context to Provide

Fill in before sending:

```
Task ID: TASK-XXX
Task Title: [from EXECUTION_PLAN.md]
FRD Requirements: [e.g., CON-F-01, CON-F-04]
Phase: [e.g., Phase 5 — Contact & Account Management]
```

---

## Instruction Template

```
Implement [TASK-XXX — Task Title] from docs/EXECUTION_PLAN.md.

FRD requirements: [FRD IDs from docs/FRD.md]

Before writing any code:
1. Read .claude/architecture-principles.md for non-negotiable rules.
2. Read .claude/coding-standards.md for naming and conventions.
3. Read the task subtasks in docs/EXECUTION_PLAN.md section TASK-XXX.
4. Read the FRD requirements in docs/FRD.md.

Implementation order:
1. Backend: DTO records → Repository → Service (with @PreAuthorize + AuditService.log) → Controller
2. Backend tests: Service unit tests + Controller integration tests
3. Frontend: TanStack Query hook → Component → Form validation (Zod from @opsnext/shared)
4. Frontend: Error / loading states + mobile responsiveness

Constraints:
- All mutations write to audit_logs within the same transaction.
- Soft-delete only — no physical DELETE.
- Search index sync via BullMQ search-sync queue on entity mutations.
- API response must use ApiResponse<T> envelope.
- No PII in log statements.
- No TODO comments or placeholder code.
```

---

## Acceptance Checklist

Before marking the task done, verify:

- [ ] All EXECUTION_PLAN.md subtasks for this task are implemented
- [ ] All FRD acceptance criteria are met
- [ ] Audit log written for every mutation
- [ ] Search sync job enqueued for entity mutations
- [ ] Domain event published to `events:{tenantId}` Redis channel
- [ ] RBAC `@PreAuthorize` annotation on all service mutations
- [ ] No PII in any log statement
- [ ] API response uses `ApiResponse<T>` envelope
- [ ] No physical DELETE queries
- [ ] Migration is additive-only
- [ ] Unit tests pass for service layer
- [ ] Integration tests pass for controller layer
- [ ] Tenant isolation test: tenant A cannot access tenant B records
- [ ] Frontend loads without console errors
- [ ] Mobile layout renders correctly (320px viewport)
