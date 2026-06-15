package io.opsnext.api.auth.dto;

import java.util.List;

public record LoginResponse(
    String accessToken,
    UserInfo user
) {
    public record UserInfo(
        String id,
        String email,
        String firstName,
        String lastName,
        List<String> roles,
        String tenantId,
        String tier
    ) {}
}
