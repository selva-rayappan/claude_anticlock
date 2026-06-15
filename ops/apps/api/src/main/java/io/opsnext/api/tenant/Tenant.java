package io.opsnext.api.tenant;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "tenants", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tenant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 63)
    private String slug;

    @Column(nullable = false, length = 200)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(nullable = false)
    private TenantStatus status;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(nullable = false)
    private TierName tier;

    @Column(nullable = false, length = 320)
    private String seedAdminEmail;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime provisionedAt;

    private OffsetDateTime suspendedAt;

    private OffsetDateTime deactivatedAt;

    @PrePersist
    void onCreate() {
        if (provisionedAt == null) provisionedAt = OffsetDateTime.now();
        if (status == null) status = TenantStatus.ACTIVE;
        if (tier == null) tier = TierName.STARTER;
    }
}
