# Prompt: Fix a Bug

Use this when investigating and resolving a defect.

---

## Instruction Template

```
Fix bug: [one-sentence description]

Symptoms:
[What the user sees / what the system does wrong]

Reproduction steps:
1.
2.
3.

Expected behaviour:
[What should happen]

Actual behaviour:
[What happens instead]

Error messages / stack traces:
[Paste relevant logs, HTTP responses, console errors]

Suspected location:
[File path, class name, or component if known]
```

---

## Investigation Process

Before writing any fix:

1. **Reproduce first.** Write a failing test that captures the bug — or document the exact reproduction steps if UI-only.
2. **Find the root cause.** Do not patch symptoms. Trace the call stack from the error to the source.
3. **Check for siblings.** Search for the same pattern elsewhere in the codebase — one bug often has cousins.
4. **Fix minimally.** Change only what is needed to resolve the root cause.
5. **Verify.** The failing test must now pass. Existing tests must still pass.

---

## Common Bug Categories in OpsNext

### Tenant Isolation Bug

**Symptom:** User sees data from another tenant.  
**Root cause:** Missing `TenantContext` setup, or a query that bypasses the schema routing.  
**Fix pattern:** Ensure `JwtAuthFilter` has set `TenantContext` before the service method runs; verify `search_path` is set per request.

### Audit Log Missing

**Symptom:** A mutation is not appearing in the audit log.  
**Root cause:** `auditService.log()` not called in the service method, or called outside the transaction boundary.  
**Fix pattern:** Call `auditService.log()` within `@Transactional` service method, before the method returns.

### Soft Delete Leak

**Symptom:** Deleted records appear in list results.  
**Root cause:** Missing `deletedAt IS NULL` filter in query / JPA `@Where` annotation missing.  
**Fix pattern:** Add `where: { deletedAt: null }` to Prisma query or `@Where(clause = "deleted_at IS NULL")` to JPA entity.

### RBAC Not Enforced

**Symptom:** A user with insufficient role can perform an action.  
**Root cause:** `@PreAuthorize` missing on service method, or wrong role names in annotation.  
**Fix pattern:** Add `@PreAuthorize("hasAnyRole('TENANT_ADMIN', 'SALES_MANAGER')")` on the service method.

### Stale Search Index

**Symptom:** Search returns stale data after an update.  
**Root cause:** `search-sync` BullMQ job not enqueued after mutation.  
**Fix pattern:** Add `searchSyncQueue.enqueue(SearchSyncJob.upsert(...))` after the repository save.

---

## Constraints

- Never use `@SuppressWarnings` or equivalent to hide the bug.
- Never add a try-catch that swallows the exception — fix the cause.
- Never add a null check without understanding why null is possible.
- Document the root cause in the commit message, not in a code comment.
