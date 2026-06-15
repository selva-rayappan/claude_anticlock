package io.opsnext.api.export;

import java.util.UUID;

public class ExportJobNotFoundException extends RuntimeException {
    public ExportJobNotFoundException(UUID jobId) {
        super("Export job not found: " + jobId);
    }
}
