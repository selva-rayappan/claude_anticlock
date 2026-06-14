package io.opsnext.api.activity;

import io.opsnext.api.activity.dto.ActivityRequest;
import io.opsnext.api.common.dto.ApiResponse;
import io.opsnext.api.common.dto.PageResponse;
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
@RequestMapping("/api/v1/activities")
@RequiredArgsConstructor
@Tag(name = "Activities")
@SecurityRequirement(name = "bearerAuth")
public class ActivityController {

    private final ActivityService activityService;

    @GetMapping
    @Operation(summary = "List activities, optionally filtered by entity type and ID")
    public ApiResponse<PageResponse<Map<String, Object>>> list(
        @RequestParam(required = false) String entityType,
        @RequestParam(required = false) String entityId,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "25") int limit,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(activityService.list(entityType, entityId, page, limit, principal));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Log a new activity (call, email, meeting, note)")
    public ApiResponse<Map<String, Object>> create(
        @Valid @RequestBody ActivityRequest.Create req,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(activityService.create(req, principal));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete an activity")
    public void delete(
        @PathVariable String id,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        activityService.delete(id, principal);
    }
}
