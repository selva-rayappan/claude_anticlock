package io.opsnext.api.platform.repository;

import io.opsnext.api.platform.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, String> {
    Optional<Tenant> findBySlugAndDeletedAtIsNull(String slug);
    boolean existsBySlugAndDeletedAtIsNull(String slug);
    Optional<Tenant> findByIdAndDeletedAtIsNull(String id);
}
