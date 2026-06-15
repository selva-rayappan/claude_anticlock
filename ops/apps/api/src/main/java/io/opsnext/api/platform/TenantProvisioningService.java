package io.opsnext.api.platform;

import io.opsnext.api.audit.PlatformAuditLogger;
import io.opsnext.api.email.EmailService;
import io.opsnext.api.tenant.Tenant;
import io.opsnext.api.tenant.TenantRepository;
import io.opsnext.api.tenant.TenantStatus;
import io.opsnext.api.tenant.TierName;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TenantProvisioningService {

    private final TenantRepository tenantRepository;
    private final JdbcTemplate jdbcTemplate;
    private final EmailService emailService;
    private final PlatformAuditLogger auditLogger;

    @Value("${opsnext.app.base-url:http://localhost:3000}")
    private String baseUrl;

    @Transactional
    public Tenant provision(String slug, String displayName, String seedAdminEmail, UUID actorId) {
        long start = System.currentTimeMillis();

        if (tenantRepository.existsBySlug(slug)) {
            throw new DuplicateSlugException(slug);
        }

        // 1. Persist tenant row
        Tenant tenant = Tenant.builder()
                .slug(slug)
                .displayName(displayName)
                .status(TenantStatus.ACTIVE)
                .tier(TierName.STARTER)
                .seedAdminEmail(seedAdminEmail)
                .build();
        tenant = tenantRepository.saveAndFlush(tenant);

        try {
            // 2. Create isolated schema
            String schema = "tenant_" + slug.replace("-", "_");
            jdbcTemplate.execute("CREATE SCHEMA IF NOT EXISTS " + schema);

            // 3. Seed default data in tenant schema (pipeline stages, roles, admin user placeholder)
            seedTenantDefaults(schema, seedAdminEmail, tenant.getId());

        } catch (Exception e) {
            log.error("Provisioning failed for slug={}, rolling back schema", slug, e);
            // Schema drop happens via transaction rollback for the Tenant row;
            // orphan schema cleanup via explicit drop
            try {
                jdbcTemplate.execute("DROP SCHEMA IF EXISTS tenant_" + slug.replace("-", "_") + " CASCADE");
            } catch (Exception dropEx) {
                log.error("Failed to drop orphan schema for slug={}", slug, dropEx);
            }
            throw new ProvisioningException("Provisioning failed for tenant: " + slug, e);
        }

        // 4. Send invitation email (async, outside transaction)
        String setupLink = baseUrl + "/setup?token=PLACEHOLDER&tenant=" + slug;
        emailService.sendTenantInvitation(seedAdminEmail, slug, setupLink);

        long duration = System.currentTimeMillis() - start;
        auditLogger.log(PlatformAuditLogger.Operation.TENANT_PROVISIONED, actorId, tenant.getId(), duration);

        return tenant;
    }

    private void seedTenantDefaults(String schema, String adminEmail, UUID tenantId) {
        // Minimal seed: placeholder for future feature schemas (contacts, deals, etc.)
        // Actual table creation happens via per-tenant Flyway baseline migrations
        log.info("Seeding tenant defaults: schema={} admin={}", schema, adminEmail);
    }
}
