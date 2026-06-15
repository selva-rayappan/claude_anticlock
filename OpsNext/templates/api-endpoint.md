# API Endpoint Template

Reference implementation for a new REST endpoint in `backend/`.

Replace `{Resource}` / `{resource}` with the actual entity name (e.g., `Contact` / `contact`).

---

## 1. Request DTO

```java
// backend/src/main/java/io/opsnext/api/{module}/dto/Create{Resource}Request.java
package io.opsnext.api.{module}.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record Create{Resource}Request(
    @NotBlank @Size(max = 100)
    String firstName,

    @NotBlank @Size(max = 100)
    String lastName,

    @Email @NotBlank
    String email,

    String ownerId  // nullable — defaults to current user
) {}
```

---

## 2. Response DTO

```java
// backend/src/main/java/io/opsnext/api/{module}/dto/{Resource}Response.java
package io.opsnext.api.{module}.dto;

import java.time.Instant;

public record {Resource}Response(
    String id,
    String firstName,
    String lastName,
    String email,
    String ownerId,
    Instant createdAt,
    Instant updatedAt
) {
    public static {Resource}Response from({Resource} entity) {
        return new {Resource}Response(
            entity.getId(),
            entity.getFirstName(),
            entity.getLastName(),
            entity.getEmail(),
            entity.getOwnerId(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }
}
```

---

## 3. Repository

```java
// backend/src/main/java/io/opsnext/api/{module}/{Resource}Repository.java
package io.opsnext.api.{module};

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface {Resource}Repository
    extends JpaRepository<{Resource}, String>, JpaSpecificationExecutor<{Resource}> {

    boolean existsByEmailAndDeletedAtIsNull(String email);

    Optional<{Resource}> findByIdAndDeletedAtIsNull(String id);
}
```

---

## 4. Service

```java
// backend/src/main/java/io/opsnext/api/{module}/{Resource}Service.java
package io.opsnext.api.{module};

import io.opsnext.api.common.dto.ApiResponse;
import io.opsnext.api.common.exception.AppException;
import io.opsnext.api.audit.AuditService;
import io.opsnext.api.security.SecurityPrincipal;
import io.opsnext.api.{module}.dto.Create{Resource}Request;
import io.opsnext.api.{module}.dto.{Resource}Response;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class {Resource}Service {

    private final {Resource}Repository repository;
    private final AuditService auditService;
    private final SearchSyncQueue searchSyncQueue;
    private final TenantEventBus eventBus;

    @Transactional
    @PreAuthorize("hasAnyRole('TENANT_ADMIN', 'SALES_MANAGER', 'SALES_REP')")
    public {Resource}Response create(Create{Resource}Request request, SecurityPrincipal principal) {
        if (repository.existsByEmailAndDeletedAtIsNull(request.email())) {
            throw AppException.conflict("{Resource} with email already exists");
        }

        {Resource} entity = new {Resource}();
        entity.setFirstName(request.firstName());
        entity.setLastName(request.lastName());
        entity.setEmail(request.email());
        entity.setOwnerId(request.ownerId() != null ? request.ownerId() : principal.getUserId());

        {Resource} saved = repository.save(entity);

        auditService.log("{RESOURCE}", saved.getId(), AuditAction.CREATE, principal.getUserId(), null, saved);
        searchSyncQueue.enqueue(SearchSyncJob.upsert("{resource}", saved.getId()));
        eventBus.publish(TenantEvent.of("{resource}.created", saved, principal));

        return {Resource}Response.from(saved);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('TENANT_ADMIN', 'SALES_MANAGER', 'SALES_REP', 'READ_ONLY')")
    public {Resource}Response findById(String id, SecurityPrincipal principal) {
        return repository.findByIdAndDeletedAtIsNull(id)
            .map({Resource}Response::from)
            .orElseThrow(() -> AppException.notFound("{Resource} not found"));
    }
}
```

---

## 5. Controller

```java
// backend/src/main/java/io/opsnext/api/{module}/{Resource}Controller.java
package io.opsnext.api.{module};

import io.opsnext.api.common.dto.ApiResponse;
import io.opsnext.api.security.SecurityPrincipal;
import io.opsnext.api.{module}.dto.Create{Resource}Request;
import io.opsnext.api.{module}.dto.{Resource}Response;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/{resources}")
@RequiredArgsConstructor
public class {Resource}Controller {

    private final {Resource}Service service;

    @PostMapping
    public ResponseEntity<ApiResponse<{Resource}Response>> create(
        @RequestBody @Valid Create{Resource}Request request,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(service.create(request, principal)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<{Resource}Response>> getById(
        @PathVariable String id,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.success(service.findById(id, principal)));
    }
}
```

---

## 6. Tests

```java
// backend/src/test/java/io/opsnext/api/{module}/{Resource}ServiceTest.java
@ExtendWith(MockitoExtension.class)
class {Resource}ServiceTest {

    @Mock {Resource}Repository repository;
    @Mock AuditService auditService;
    @Mock SearchSyncQueue searchSyncQueue;
    @Mock TenantEventBus eventBus;

    @InjectMocks {Resource}Service service;

    @Test
    void create_withValidRequest_returnsResponse() { ... }

    @Test
    void create_withDuplicateEmail_throwsConflict() { ... }
}
```
