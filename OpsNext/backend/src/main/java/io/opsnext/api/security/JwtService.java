package io.opsnext.api.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import io.opsnext.api.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JwtService {

    private final AppProperties appProperties;
    private final RedisTemplate<String, Object> redisTemplate;

    private SecretKey signingKey() {
        byte[] keyBytes = appProperties.jwt().secret().getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateAccessToken(String userId, String tenantId, String email,
                                      List<String> roles, String tier) {
        String jti = UUID.randomUUID().toString();
        long expiryMs = (long) appProperties.jwt().accessTokenExpiryHours() * 3600 * 1000;
        return Jwts.builder()
            .id(jti)
            .subject(userId)
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + expiryMs))
            .claims(Map.of(
                "tenantId", tenantId,
                "email", email,
                "roles", roles,
                "tier", tier
            ))
            .signWith(signingKey())
            .compact();
    }

    public String generateRefreshToken() {
        return UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
    }

    public Claims validateAccessToken(String token) {
        Claims claims = Jwts.parser()
            .verifyWith(signingKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();

        String jti = claims.getId();
        Boolean revoked = (Boolean) redisTemplate.opsForValue().get("jwt:deny:" + jti);
        if (Boolean.TRUE.equals(revoked)) {
            throw new JwtException("Token has been revoked");
        }
        return claims;
    }

    public void revokeToken(String jti, long expiryMs) {
        redisTemplate.opsForValue().set("jwt:deny:" + jti, true, Duration.ofMillis(expiryMs));
    }

    public boolean isTokenRevoked(String jti) {
        return Boolean.TRUE.equals(redisTemplate.hasKey("jwt:deny:" + jti));
    }
}
