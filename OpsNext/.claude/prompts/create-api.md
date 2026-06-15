# Prompt: Create an API Endpoint

Use this when adding a new REST endpoint to the Spring Boot API (`backend/`).

---

## Instruction Template

```
Create a [HTTP_METHOD] /api/v1/[resource-path] endpoint in the backend.

Purpose: [one sentence — what this endpoint does]
Module: [Java package — e.g., io.opsnext.api.contact]
Auth required: [yes/no] — if yes, roles: [TENANT_ADMIN / SALES_MANAGER / SALES_REP / READ_ONLY]
Tenant-scoped: [yes/no]

Request body (if applicable):
[describe fields, types, validation rules]

Response:
[describe the data returned]

Business rules:
[list any domain rules — e.g., "duplicate detection on email", "must belong to current tenant"]

FRD reference: [e.g., CON-F-01]
```

---

## Standard Implementation Order

1. **Request DTO** — Java record with Bean Validation annotations in `dto/{Resource}Request.java`
2. **Response DTO** — Java record in `dto/{Resource}Response.java` (never expose entity directly)
3. **Repository** — add query method to `{Resource}Repository.java` if needed
4. **Service method** with:
   - `@Transactional` (for mutations)
   - `@PreAuthorize("hasAnyRole('TENANT_ADMIN', 'SALES_MANAGER')")` or appropriate role check
   - Ownership scope filter if `SALES_REP` role: `WHERE owner_id = currentUserId`
   - `auditService.log(entityType, entityId, action, userId, before, after)` for mutations
   - BullMQ `search-sync` job enqueue for entity mutations
   - Redis Pub/Sub event publish for domain events
5. **Controller method** returning `ResponseEntity<ApiResponse<{Resource}Response>>`
6. **Unit test** — test service with mocked repository, cover: happy path, validation error, not found, 403 forbidden
7. **Integration test** — MockMvc test hitting the real controller, verify response shape

---

## Code Pattern Reference

### Controller

```java
@PostMapping
public ResponseEntity<ApiResponse<ContactResponse>> createContact(
    @RequestBody @Valid CreateContactRequest request,
    @AuthenticationPrincipal SecurityPrincipal principal
) {
    ContactResponse response = contactService.create(request, principal);
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.success(response));
}
```

### Service

```java
@Transactional
@PreAuthorize("hasAnyRole('TENANT_ADMIN', 'SALES_MANAGER', 'SALES_REP')")
public ContactResponse create(CreateContactRequest request, SecurityPrincipal principal) {
    // validate, build entity, save
    Contact saved = contactRepository.save(contact);
    auditService.log("CONTACT", saved.getId(), AuditAction.CREATE, principal.getUserId(), null, saved);
    searchSyncQueue.enqueue(SearchSyncJob.upsert("contact", saved.getId()));
    eventBus.publish(TenantEvent.contactCreated(saved, principal));
    return ContactResponse.from(saved);
}
```

---

## Constraints

- Never return a JPA entity object in the response — always map to a DTO.
- Never pass `tenantId` as a WHERE clause — the schema `search_path` provides isolation.
- Cursor-based pagination for list endpoints (`nextCursor`, `total` in `meta`).
- Use `AppException` for domain errors — `GlobalExceptionHandler` maps to HTTP status.
- Rate-limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) are added by API gateway, not the controller.
