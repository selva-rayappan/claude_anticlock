package io.opsnext.api.platform;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ProvisionTenantRequest(
        @NotBlank
        @Size(min = 3, max = 63)
        @Pattern(regexp = "^[a-z0-9][a-z0-9-]*[a-z0-9]$",
                message = "Slug must be lowercase alphanumeric with hyphens, not starting or ending with hyphen")
        String slug,

        @NotBlank @Size(min = 2, max = 200)
        String displayName,

        @NotBlank @Email
        String seedAdminEmail
) {}
