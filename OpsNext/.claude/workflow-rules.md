# Workflow Rules

## Phase Gate Process

Work proceeds through numbered phases (see [`docs/EXECUTION_PLAN.md`](../docs/EXECUTION_PLAN.md)). Each phase must be:

1. **Fully implemented** — all subtasks complete, no stubs or placeholders.
2. **Reviewed on localhost** — the user reviews the running application.
3. **Approved** — explicit sign-off before the next phase begins.

**Never start Phase N+1 tasks while Phase N is in review or incomplete.** If asked to skip ahead, flag it.

---

## Implementing a Feature

Use the prompt template: [`.claude/prompts/implement-feature.md`](prompts/implement-feature.md)

### Checklist

1. **Locate the task** in [`docs/EXECUTION_PLAN.md`](../docs/EXECUTION_PLAN.md) — note the task ID (e.g., `TASK-024`) and linked FRD requirement (e.g., `CON-F-01`).
2. **Read the FRD requirement** in [`docs/FRD.md`](../docs/FRD.md) to understand acceptance criteria.
3. **Backend first** — implement and test the API endpoint(s) before touching the frontend.
4. **Audit all mutations** — service methods that CREATE/UPDATE/DELETE must call `AuditService.log()`.
5. **Write to search index** — entity mutations must enqueue a `search-sync` BullMQ job.
6. **Emit domain events** — publish to `events:{tenantId}` Redis channel after successful mutations.
7. **Frontend second** — build the UI component(s) once API is confirmed working.
8. **No orphaned code** — remove any stubs, `TODO` comments, or placeholder data.

---

## Implementing a Backend API Endpoint

Use the prompt template: [`.claude/prompts/create-api.md`](prompts/create-api.md)

Order of implementation for each endpoint:
1. DTO records (request + response) in `dto/` package
2. Repository method (Spring Data JPA)
3. Service method with `@Transactional`, `@PreAuthorize`, audit write
4. Controller method returning `ResponseEntity<ApiResponse<T>>`
5. Unit tests for service (mock repo)
6. Integration test for controller (MockMvc + real schema)

---

## Implementing a UI Component / Page

Use the prompt template: [`.claude/prompts/create-ui.md`](prompts/create-ui.md)

Order of implementation:
1. TanStack Query hook (`useQuery` / `useMutation`) calling the API
2. Server Component or Client Component skeleton
3. shadcn/ui composition (use existing `src/components/ui/` — do not add new UI primitives without need)
4. Form with React Hook Form + Zod schema from `@opsnext/shared`
5. Error and loading states
6. Mobile responsiveness check

---

## Bug Fix

Use the prompt template: [`.claude/prompts/fix-bug.md`](prompts/fix-bug.md)

1. Reproduce the bug — write a failing test or document the reproduction steps.
2. Find the root cause — do not patch symptoms.
3. Fix the minimum required code.
4. Verify the test passes.
5. Check for other instances of the same root cause.

---

## Refactoring

Use the prompt template: [`.claude/prompts/refactor.md`](prompts/refactor.md)

Rules:
- Refactoring must not change observable behaviour.
- Must have passing tests before and after.
- Do not refactor outside the scope of the current task.
- Do not introduce new abstractions unless they reduce duplication across 3+ call sites.

---

## Testing Requirements

| Layer | Minimum Required |
|-------|-----------------|
| Service unit tests | All business logic paths, including error cases |
| Controller integration tests | All endpoints (happy path + validation errors) |
| Multi-tenancy tests | Prove tenant A cannot access tenant B data |
| Frontend | TanStack Query hook tested with `msw` mocks |

Tests live next to the code:
- Java: `backend/src/test/java/io/opsnext/api/{module}/`
- Frontend: `frontend/src/__tests__/{module}/` or collocated `*.test.tsx`

---

## Code Review Standards

Before marking any task done, verify:

- [ ] No raw entity objects in API responses (map to DTO)
- [ ] All mutations write to `audit_logs`
- [ ] Soft-delete pattern used (not physical DELETE)
- [ ] RBAC `@PreAuthorize` annotation on service method
- [ ] No PII in log statements
- [ ] Search index sync enqueued for entity mutations
- [ ] No `TODO` comments or stub implementations
- [ ] Response uses `ApiResponse<T>` envelope
- [ ] Migration is additive-only (no DROP or RENAME in single migration)

---

## Environment Variables

- Never commit `.env` files — `.env.example` files are the source of truth.
- Add new env vars to the appropriate `.env.example` with a descriptive comment.
- All env vars are validated at startup via the Zod env schema in `packages/config/src/env.ts`.

---

## Git Conventions

- Branch names: `phase-{N}/{task-id}-{short-description}` (e.g., `phase-3/task-015-jwt-refresh`)
- Commit messages: Conventional Commits format (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`)
- One logical change per commit.
- Do not commit directly to `main`; use PRs with at least one review.
