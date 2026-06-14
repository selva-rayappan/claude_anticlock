package io.opsnext.api.platform.dto;

import jakarta.validation.constraints.*;

public record TenantRegisterRequest(
    @NotBlank @Size(min = 2, max = 100) String orgName,
    String slug,
    @NotBlank @Email String adminEmail,
    @NotBlank @Size(min = 8) String adminPassword,
    @NotBlank String adminFirstName,
    @NotBlank String adminLastName,
    String timezone,
    String currency,
    String plan
) {}
