package io.opsnext.api.auth;

import io.opsnext.api.tenant.TenantContext;
import io.opsnext.api.tenant.TenantJdbcTemplate;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final TenantJdbcTemplate tenantJdbc;

    record TenantUser(String id, String email, String passwordHash, String status, List<String> roles) {}

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        if (!TenantContext.hasTenant()) {
            throw new UsernameNotFoundException("No tenant context");
        }
        TenantUser u = tenantJdbc.queryForObject(
            """
            SELECT u.id, u.email, u.password_hash, u.status,
                   ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL) as roles
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN roles r ON r.id = ur.role_id
            WHERE u.email = ? AND u.deleted_at IS NULL
            GROUP BY u.id, u.email, u.password_hash, u.status
            """,
            (rs, rowNum) -> {
                String[] rolesArr = (String[]) rs.getArray("roles").getArray();
                return new TenantUser(
                    rs.getString("id"),
                    rs.getString("email"),
                    rs.getString("password_hash"),
                    rs.getString("status"),
                    rolesArr != null ? List.of(rolesArr) : List.of()
                );
            },
            email
        );

        if (u == null) throw new UsernameNotFoundException("User not found: " + email);
        if ("DEACTIVATED".equals(u.status()) || "INVITED".equals(u.status())) {
            throw new UsernameNotFoundException("Account not active");
        }

        List<SimpleGrantedAuthority> authorities = u.roles().stream()
            .map(r -> new SimpleGrantedAuthority("ROLE_" + r))
            .toList();

        return new User(u.email(), u.passwordHash(), authorities);
    }
}
