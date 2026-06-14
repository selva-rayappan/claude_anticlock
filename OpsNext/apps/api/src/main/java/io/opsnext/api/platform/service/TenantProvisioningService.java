package io.opsnext.api.platform.service;

import io.opsnext.api.common.exception.AppException;
import io.opsnext.api.platform.dto.TenantRegisterRequest;
import io.opsnext.api.platform.entity.Tenant;
import io.opsnext.api.platform.entity.TenantConfig;
import io.opsnext.api.platform.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.FileCopyUtils;

import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TenantProvisioningService {

    private static final Logger log = LoggerFactory.getLogger(TenantProvisioningService.class);
    private static final Set<String> RESERVED_SLUGS = Set.of(
        "admin", "api", "app", "www", "mail", "smtp", "ftp", "cdn", "static",
        "assets", "media", "blog", "docs", "help", "support", "status",
        "platform", "billing", "auth", "login", "register"
    );

    private final TenantRepository tenantRepository;
    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public Map<String, Object> provision(TenantRegisterRequest req) {
        String slug = buildSlug(req.orgName(), req.slug());

        if (RESERVED_SLUGS.contains(slug)) {
            throw AppException.conflict("Organisation slug '" + slug + "' is reserved. Please choose another name.");
        }
        if (tenantRepository.existsBySlugAndDeletedAtIsNull(slug)) {
            throw AppException.conflict("An organisation with this name already exists.");
        }

        String tenantId = UUID.randomUUID().toString();
        String schemaName = "tenant_" + slug.replace("-", "_");

        // 1. Create platform Tenant record
        Tenant tenant = new Tenant();
        tenant.setId(tenantId);
        tenant.setSlug(slug);
        tenant.setName(req.orgName());
        tenant.setSchemaName(schemaName);
        tenant.setSubscriptionTier(parseTier(req.plan()));

        TenantConfig config = new TenantConfig();
        config.setId(UUID.randomUUID().toString());
        config.setTenant(tenant);
        config.setTimezone(req.timezone() != null ? req.timezone() : "UTC");
        config.setCurrency(req.currency() != null ? req.currency() : "USD");
        tenant.setConfig(config);

        tenantRepository.save(tenant);
        log.info("Created platform tenant record: {} ({})", slug, tenantId);

        // 2. Provision tenant schema
        createTenantSchema(schemaName);
        log.info("Provisioned tenant schema: {}", schemaName);

        // 3. Seed default data (roles, pipeline)
        seedDefaultRoles(schemaName);
        seedDefaultPipeline(schemaName);
        log.info("Seeded default data for tenant: {}", slug);

        // 4. Create admin user
        String adminUserId = createAdminUser(schemaName, req, tenantId);
        log.info("Created admin user for tenant: {} (userId: {})", slug, adminUserId);

        return Map.of(
            "tenantId", tenantId,
            "slug", slug,
            "schemaName", schemaName,
            "adminUserId", adminUserId,
            "message", "Organisation provisioned successfully"
        );
    }

    public Map<String, Object> checkSlug(String slug) {
        String normalised = buildSlug(slug, null);
        if (RESERVED_SLUGS.contains(normalised)) {
            return Map.of("available", false, "reason", "reserved", "suggestion", normalised + "-crm");
        }
        boolean exists = tenantRepository.existsBySlugAndDeletedAtIsNull(normalised);
        return Map.of("available", !exists, "slug", normalised);
    }

    private void createTenantSchema(String schemaName) {
        jdbcTemplate.execute("CREATE SCHEMA IF NOT EXISTS " + schemaName);

        // Load and execute tenant schema SQL
        try {
            ClassPathResource resource = new ClassPathResource("db/tenant-schema-template.sql");
            String sql = FileCopyUtils.copyToString(new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8));
            // Replace placeholder schema name
            sql = sql.replace("{{SCHEMA_NAME}}", schemaName);
            // Execute as a single batch (PostgreSQL can handle this)
            jdbcTemplate.execute("SET search_path TO " + schemaName + ", public");
            for (String statement : sql.split(";")) {
                // Strip comment-only lines within the chunk, then check if SQL remains
                String cleaned = Arrays.stream(statement.split("\n"))
                    .filter(line -> !line.trim().startsWith("--"))
                    .collect(Collectors.joining("\n"))
                    .trim();
                if (!cleaned.isEmpty()) {
                    jdbcTemplate.execute(cleaned);
                }
            }
            jdbcTemplate.execute("SET search_path TO public");
        } catch (Exception e) {
            log.error("Failed to create tenant schema: {}", e.getMessage(), e);
            throw new RuntimeException("Tenant schema creation failed: " + e.getMessage(), e);
        }
    }

    private void seedDefaultRoles(String schemaName) {
        jdbcTemplate.execute("SET search_path TO " + schemaName + ", public");

        String[][] roles = {
            {"SUPER_ADMIN", "Full platform access"},
            {"TENANT_ADMIN", "Tenant administration"},
            {"SALES_MANAGER", "Team management and all deals visibility"},
            {"SALES_REP", "Own contacts and deals only"},
            {"READ_ONLY", "Read-only access to all records"}
        };

        for (String[] role : roles) {
            jdbcTemplate.update(
                "INSERT INTO roles (id, name, description, is_system, created_at) VALUES (?, ?, ?, true, NOW()) ON CONFLICT DO NOTHING",
                UUID.randomUUID().toString(), role[0], role[1]
            );
        }
        jdbcTemplate.execute("SET search_path TO public");
    }

    private void seedDefaultPipeline(String schemaName) {
        jdbcTemplate.execute("SET search_path TO " + schemaName + ", public");

        String pipelineId = UUID.randomUUID().toString();
        jdbcTemplate.update(
            "INSERT INTO pipelines (id, name, is_default, is_active, created_at, updated_at) VALUES (?, 'Sales Pipeline', true, true, NOW(), NOW())",
            pipelineId
        );

        String[][] stages = {
            {"Prospecting", "0", "10", "false", "false", "#6366f1"},
            {"Qualification", "1", "25", "false", "false", "#8b5cf6"},
            {"Proposal Sent", "2", "50", "false", "false", "#f59e0b"},
            {"Negotiation", "3", "75", "false", "false", "#f97316"},
            {"Closed Won", "4", "100", "false", "true", "#22c55e"},
            {"Closed Lost", "5", "0", "true", "false", "#ef4444"}
        };

        for (String[] stage : stages) {
            jdbcTemplate.update(
                """
                INSERT INTO pipeline_stages (id, pipeline_id, name, display_order, probability,
                                             is_closed, is_won, rot_color, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
                """,
                UUID.randomUUID().toString(), pipelineId,
                stage[0], Integer.parseInt(stage[1]), Integer.parseInt(stage[2]),
                Boolean.parseBoolean(stage[3]), Boolean.parseBoolean(stage[4]), stage[5]
            );
        }
        jdbcTemplate.execute("SET search_path TO public");
    }

    private String createAdminUser(String schemaName, TenantRegisterRequest req, String tenantId) {
        jdbcTemplate.execute("SET search_path TO " + schemaName + ", public");

        String userId = UUID.randomUUID().toString();
        String passwordHash = passwordEncoder.encode(req.adminPassword());

        jdbcTemplate.update(
            """
            INSERT INTO users (id, email, password_hash, first_name, last_name, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'ACTIVE', NOW(), NOW())
            """,
            userId, req.adminEmail(), passwordHash, req.adminFirstName(), req.adminLastName()
        );

        // Assign TENANT_ADMIN role
        List<String> roleIds = jdbcTemplate.queryForList(
            "SELECT id FROM roles WHERE name = 'TENANT_ADMIN' LIMIT 1", String.class
        );
        if (!roleIds.isEmpty()) {
            jdbcTemplate.update(
                "INSERT INTO user_roles (user_id, role_id, assigned_at) VALUES (?, ?, NOW())",
                userId, roleIds.get(0)
            );
        }

        jdbcTemplate.execute("SET search_path TO public");
        return userId;
    }

    private String buildSlug(String orgName, String provided) {
        if (provided != null && !provided.isBlank()) {
            return normaliseSlug(provided);
        }
        return normaliseSlug(orgName);
    }

    private String normaliseSlug(String input) {
        String normalised = Normalizer.normalize(input, Normalizer.Form.NFD);
        return normalised.toLowerCase()
            .replaceAll("[^a-z0-9\\s-]", "")
            .trim()
            .replaceAll("[\\s-]+", "-")
            .replaceAll("^-|-$", "");
    }

    private Tenant.SubscriptionTier parseTier(String plan) {
        if (plan == null) return Tenant.SubscriptionTier.BASIC;
        return switch (plan.toUpperCase()) {
            case "PROFESSIONAL" -> Tenant.SubscriptionTier.PROFESSIONAL;
            case "ENTERPRISE" -> Tenant.SubscriptionTier.ENTERPRISE;
            default -> Tenant.SubscriptionTier.BASIC;
        };
    }
}
