package io.opsnext.api.tenant;

import io.opsnext.api.platform.entity.Tenant;
import io.opsnext.api.platform.repository.TenantRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Resolves the current tenant from subdomain or X-Tenant-Slug header.
 * Sets TenantContext.schemaName for use by TenantJdbcTemplate.
 */
@Component
@Order(1)
@RequiredArgsConstructor
public class TenantFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(TenantFilter.class);
    private static final Pattern SUBDOMAIN_PATTERN = Pattern.compile("^([a-z0-9-]+)\\.(?:opsnext\\.io|localhost)(?::\\d+)?$");
    private static final String CACHE_PREFIX = "tenant:slug:";

    private final TenantRepository tenantRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String slug = resolveSlug(request);
        if (slug != null) {
            resolveTenantBySlug(slug).ifPresent(tenant -> {
                TenantContext.set(tenant.getId());
                TenantContext.setSchema(tenant.getSchemaName());
            });
        }
        filterChain.doFilter(request, response);
    }

    private String resolveSlug(HttpServletRequest request) {
        String header = request.getHeader("X-Tenant-Slug");
        if (header != null && !header.isBlank()) return header.trim().toLowerCase();

        // 1. Check query parameters
        String queryParam = request.getParameter("tenant_id");
        if (queryParam == null || queryParam.isBlank()) {
            queryParam = request.getParameter("tenant");
        }
        if (queryParam != null && !queryParam.isBlank()) {
            return queryParam.trim().toLowerCase();
        }

        // 2. Check X-Forwarded-Host (from Next.js or other proxies)
        String host = request.getHeader("X-Forwarded-Host");
        if (host == null || host.isBlank()) {
            host = request.getHeader("Host");
        }

        if (host != null) {
            Matcher m = SUBDOMAIN_PATTERN.matcher(host);
            if (m.matches()) return m.group(1);
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private Optional<Tenant> resolveTenantBySlug(String slug) {
        String cacheKey = CACHE_PREFIX + slug;
        try {
            Object cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached instanceof Tenant t) return Optional.of(t);
        } catch (Exception e) {
            log.debug("Redis cache miss for tenant slug: {}", slug);
        }

        Optional<Tenant> tenant = tenantRepository.findBySlugAndDeletedAtIsNull(slug);
        tenant.ifPresent(t -> {
            try {
                redisTemplate.opsForValue().set(cacheKey, t, Duration.ofMinutes(5));
            } catch (Exception e) {
                log.debug("Failed to cache tenant: {}", e.getMessage());
            }
        });
        return tenant;
    }
}
