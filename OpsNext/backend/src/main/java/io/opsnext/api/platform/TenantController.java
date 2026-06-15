package io.opsnext.api.platform;

import io.opsnext.api.common.dto.ApiResponse;
import io.opsnext.api.platform.dto.TenantRegisterRequest;
import io.opsnext.api.platform.entity.Tenant;
import io.opsnext.api.platform.repository.TenantRepository;
import io.opsnext.api.platform.service.TenantProvisioningService;
import io.opsnext.api.security.SecurityPrincipal;
import io.opsnext.api.tenant.TenantContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/platform")
@Tag(name = "Tenant", description = "Tenant registration and management")
@RequiredArgsConstructor
public class TenantController {

    private final TenantProvisioningService provisioningService;
    private final TenantRepository tenantRepository;

    @PostMapping("/tenants/register")
    @Operation(summary = "Register a new organisation / tenant")
    public ResponseEntity<ApiResponse<Map<String, Object>>> register(
        @Valid @RequestBody TenantRegisterRequest req
    ) {
        Map<String, Object> result = provisioningService.provision(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(result));
    }

    @GetMapping("/tenants/check-slug")
    @Operation(summary = "Check organisation slug availability")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkSlug(@RequestParam String slug) {
        Map<String, Object> result = provisioningService.checkSlug(slug);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/tenants/me")
    @Operation(summary = "Get current tenant information")
    public ResponseEntity<ApiResponse<Tenant>> getTenantMe(
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        Tenant tenant = tenantRepository.findByIdAndDeletedAtIsNull(principal.tenantId())
            .orElseThrow(() -> io.opsnext.api.common.exception.AppException.notFound("Tenant"));
        return ResponseEntity.ok(ApiResponse.success(tenant));
    }

    @PutMapping("/tenants/me/branding")
    @Operation(summary = "Update tenant branding")
    public ResponseEntity<ApiResponse<Map<String, String>>> updateBranding(
        @AuthenticationPrincipal SecurityPrincipal principal,
        @RequestBody Map<String, String> body
    ) {
        tenantRepository.findByIdAndDeletedAtIsNull(principal.tenantId()).ifPresent(tenant -> {
            if (tenant.getConfig() != null) {
                if (body.containsKey("primaryColor")) tenant.getConfig().setPrimaryColor(body.get("primaryColor"));
                if (body.containsKey("logoUrl")) tenant.getConfig().setLogoUrl(body.get("logoUrl"));
                tenantRepository.save(tenant);
            }
        });
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Branding updated successfully")));
    }
}
