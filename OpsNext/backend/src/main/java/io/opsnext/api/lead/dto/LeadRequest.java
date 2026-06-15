package io.opsnext.api.lead.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class LeadRequest {

    public record Create(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @NotBlank @Email @Size(max = 255) String email,
        String title,
        String company,
        String phone,
        String source,
        String status,
        String ownerId,
        Integer score,
        Object customFields
    ) {}

    public record Update(
        String firstName,
        String lastName,
        @Email String email,
        String title,
        String company,
        String phone,
        String source,
        String status,
        String ownerId,
        Integer score,
        Object customFields
    ) {}

    public record Convert(
        boolean createContact,
        boolean createAccount,
        boolean createOpportunity,
        String accountId,
        String opportunityName,
        String pipelineId,
        String stageId,
        Double dealValue
    ) {}
}
