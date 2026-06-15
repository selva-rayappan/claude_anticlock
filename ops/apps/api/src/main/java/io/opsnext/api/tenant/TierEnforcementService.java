package io.opsnext.api.tenant;

import io.opsnext.api.common.exception.TierLimitException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TierEnforcementService {

    private final TenantRepository tenantRepository;
    private final TierDefinitionRepository tierDefinitionRepository;

    public enum LimitType {
        USERS,
        CUSTOM_FIELDS,
        API_RATE
    }

    public void checkLimit(UUID tenantId, LimitType limitType, int currentUsage) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found: " + tenantId));

        TierDefinition tier = tierDefinitionRepository.findByName(tenant.getTier())
                .orElseThrow(() -> new IllegalStateException("Tier definition not found: " + tenant.getTier()));

        int limit = switch (limitType) {
            case USERS -> tier.getMaxUsers();
            case CUSTOM_FIELDS -> tier.getMaxCustomFields();
            case API_RATE -> tier.getApiRateLimitPerMinute();
        };

        if (limit != -1 && currentUsage >= limit) {
            log.warn("Tier limit reached: tenant={} tier={} limitType={} current={} limit={}",
                    tenantId, tenant.getTier(), limitType, currentUsage, limit);
            throw new TierLimitException(tenant.getTier().name(), limitType.name(), limit, currentUsage);
        }
    }
}
