package io.opsnext.api.export;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface DataExportJobRepository extends JpaRepository<DataExportJob, UUID> {}
