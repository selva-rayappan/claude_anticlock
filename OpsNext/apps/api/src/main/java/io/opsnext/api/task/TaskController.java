package io.opsnext.api.task;

import io.opsnext.api.common.dto.ApiResponse;
import io.opsnext.api.common.dto.PageResponse;
import io.opsnext.api.security.SecurityPrincipal;
import io.opsnext.api.task.dto.TaskRequest;
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
@RequestMapping("/api/v1/tasks")
@RequiredArgsConstructor
@Tag(name = "Tasks")
@SecurityRequirement(name = "bearerAuth")
public class TaskController {

    private final TaskService taskService;

    @GetMapping
    @Operation(summary = "List tasks — filterable by assignee, entity, status, priority; use myTasks=true for current user's tasks")
    public ApiResponse<PageResponse<Map<String, Object>>> list(
        @RequestParam(required = false) String assigneeId,
        @RequestParam(required = false) String entityType,
        @RequestParam(required = false) String entityId,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String priority,
        @RequestParam(defaultValue = "false") boolean myTasks,
        @RequestParam(defaultValue = "false") boolean overdue,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "25") int limit,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(
            taskService.list(assigneeId, entityType, entityId, status, priority, myTasks, overdue, page, limit, principal)
        );
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a task")
    public ApiResponse<Map<String, Object>> create(
        @Valid @RequestBody TaskRequest.Create req,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(taskService.create(req, principal));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get task by ID")
    public ApiResponse<Map<String, Object>> getById(
        @PathVariable String id,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(taskService.getById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a task")
    public ApiResponse<Map<String, Object>> update(
        @PathVariable String id,
        @Valid @RequestBody TaskRequest.Update req,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(taskService.update(id, req, principal));
    }

    @PostMapping("/{id}/complete")
    @Operation(summary = "Mark a task as completed")
    public ApiResponse<Map<String, Object>> complete(
        @PathVariable String id,
        @RequestBody(required = false) TaskRequest.Complete req,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(taskService.complete(id, req != null ? req : new TaskRequest.Complete(null), principal));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a task")
    public void delete(
        @PathVariable String id,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        taskService.delete(id, principal);
    }
}
