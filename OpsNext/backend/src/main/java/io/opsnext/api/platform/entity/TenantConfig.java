package io.opsnext.api.platform.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.io.Serializable;
import java.time.Instant;

@Entity
@Table(name = "tenant_configs", schema = "public")
@Getter
@Setter
public class TenantConfig implements Serializable {

    @Id
    @Column(length = 36)
    private String id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false, unique = true)
    private Tenant tenant;

    private String logoUrl;
    private String primaryColor;
    private String timezone = "UTC";
    private String currency = "USD";
    private String language = "en";
    private String dateFormat = "MM/DD/YYYY";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String featureFlags = "{}";

    @UpdateTimestamp
    private Instant updatedAt;
}
