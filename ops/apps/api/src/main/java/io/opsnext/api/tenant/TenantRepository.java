package io.opsnext.api.tenant;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, UUID> {

    boolean existsBySlug(String slug);

    Optional<Tenant> findBySlug(String slug);

    Page<Tenant> findByStatus(TenantStatus status, Pageable pageable);

    @Query("SELECT t FROM Tenant t WHERE (:status IS NULL OR t.status = :status)")
    Page<Tenant> findAllByOptionalStatus(TenantStatus status, Pageable pageable);
}
