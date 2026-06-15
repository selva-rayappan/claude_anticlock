package io.opsnext.api.export;

import io.opsnext.api.audit.PlatformAuditLogger;
import io.opsnext.api.tenant.TenantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DataExportService {

    private final DataExportJobRepository jobRepo;
    private final TenantRepository tenantRepo;
    private final S3Client s3Client;
    private final S3Presigner presigner;
    private final PlatformAuditLogger auditLogger;

    @Value("${opsnext.minio.bucket}")
    private String bucket;

    @Value("${opsnext.export.download-url-expiry-hours:24}")
    private int expiryHours;

    @Transactional
    public UUID triggerExport(UUID tenantId, UUID actorId) {
        DataExportJob job = DataExportJob.builder()
                .tenantId(tenantId)
                .status(ExportStatus.PENDING)
                .triggeredBy(actorId)
                .build();
        job = jobRepo.save(job);

        auditLogger.log(PlatformAuditLogger.Operation.EXPORT_TRIGGERED, actorId, tenantId, 0,
                "jobId", job.getId());

        processExportAsync(job.getId(), tenantId, actorId);
        return job.getId();
    }

    public DataExportJob getJobStatus(UUID jobId) {
        return jobRepo.findById(jobId)
                .orElseThrow(() -> new ExportJobNotFoundException(jobId));
    }

    @Async
    public void processExportAsync(UUID jobId, UUID tenantId, UUID actorId) {
        long start = System.currentTimeMillis();
        DataExportJob job = jobRepo.findById(jobId).orElseThrow();
        job.setStatus(ExportStatus.RUNNING);
        jobRepo.save(job);

        try {
            String tenant = tenantRepo.findById(tenantId).map(t -> t.getSlug()).orElse(tenantId.toString());

            // Placeholder export content — real implementation queries tenant schema tables
            String exportJson = """
                    {"tenantId":"%s","exportedAt":"%s","records":{}}
                    """.formatted(tenantId, OffsetDateTime.now());

            String key = "exports/%s/%s.json".formatted(tenantId, jobId);
            s3Client.putObject(
                    PutObjectRequest.builder().bucket(bucket).key(key).build(),
                    RequestBody.fromString(exportJson, StandardCharsets.UTF_8));

            String downloadUrl = presigner.presignGetObject(
                    GetObjectPresignRequest.builder()
                            .signatureDuration(Duration.ofHours(expiryHours))
                            .getObjectRequest(GetObjectRequest.builder().bucket(bucket).key(key).build())
                            .build())
                    .url().toString();

            job.setStatus(ExportStatus.COMPLETE);
            job.setDownloadUrl(downloadUrl);
            job.setExpiresAt(OffsetDateTime.now().plusHours(expiryHours));
            job.setCompletedAt(OffsetDateTime.now());
            jobRepo.save(job);

            auditLogger.log(PlatformAuditLogger.Operation.EXPORT_COMPLETE, actorId, tenantId,
                    System.currentTimeMillis() - start, "jobId", jobId);

        } catch (Exception e) {
            log.error("Export failed: jobId={} tenantId={}", jobId, tenantId, e);
            job.setStatus(ExportStatus.FAILED);
            job.setErrorMessage(e.getMessage());
            jobRepo.save(job);
        }
    }
}
