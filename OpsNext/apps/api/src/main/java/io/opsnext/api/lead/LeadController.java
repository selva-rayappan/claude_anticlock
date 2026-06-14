package io.opsnext.api.lead;

import io.opsnext.api.common.dto.ApiResponse;
import io.opsnext.api.common.dto.PageResponse;
import io.opsnext.api.lead.dto.LeadRequest;
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
@RequestMapping("/api/v1/leads")
@RequiredArgsConstructor
@Tag(name = "Leads")
@SecurityRequirement(name = "bearerAuth")
public class LeadController {

    private final LeadService leadService;

    @GetMapping
    @Operation(summary = "List leads")
    public ApiResponse<PageResponse<Map<String, Object>>> list(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "25") int limit,
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String ownerId,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "created_at") String sort,
        @RequestParam(defaultValue = "desc") String order,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(
            leadService.list(page, limit, search, ownerId, status, sort, order, principal)
        );
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new lead")
    public ApiResponse<Map<String, Object>> create(
        @Valid @RequestBody LeadRequest.Create req,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(leadService.create(req, principal));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get lead by ID")
    public ApiResponse<Map<String, Object>> getById(
        @PathVariable String id,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(leadService.getById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a lead")
    public ApiResponse<Map<String, Object>> update(
        @PathVariable String id,
        @Valid @RequestBody LeadRequest.Update req,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(leadService.update(id, req, principal));
    }

    @PostMapping("/{id}/convert")
    @Operation(summary = "Convert lead to Contact, Account, and/or Opportunity")
    public ApiResponse<Map<String, Object>> convert(
        @PathVariable String id,
        @Valid @RequestBody LeadRequest.Convert req,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(leadService.convert(id, req, principal));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a lead (soft delete)")
    public void delete(
        @PathVariable String id,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        leadService.delete(id, principal);
    }
}
