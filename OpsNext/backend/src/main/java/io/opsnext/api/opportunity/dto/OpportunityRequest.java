package io.opsnext.api.opportunity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class OpportunityRequest {

    public record Create(
        @NotBlank @Size(max = 255) String name,
        String accountId,
        String contactId,
        @NotBlank String pipelineId,
        @NotBlank String stageId,
        Double dealValue,
        String currency,
        String closeDate,
        Integer probability,
        String ownerId,
        Object customFields
    ) {}

    public record Update(
        String name,
        String accountId,
        String contactId,
        String pipelineId,
        String stageId,
        Double dealValue,
        String currency,
        String closeDate,
        Integer probability,
        String ownerId,
        Object customFields
    ) {}

    public record MoveStage(
        @NotBlank String stageId,
        String reason
    ) {}
}
