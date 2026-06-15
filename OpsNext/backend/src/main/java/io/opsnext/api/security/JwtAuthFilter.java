package io.opsnext.api.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.opsnext.api.platform.entity.Tenant;
import io.opsnext.api.platform.repository.TenantRepository;
import io.opsnext.api.tenant.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthFilter.class);
    private static final String CACHE_PREFIX = "tenant:id:";
    
    private final JwtService jwtService;
    private final TenantRepository tenantRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                processToken(authHeader.substring(7));
            }
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
            SecurityContextHolder.clearContext();
        }
    }

    private void processToken(String token) {
        try {
            Claims claims = jwtService.validateAccessToken(token);

            String userId = claims.getSubject();
            String tenantId = claims.get("tenantId", String.class);
            String email = claims.get("email", String.class);
            String tier = claims.get("tier", String.class);

            @SuppressWarnings("unchecked")
            List<String> roles = claims.get("roles", List.class);

            if (tenantId != null) {
                TenantContext.set(tenantId);
                resolveTenantById(tenantId).ifPresent(tenant -> {
                    TenantContext.setSchema(tenant.getSchemaName());
                });
            }

            List<SimpleGrantedAuthority> authorities = roles != null
                ? roles.stream().map(r -> new SimpleGrantedAuthority("ROLE_" + r)).toList()
                : List.of();

            SecurityPrincipal principal = new SecurityPrincipal(userId, tenantId, email, roles, tier, claims.getId());
            UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(principal, null, authorities);
            SecurityContextHolder.getContext().setAuthentication(auth);

        } catch (JwtException ex) {
            log.debug("Invalid JWT: {}", ex.getMessage());
        } catch (Exception ex) {
            log.error("JWT filter error", ex);
        }
    }

    @SuppressWarnings("unchecked")
    private Optional<Tenant> resolveTenantById(String tenantId) {
        String cacheKey = CACHE_PREFIX + tenantId;
        try {
            Object cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached instanceof Tenant t) return Optional.of(t);
        } catch (Exception e) {
            log.debug("Redis cache miss for tenant ID: {}", tenantId);
        }

        Optional<Tenant> tenant = tenantRepository.findById(tenantId);
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
