package io.opsnext.api.contact;

import io.opsnext.api.common.dto.ApiResponse;
import io.opsnext.api.common.dto.PageResponse;
import io.opsnext.api.contact.dto.ContactRequest;
import io.opsnext.api.security.SecurityPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/contacts")
@RequiredArgsConstructor
@Tag(name = "Contacts")
@SecurityRequirement(name = "bearerAuth")
public class ContactController {

    private final ContactService contactService;

    @GetMapping
    @Operation(summary = "List contacts with pagination, search, and filters")
    public ApiResponse<PageResponse<Map<String, Object>>> list(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "25") int limit,
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String ownerId,
        @RequestParam(required = false) String accountId,
        @RequestParam(defaultValue = "created_at") String sort,
        @RequestParam(defaultValue = "desc") String order,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(
            contactService.list(page, limit, search, ownerId, accountId, sort, order, principal)
        );
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new contact")
    public ApiResponse<Map<String, Object>> create(
        @Valid @RequestBody ContactRequest.Create req,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(contactService.create(req, principal));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get contact by ID")
    public ApiResponse<Map<String, Object>> getById(
        @PathVariable String id,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(contactService.getById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a contact")
    public ApiResponse<Map<String, Object>> update(
        @PathVariable String id,
        @Valid @RequestBody ContactRequest.Update req,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(contactService.update(id, req, principal));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a contact (soft delete)")
    public void delete(
        @PathVariable String id,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        contactService.delete(id, principal);
    }
}
