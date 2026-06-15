package io.opsnext.api.metrics;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TenantMetricsSnapshotRepository extends JpaRepository<TenantMetricsSnapshot, UUID> {

    @Query("SELECT m FROM TenantMetricsSnapshot m WHERE m.tenantId = :tenantId ORDER BY m.snapshotAt DESC LIMIT 1")
    Optional<TenantMetricsSnapshot> findLatestByTenantId(UUID tenantId);

    @Query("""
        SELECT m FROM TenantMetricsSnapshot m
        WHERE m.snapshotAt = (
            SELECT MAX(m2.snapshotAt) FROM TenantMetricsSnapshot m2
            WHERE m2.tenantId = m.tenantId
        )
        """)
    List<TenantMetricsSnapshot> findLatestForAllTenants();
}
