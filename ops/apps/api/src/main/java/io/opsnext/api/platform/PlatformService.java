package io.opsnext.api.platform;

import io.opsnext.api.audit.PlatformAuditLogger;
import io.opsnext.api.tenant.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class PlatformService {

    private final TenantRepository tenantRepository;
    private final TierDefinitionRepository tierDefinitionRepository;
    private final StringRedisTemplate redis;
    private final PlatformAuditLogger auditLogger;

    // ─── US1: Tenant list ──────────────────────────────────────────────────────

    public Page<Tenant> listTenants(int page, int size, TenantStatus statusFilter) {
        PageRequest pageable = PageRequest.of(page, size);
        if (statusFilter != null) {
            return tenantRepository.findByStatus(statusFilter, pageable);
        }
        return tenantRepository.findAll(pageable);
    }

    public Tenant getTenant(UUID id) {
        return tenantRepository.findById(id)
                .orElseThrow(() -> new TenantNotFoundException(id));
    }

    // ─── US2: Suspension & deactivation ───────────────────────────────────────

    @Transactional
    public Tenant suspendTenant(UUID tenantId, UUID actorId) {
        long start = System.currentTimeMillis();
        Tenant tenant = requireTenant(tenantId);

        tenant.setStatus(TenantStatus.SUSPENDED);
        tenant.setSuspendedAt(OffsetDateTime.now());
        tenantRepository.save(tenant);

        // Publish Redis event so all API nodes can clear tenant session cache
        redis.convertAndSend("tenant:suspended:" + tenantId, tenantId.toString());
        // Cache suspension status (30s TTL so auth filter avoids DB hit per request)
        redis.opsForValue().set("tenant:status:" + tenantId, "SUSPENDED", 30, TimeUnit.SECONDS);

        auditLogger.log(PlatformAuditLogger.Operation.TENANT_SUSPENDED, actorId, tenantId,
                System.currentTimeMillis() - start);
        return tenant;
    }

    @Transactional
    public Tenant reactivateTenant(UUID tenantId, UUID actorId) {
        long start = System.currentTimeMillis();
        Tenant tenant = requireTenant(tenantId);

        tenant.setStatus(TenantStatus.ACTIVE);
        tenant.setSuspendedAt(null);
        tenantRepository.save(tenant);

        redis.delete("tenant:status:" + tenantId);

        auditLogger.log(PlatformAuditLogger.Operation.TENANT_REACTIVATED, actorId, tenantId,
                System.currentTimeMillis() - start);
        return tenant;
    }

    @Transactional
    public Tenant deactivateTenant(UUID tenantId, UUID actorId) {
        long start = System.currentTimeMillis();
        Tenant tenant = requireTenant(tenantId);

        tenant.setStatus(TenantStatus.DEACTIVATED);
        tenant.setDeactivatedAt(OffsetDateTime.now());
        tenantRepository.save(tenant);

        redis.convertAndSend("tenant:suspended:" + tenantId, tenantId.toString());
        redis.opsForValue().set("tenant:status:" + tenantId, "DEACTIVATED", 30, TimeUnit.SECONDS);

        auditLogger.log(PlatformAuditLogger.Operation.TENANT_DEACTIVATED, actorId, tenantId,
                System.currentTimeMillis() - start);
        return tenant;
    }

    // ─── US4: Tier management ─────────────────────────────────────────────────

    @Transactional
    public Tenant updateTier(UUID tenantId, TierName newTier, UUID actorId) {
        long start = System.currentTimeMillis();
        Tenant tenant = requireTenant(tenantId);

        TierName oldTier = tenant.getTier();
        tenant.setTier(newTier);
        tenantRepository.save(tenant);

        // Invalidate tier config cache so enforcement picks up new limits immediately
        redis.delete("tenant:tier:" + tenantId);

        auditLogger.log(PlatformAuditLogger.Operation.TIER_CHANGED, actorId, tenantId,
                System.currentTimeMillis() - start, "newTier", newTier + " (was " + oldTier + ")");
        return tenant;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private Tenant requireTenant(UUID id) {
        return tenantRepository.findById(id)
                .orElseThrow(() -> new TenantNotFoundException(id));
    }
}
