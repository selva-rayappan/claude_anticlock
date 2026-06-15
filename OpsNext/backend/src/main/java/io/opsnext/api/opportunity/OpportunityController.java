package io.opsnext.api.opportunity;

import io.opsnext.api.common.dto.ApiResponse;
import io.opsnext.api.common.dto.PageResponse;
import io.opsnext.api.opportunity.dto.OpportunityRequest;
import io.opsnext.api.security.SecurityPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/opportunities")
@RequiredArgsConstructor
@Tag(name = "Opportunities")
@SecurityRequirement(name = "bearerAuth")
public class OpportunityController {

    private final OpportunityService opportunityService;

    @GetMapping
    @Operation(summary = "List opportunities")
    public ApiResponse<PageResponse<Map<String, Object>>> list(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "25") int limit,
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String ownerId,
        @RequestParam(required = false) String pipelineId,
        @RequestParam(required = false) String stageId,
        @RequestParam(defaultValue = "created_at") String sort,
        @RequestParam(defaultValue = "desc") String order,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(
            opportunityService.list(page, limit, search, ownerId, pipelineId, stageId, sort, order, principal)
        );
    }

    @GetMapping("/pipeline/{pipelineId}/kanban")
    @Operation(summary = "Get all opportunities for Kanban board grouped by stage")
    public ApiResponse<List<Map<String, Object>>> kanban(
        @PathVariable String pipelineId,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(opportunityService.listByPipeline(pipelineId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new opportunity")
    public ApiResponse<Map<String, Object>> create(
        @Valid @RequestBody OpportunityRequest.Create req,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(opportunityService.create(req, principal));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get opportunity by ID")
    public ApiResponse<Map<String, Object>> getById(
        @PathVariable String id,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(opportunityService.getById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an opportunity")
    public ApiResponse<Map<String, Object>> update(
        @PathVariable String id,
        @Valid @RequestBody OpportunityRequest.Update req,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(opportunityService.update(id, req, principal));
    }

    @PutMapping("/{id}/stage")
    @Operation(summary = "Move opportunity to a different pipeline stage")
    public ApiResponse<Map<String, Object>> moveStage(
        @PathVariable String id,
        @Valid @RequestBody OpportunityRequest.MoveStage req,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(opportunityService.moveStage(id, req, principal));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete an opportunity (soft delete)")
    public void delete(
        @PathVariable String id,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        opportunityService.delete(id, principal);
    }
}
