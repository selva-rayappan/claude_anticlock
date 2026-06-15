package io.opsnext.api.tenant;

import io.opsnext.api.common.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.datasource.DataSourceUtils;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

/**
 * Executes SQL within a tenant schema by setting search_path before each operation.
 * Uses DataSourceUtils so it participates in Spring-managed transactions.
 */
@Component
@RequiredArgsConstructor
public class TenantJdbcTemplate {

    private final DataSource dataSource;

    public <T> List<T> query(String sql, RowMapper<T> mapper, Object... params) {
        String schemaName = requireSchema();
        Connection conn = DataSourceUtils.getConnection(dataSource);
        try {
            setSearchPath(conn, schemaName);
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                bindParams(ps, params);
                try (ResultSet rs = ps.executeQuery()) {
                    List<T> results = new ArrayList<>();
                    int row = 0;
                    while (rs.next()) {
                        results.add(mapper.mapRow(rs, row++));
                    }
                    return results;
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Tenant query failed: " + e.getMessage(), e);
        } finally {
            DataSourceUtils.releaseConnection(conn, dataSource);
        }
    }

    public int execute(String sql, Object... params) {
        String schemaName = requireSchema();
        Connection conn = DataSourceUtils.getConnection(dataSource);
        try {
            setSearchPath(conn, schemaName);
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                bindParams(ps, params);
                return ps.executeUpdate();
            }
        } catch (Exception e) {
            throw new RuntimeException("Tenant execute failed: " + e.getMessage(), e);
        } finally {
            DataSourceUtils.releaseConnection(conn, dataSource);
        }
    }

    public <T> T queryForObject(String sql, RowMapper<T> mapper, Object... params) {
        List<T> results = query(sql, mapper, params);
        return results.isEmpty() ? null : results.get(0);
    }

    private void setSearchPath(Connection conn, String schemaName) throws Exception {
        try (PreparedStatement ps = conn.prepareStatement("SET search_path TO " + schemaName + ", public")) {
            ps.execute();
        }
    }

    private void bindParams(PreparedStatement ps, Object[] params) throws Exception {
        for (int i = 0; i < params.length; i++) {
            Object val = params[i];
            // PostgreSQL JDBC requires OffsetDateTime for TIMESTAMPTZ columns
            if (val instanceof Instant instant) {
                val = instant.atOffset(ZoneOffset.UTC);
            } else if (val instanceof String[] strArr) {
                val = ps.getConnection().createArrayOf("text", strArr);
            }
            ps.setObject(i + 1, val);
        }
    }

    private String requireSchema() {
        String schema = TenantContext.getSchema();
        if (schema == null) {
            throw AppException.unauthorized("No tenant context established for this request");
        }
        return schema;
    }
}
