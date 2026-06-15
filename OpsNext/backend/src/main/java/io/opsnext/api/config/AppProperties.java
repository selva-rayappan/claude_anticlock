package io.opsnext.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
    Jwt jwt,
    Cookie cookie,
    String webUrl,
    List<String> allowedOrigins,
    AccountLockout accountLockout,
    Mail mail,
    S3 s3,
    Typesense typesense
) {
    public record Jwt(String secret, int accessTokenExpiryHours, int refreshTokenExpiryDays) {}
    public record Cookie(String domain, boolean secure) {}
    public record AccountLockout(int maxAttempts, int durationMinutes) {}
    public record Mail(String from) {}
    public record S3(String endpoint, String accessKey, String secretKey,
                     String bucketImports, String bucketAttachments) {}
    public record Typesense(String host, int port, String apiKey) {}
}
