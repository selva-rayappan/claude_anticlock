package io.opsnext.api.platform.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.io.Serializable;
import java.time.Instant;

@Entity
@Table(name = "tenants", schema = "public")
@Getter
@Setter
public class Tenant implements Serializable {

    @Id
    @Column(length = 36)
    private String id;

    @Column(unique = true, nullable = false, length = 63)
    private String slug;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private TenantStatus status = TenantStatus.ACTIVE;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private SubscriptionTier subscriptionTier = SubscriptionTier.BASIC;

    @Column(nullable = false)
    private String schemaName;

    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    private Instant deletedAt;

    @OneToOne(mappedBy = "tenant", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private TenantConfig config;

    public enum TenantStatus { ACTIVE, SUSPENDED, DELETED }
    public enum SubscriptionTier { BASIC, PROFESSIONAL, ENTERPRISE }
}
