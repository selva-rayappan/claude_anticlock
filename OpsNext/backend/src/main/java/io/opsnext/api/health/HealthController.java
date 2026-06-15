package io.opsnext.api.health;

import io.opsnext.api.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@Tag(name = "Health", description = "Service health and readiness checks")
@RequiredArgsConstructor
public class HealthController {

    private final JdbcTemplate jdbcTemplate;
    private final RedisTemplate<String, Object> redisTemplate;

    @GetMapping("/health")
    @Operation(summary = "Basic health check")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "ok", "service", "opsnext-api", "timestamp", Instant.now().toString()));
    }

    @GetMapping("/api/v1/health")
    @Operation(summary = "Detailed health check with dependency status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> detailedHealth() {
        Map<String, Object> checks = new LinkedHashMap<>();
        checks.put("service", "ok");

        // Check DB
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            checks.put("database", "ok");
        } catch (Exception e) {
            checks.put("database", "error: " + e.getMessage());
        }

        // Check Redis
        try {
            redisTemplate.getConnectionFactory().getConnection().ping();
            checks.put("redis", "ok");
        } catch (Exception e) {
            checks.put("redis", "error: " + e.getMessage());
        }

        checks.put("timestamp", Instant.now().toString());
        checks.put("version", "1.0.0");

        return ResponseEntity.ok(ApiResponse.success(checks));
    }
}
