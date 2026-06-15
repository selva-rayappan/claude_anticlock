package io.opsnext.api.metrics;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "tenant_metrics_snapshots", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TenantMetricsSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID tenantId;

    @Column(nullable = false)
    private int activeUserCount;

    @Column(nullable = false)
    private long totalRecordCount;

    @Column(nullable = false)
    private long apiCallCount30d;

    @Column(nullable = false)
    private long storageBytes;

    @Column(nullable = false)
    private OffsetDateTime snapshotAt;

    @PrePersist
    void onPersist() {
        if (snapshotAt == null) snapshotAt = OffsetDateTime.now();
    }
}
