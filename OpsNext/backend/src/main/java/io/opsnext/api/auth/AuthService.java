package io.opsnext.api.auth;

import io.opsnext.api.auth.dto.LoginRequest;
import io.opsnext.api.auth.dto.LoginResponse;
import io.opsnext.api.auth.dto.RegisterRequest;
import io.opsnext.api.common.exception.AppException;
import io.opsnext.api.config.AppProperties;
import io.opsnext.api.platform.entity.Tenant;
import io.opsnext.api.platform.repository.TenantRepository;
import io.opsnext.api.security.JwtService;
import io.opsnext.api.tenant.TenantContext;
import io.opsnext.api.tenant.TenantJdbcTemplate;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.sql.ResultSet;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final TenantJdbcTemplate tenantJdbc;
    private final TenantRepository tenantRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties appProperties;

    record TenantUser(String id, String email, String passwordHash, String firstName,
                      String lastName, String status, int failedAttempts, Instant lockedUntil,
                      List<String> roles) {}

    public LoginResponse login(LoginRequest req, HttpServletResponse response) {
        TenantUser user = findUser(req.email());
        if (user == null) {
            throw AppException.unauthorized("Invalid email or password");
        }

        // Account lockout check
        if (user.lockedUntil() != null && user.lockedUntil().isAfter(Instant.now())) {
            throw AppException.unauthorized("Account is locked due to too many failed login attempts. Please try again later.");
        }

        // Password verification
        if (!passwordEncoder.matches(req.password(), user.passwordHash())) {
            int attempts = user.failedAttempts() + 1;
            int maxAttempts = appProperties.accountLockout().maxAttempts();
            if (attempts >= maxAttempts) {
                Instant lockUntil = Instant.now().plus(appProperties.accountLockout().durationMinutes(), ChronoUnit.MINUTES);
                tenantJdbc.execute(
                    "UPDATE users SET failed_login_attempts = ?, locked_until = ?, updated_at = NOW() WHERE id = ?",
                    attempts, lockUntil, user.id()
                );
            } else {
                tenantJdbc.execute(
                    "UPDATE users SET failed_login_attempts = ?, updated_at = NOW() WHERE id = ?",
                    attempts, user.id()
                );
            }
            throw AppException.unauthorized("Invalid email or password");
        }

        // Reset failed attempts on success
        tenantJdbc.execute(
            "UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW(), updated_at = NOW() WHERE id = ?",
            user.id()
        );

        String tenantId = TenantContext.get();
        Tenant tenant = tenantRepository.findById(tenantId).orElseThrow(() -> AppException.notFound("Tenant"));
        String tier = tenant.getSubscriptionTier().name();

        String accessToken = jwtService.generateAccessToken(user.id(), tenantId, user.email(), user.roles(), tier);

        // Refresh token in httpOnly cookie
        String refreshToken = jwtService.generateRefreshToken();
        setRefreshCookie(response, refreshToken);
        storeRefreshToken(user.id(), refreshToken);

        return new LoginResponse(accessToken, new LoginResponse.UserInfo(
            user.id(), user.email(), user.firstName(), user.lastName(), user.roles(), tenantId, tier
        ));
    }

    public void register(RegisterRequest req) {
        // Check email uniqueness
        List<Map<String, Object>> existing = tenantJdbc.query(
            "SELECT id FROM users WHERE email = ? AND deleted_at IS NULL",
            (rs, row) -> Map.of("id", rs.getString("id")),
            req.email()
        );
        if (!existing.isEmpty()) {
            throw AppException.conflict("A user with this email already exists");
        }

        String userId = UUID.randomUUID().toString();
        String passwordHash = passwordEncoder.encode(req.password());
        String verificationToken = UUID.randomUUID().toString().replace("-", "");

        tenantJdbc.execute(
            """
            INSERT INTO users (id, email, password_hash, first_name, last_name, status,
                               email_verification_token, email_verification_expires_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'INVITED', ?, ?, NOW(), NOW())
            """,
            userId, req.email(), passwordHash, req.firstName(), req.lastName(),
            verificationToken, Instant.now().plus(24, ChronoUnit.HOURS)
        );

        // Assign default SALES_REP role
        assignDefaultRole(userId);
    }

    public Map<String, Object> getCurrentUser(String userId) {
        Map<String, Object> user = tenantJdbc.queryForObject(
            """
            SELECT u.id, u.email, u.first_name, u.last_name, u.status, u.avatar_url,
                   u.mfa_enabled, u.created_at,
                   ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL) as roles
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN roles r ON r.id = ur.role_id
            WHERE u.id = ? AND u.deleted_at IS NULL
            GROUP BY u.id
            """,
            (rs, row) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getString("id"));
                m.put("email", rs.getString("email"));
                m.put("firstName", rs.getString("first_name"));
                m.put("lastName", rs.getString("last_name"));
                m.put("status", rs.getString("status"));
                m.put("avatarUrl", rs.getString("avatar_url"));
                m.put("mfaEnabled", rs.getBoolean("mfa_enabled"));
                m.put("createdAt", rs.getTimestamp("created_at"));
                String[] rolesArr = rs.getArray("roles") != null ? (String[]) rs.getArray("roles").getArray() : new String[0];
                m.put("roles", rolesArr != null ? List.of(rolesArr) : List.of());
                return m;
            },
            userId
        );
        if (user == null) throw AppException.notFound("User");
        return user;
    }

    public void logout(String jti, HttpServletResponse response) {
        long expiryMs = (long) appProperties.jwt().accessTokenExpiryHours() * 3600 * 1000;
        jwtService.revokeToken(jti, expiryMs);
        clearRefreshCookie(response);
    }

    private TenantUser findUser(String email) {
        return tenantJdbc.queryForObject(
            """
            SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, u.status,
                   COALESCE(u.failed_login_attempts, 0) as failed_login_attempts,
                   u.locked_until,
                   ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL) as roles
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN roles r ON r.id = ur.role_id
            WHERE u.email = ? AND u.deleted_at IS NULL
            GROUP BY u.id
            """,
            (rs, row) -> {
                String[] rolesArr = rs.getArray("roles") != null
                    ? (String[]) rs.getArray("roles").getArray() : new String[0];
                return new TenantUser(
                    rs.getString("id"), rs.getString("email"), rs.getString("password_hash"),
                    rs.getString("first_name"), rs.getString("last_name"), rs.getString("status"),
                    rs.getInt("failed_login_attempts"),
                    rs.getTimestamp("locked_until") != null ? rs.getTimestamp("locked_until").toInstant() : null,
                    rolesArr != null ? List.of(rolesArr) : List.of()
                );
            },
            email
        );
    }

    private void storeRefreshToken(String userId, String token) {
        String tokenHash = org.apache.commons.codec.digest.DigestUtils.sha256Hex(token);
        Instant expiry = Instant.now().plus(appProperties.jwt().refreshTokenExpiryDays(), ChronoUnit.DAYS);
        tenantJdbc.execute(
            "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, NOW())",
            UUID.randomUUID().toString(), userId, tokenHash, expiry
        );
    }

    private void assignDefaultRole(String userId) {
        List<Map<String, Object>> roles = tenantJdbc.query(
            "SELECT id FROM roles WHERE name = 'SALES_REP' LIMIT 1",
            (rs, row) -> Map.of("id", rs.getString("id"))
        );
        if (!roles.isEmpty()) {
            String roleId = (String) roles.get(0).get("id");
            tenantJdbc.execute(
                "INSERT INTO user_roles (user_id, role_id, assigned_at) VALUES (?, ?, NOW()) ON CONFLICT DO NOTHING",
                userId, roleId
            );
        }
    }

    private void setRefreshCookie(HttpServletResponse response, String token) {
        Cookie cookie = new Cookie("refresh_token", token);
        cookie.setHttpOnly(true);
        cookie.setSecure(appProperties.cookie().secure());
        cookie.setPath("/api/v1/auth");
        cookie.setMaxAge((int) (appProperties.jwt().refreshTokenExpiryDays() * 24 * 3600L));
        response.addCookie(cookie);
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie("refresh_token", "");
        cookie.setHttpOnly(true);
        cookie.setSecure(appProperties.cookie().secure());
        cookie.setPath("/api/v1/auth");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }
}
