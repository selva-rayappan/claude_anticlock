package io.opsnext.api.export;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "data_export_jobs", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DataExportJob {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID tenantId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ExportStatus status;

    private String downloadUrl;

    private OffsetDateTime expiresAt;

    private UUID triggeredBy;

    @Column(nullable = false)
    private OffsetDateTime triggeredAt;

    private OffsetDateTime completedAt;

    private String errorMessage;

    @PrePersist
    void onPersist() {
        if (triggeredAt == null) triggeredAt = OffsetDateTime.now();
        if (status == null) status = ExportStatus.PENDING;
    }
}
