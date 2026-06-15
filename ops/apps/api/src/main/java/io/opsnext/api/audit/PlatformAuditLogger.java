package io.opsnext.api.audit;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@Slf4j
public class PlatformAuditLogger {

    public enum Operation {
        TENANT_PROVISIONED,
        TENANT_SUSPENDED,
        TENANT_REACTIVATED,
        TENANT_DEACTIVATED,
        TIER_CHANGED,
        EXPORT_TRIGGERED,
        EXPORT_COMPLETE
    }

    public void log(Operation operation, UUID actorId, UUID tenantId, long durationMs) {
        log.info("PLATFORM_AUDIT operation={} actor={} tenantId={} durationMs={}",
                operation, actorId, tenantId, durationMs);
    }

    public void log(Operation operation, UUID actorId, UUID tenantId, long durationMs,
                    String extraKey, Object extraValue) {
        log.info("PLATFORM_AUDIT operation={} actor={} tenantId={} durationMs={} {}={}",
                operation, actorId, tenantId, durationMs, extraKey, extraValue);
    }
}
