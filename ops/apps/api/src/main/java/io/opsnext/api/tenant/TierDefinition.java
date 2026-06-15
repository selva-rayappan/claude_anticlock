package io.opsnext.api.tenant;

import io.hypersistence.utils.hibernate.type.array.ListArrayType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcType;
import org.hibernate.annotations.Type;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "tier_definitions", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TierDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(nullable = false, unique = true)
    private TierName name;

    @Column(nullable = false)
    private int maxUsers;

    @Column(nullable = false)
    private int maxCustomFields;

    @Column(nullable = false)
    private int apiRateLimitPerMinute;

    @Type(ListArrayType.class)
    @Column(name = "feature_flags", columnDefinition = "text[]")
    private List<String> featureFlags;

    public boolean isUnlimited() {
        return maxUsers == -1;
    }

    public boolean hasFeature(String flag) {
        return featureFlags != null && featureFlags.contains(flag);
    }
}
