package io.opsnext.api.platform;

import io.opsnext.api.common.ApiResponse;
import io.opsnext.api.export.DataExportService;
import io.opsnext.api.metrics.TenantMetricsService;
import io.opsnext.api.metrics.TenantMetricsSnapshot;
import io.opsnext.api.tenant.Tenant;
import io.opsnext.api.tenant.TenantStatus;
import io.opsnext.api.tenant.TierName;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/platform")
@RequiredArgsConstructor
public class PlatformController {

    private final TenantProvisioningService provisioningService;
    private final PlatformService platformService;
    private final TenantMetricsService metricsService;
    private final DataExportService exportService;

    // ─── US1: Tenant CRUD ─────────────────────────────────────────────────────

    @PostMapping("/tenants")
    public ResponseEntity<ApiResponse<Tenant>> provisionTenant(
            @Valid @RequestBody ProvisionTenantRequest request,
            @AuthenticationPrincipal UserDetails actor) {
        UUID actorId = UUID.fromString(actor.getUsername()); // username == userId
        Tenant tenant = provisioningService.provision(
                request.slug(), request.displayName(), request.seedAdminEmail(), actorId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(tenant));
    }

    @GetMapping("/tenants")
    public ApiResponse<Page<Tenant>> listTenants(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) TenantStatus status) {
        Page<Tenant> result = platformService.listTenants(page, limit, status);
        return ApiResponse.ok(result, new ApiResponse.PageMeta(
                result.getTotalElements(), page, limit, result.getTotalPages()));
    }

    @GetMapping("/tenants/{id}")
    public ApiResponse<Tenant> getTenant(@PathVariable UUID id) {
        return ApiResponse.ok(platformService.getTenant(id));
    }

    // ─── US2: Suspension & Deactivation ───────────────────────────────────────

    @PostMapping("/tenants/{id}/suspend")
    public ApiResponse<Tenant> suspendTenant(@PathVariable UUID id,
                                              @AuthenticationPrincipal UserDetails actor) {
        UUID actorId = UUID.fromString(actor.getUsername());
        return ApiResponse.ok(platformService.suspendTenant(id, actorId));
    }

    @PostMapping("/tenants/{id}/reactivate")
    public ApiResponse<Tenant> reactivateTenant(@PathVariable UUID id,
                                                 @AuthenticationPrincipal UserDetails actor) {
        UUID actorId = UUID.fromString(actor.getUsername());
        return ApiResponse.ok(platformService.reactivateTenant(id, actorId));
    }

    @PostMapping("/tenants/{id}/deactivate")
    public ApiResponse<Tenant> deactivateTenant(@PathVariable UUID id,
                                                 @RequestBody Map<String, Object> body,
                                                 @AuthenticationPrincipal UserDetails actor) {
        if (!Boolean.TRUE.equals(body.get("confirm"))) {
            throw new IllegalArgumentException("Deactivation requires confirm: true");
        }
        UUID actorId = UUID.fromString(actor.getUsername());
        return ApiResponse.ok(platformService.deactivateTenant(id, actorId));
    }

    // ─── US3: Metrics ─────────────────────────────────────────────────────────

    @GetMapping("/metrics")
    public ApiResponse<List<TenantMetricsSnapshot>> getAllMetrics() {
        return ApiResponse.ok(metricsService.getAllMetrics());
    }

    @GetMapping("/tenants/{id}/metrics")
    public ApiResponse<TenantMetricsSnapshot> getTenantMetrics(@PathVariable UUID id) {
        return ApiResponse.ok(metricsService.getMetrics(id));
    }

    // ─── US4: Tier management ─────────────────────────────────────────────────

    @PutMapping("/tenants/{id}/tier")
    public ApiResponse<Tenant> updateTier(@PathVariable UUID id,
                                           @RequestBody Map<String, String> body,
                                           @AuthenticationPrincipal UserDetails actor) {
        TierName newTier = TierName.valueOf(body.get("tier"));
        UUID actorId = UUID.fromString(actor.getUsername());
        return ApiResponse.ok(platformService.updateTier(id, newTier, actorId));
    }

    // ─── US5: Data Export ─────────────────────────────────────────────────────

    @PostMapping("/tenants/{id}/export")
    public ApiResponse<Map<String, String>> triggerExport(@PathVariable UUID id,
                                                           @AuthenticationPrincipal UserDetails actor) {
        UUID actorId = UUID.fromString(actor.getUsername());
        UUID jobId = exportService.triggerExport(id, actorId);
        return ApiResponse.ok(Map.of("jobId", jobId.toString()));
    }

    @GetMapping("/tenants/{id}/export/{jobId}")
    public ApiResponse<io.opsnext.api.export.DataExportJob> getExportStatus(
            @PathVariable UUID id, @PathVariable UUID jobId) {
        return ApiResponse.ok(exportService.getJobStatus(jobId));
    }
}
