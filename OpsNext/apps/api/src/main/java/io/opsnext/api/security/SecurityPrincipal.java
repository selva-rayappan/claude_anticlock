package io.opsnext.api.security;

import java.util.List;

public record SecurityPrincipal(
    String userId,
    String tenantId,
    String email,
    List<String> roles,
    String tier,
    String jti
) {}
