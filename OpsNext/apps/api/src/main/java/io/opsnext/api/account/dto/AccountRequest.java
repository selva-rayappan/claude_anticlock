package io.opsnext.api.account.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public class AccountRequest {

    public record Create(
        @NotBlank @Size(max = 255) String name,
        String domain,
        String industry,
        String size,
        Long annualRevenue,
        String currency,
        String website,
        String description,
        String source,
        String ownerId,
        List<String> tags,
        String parentAccountId,
        Object address,
        Object customFields
    ) {}

    public record Update(
        String name,
        String domain,
        String industry,
        String size,
        Long annualRevenue,
        String currency,
        String website,
        String description,
        String source,
        String ownerId,
        List<String> tags,
        String parentAccountId,
        Object address,
        Object customFields
    ) {}
}
