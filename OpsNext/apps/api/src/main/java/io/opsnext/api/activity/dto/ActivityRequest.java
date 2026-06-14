package io.opsnext.api.activity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class ActivityRequest {

    public record Create(
        @NotNull String entityType,
        @NotNull String entityId,
        @NotBlank String type,
        @NotBlank String subject,
        String description,
        String outcome,
        String scheduledAt,
        String completedAt,
        Integer durationMinutes
    ) {}
}
