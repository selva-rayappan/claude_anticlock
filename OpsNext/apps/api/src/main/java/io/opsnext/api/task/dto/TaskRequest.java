package io.opsnext.api.task.dto;

import jakarta.validation.constraints.NotBlank;

public class TaskRequest {

    public record Create(
        @NotBlank String title,
        String description,
        String entityType,
        String entityId,
        String assigneeId,
        String dueDate,
        String priority,
        String status
    ) {}

    public record Update(
        String title,
        String description,
        String assigneeId,
        String dueDate,
        String priority,
        String status
    ) {}

    public record Complete(
        String completionNote
    ) {}
}
