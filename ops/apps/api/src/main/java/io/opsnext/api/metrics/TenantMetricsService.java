package io.opsnext.api.metrics;

import io.opsnext.api.tenant.Tenant;
import io.opsnext.api.tenant.TenantRepository;
import io.opsnext.api.tenant.TenantStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class TenantMetricsService {

    private final TenantMetricsSnapshotRepository snapshotRepo;
    private final TenantRepository tenantRepository;
    private final StringRedisTemplate redis;

    private static final String CACHE_PREFIX = "metrics:";
    private static final long CACHE_TTL_SECONDS = 300;

    public TenantMetricsSnapshot getMetrics(UUID tenantId) {
        String cached = redis.opsForValue().get(CACHE_PREFIX + tenantId);
        if (cached != null) {
            return snapshotRepo.findLatestByTenantId(tenantId)
                    .orElseGet(() -> refreshMetrics(tenantId));
        }
        return refreshMetrics(tenantId);
    }

    public List<TenantMetricsSnapshot> getAllMetrics() {
        return snapshotRepo.findLatestForAllTenants();
    }

    public TenantMetricsSnapshot refreshMetrics(UUID tenantId) {
        // In production this would run aggregate queries against tenant_{slug} schema.
        // Placeholder implementation returns zeros until tenant schemas have data tables.
        TenantMetricsSnapshot snapshot = TenantMetricsSnapshot.builder()
                .tenantId(tenantId)
                .activeUserCount(0)
                .totalRecordCount(0)
                .apiCallCount30d(0)
                .storageBytes(0)
                .snapshotAt(OffsetDateTime.now())
                .build();

        snapshot = snapshotRepo.save(snapshot);
        redis.opsForValue().set(CACHE_PREFIX + tenantId, "1", CACHE_TTL_SECONDS, TimeUnit.SECONDS);
        log.info("Metrics refreshed: tenantId={}", tenantId);
        return snapshot;
    }

    @Scheduled(fixedRate = 300_000)
    public void refreshAllTenants() {
        log.info("Running scheduled metrics refresh for all active tenants");
        tenantRepository.findByStatus(TenantStatus.ACTIVE,
                org.springframework.data.domain.Pageable.unpaged())
                .forEach(tenant -> {
                    try {
                        refreshMetrics(tenant.getId());
                    } catch (Exception e) {
                        log.error("Metrics refresh failed: tenantId={}", tenant.getId(), e);
                    }
                });
    }
}
