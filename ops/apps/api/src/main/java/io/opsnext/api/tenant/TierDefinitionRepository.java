package io.opsnext.api.tenant;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TierDefinitionRepository extends JpaRepository<TierDefinition, UUID> {
    Optional<TierDefinition> findByName(TierName name);
}
