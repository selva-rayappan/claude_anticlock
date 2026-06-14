package io.opsnext.api.activity;

import io.opsnext.api.activity.dto.ActivityRequest;
import io.opsnext.api.common.dto.PageResponse;
import io.opsnext.api.common.exception.AppException;
import io.opsnext.api.security.SecurityPrincipal;
import io.opsnext.api.tenant.TenantJdbcTemplate;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class ActivityService {

    private final TenantJdbcTemplate db;

    private final RowMapper<Map<String, Object>> activityMapper = (rs, row) -> {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", rs.getString("id"));
        m.put("entityType", rs.getString("entity_type"));
        m.put("entityId", rs.getString("entity_id"));
        m.put("type", rs.getString("type"));
        m.put("subject", rs.getString("subject"));
        m.put("body", rs.getString("body"));
        m.put("outcome", rs.getString("outcome"));
        m.put("scheduledAt", rs.getTimestamp("scheduled_at"));
        m.put("completedAt", rs.getTimestamp("completed_at"));
        m.put("durationMinutes", rs.getInt("duration_minutes"));
        m.put("ownerId", rs.getString("owner_id"));
        m.put("ownerName", rs.getString("owner_name"));
        m.put("pinned", rs.getBoolean("pinned"));
        m.put("createdAt", rs.getTimestamp("created_at"));
        return m;
    };

    public PageResponse<Map<String, Object>> list(
        String entityType, String entityId,
        int page, int limit, SecurityPrincipal principal
    ) {
        List<Object> params = new ArrayList<>();
        StringBuilder where = new StringBuilder("WHERE a.deleted_at IS NULL");

        if (entityType != null && !entityType.isBlank()) {
            where.append(" AND a.entity_type = ?");
            params.add(entityType.toUpperCase());
        }
        if (entityId != null && !entityId.isBlank()) {
            where.append(" AND a.entity_id = ?");
            params.add(entityId);
        }

        Long total = db.queryForObject("SELECT COUNT(*) FROM activities a " + where, (rs, r) -> rs.getLong(1), params.toArray());

        List<Object> dataParams = new ArrayList<>(params);
        dataParams.add(Math.min(limit, 100));
        dataParams.add((page - 1) * limit);

        List<Map<String, Object>> items = db.query("""
            SELECT a.*, CONCAT(u.first_name, ' ', u.last_name) AS owner_name
            FROM activities a
            LEFT JOIN users u ON u.id = a.owner_id
            """ + where + " ORDER BY a.created_at DESC LIMIT ? OFFSET ?",
            activityMapper, dataParams.toArray()
        );
        return new PageResponse<>(items, total == null ? 0 : total, page, limit);
    }

    @Transactional
    public Map<String, Object> create(ActivityRequest.Create req, SecurityPrincipal principal) {
        String id = UUID.randomUUID().toString();

        db.execute("""
            INSERT INTO activities (id, entity_type, entity_id, type, subject, body, outcome,
                scheduled_at, completed_at, duration_minutes, owner_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?::timestamptz, ?::timestamptz, ?, ?, NOW(), NOW())
            """,
            id, req.entityType().toUpperCase(), req.entityId(), req.type().toUpperCase(),
            req.subject(), req.description(), req.outcome(),
            req.scheduledAt(), req.completedAt(),
            req.durationMinutes() != null ? req.durationMinutes() : 0,
            principal.userId()
        );

        Map<String, Object> activity = db.queryForObject("""
            SELECT a.*, CONCAT(u.first_name, ' ', u.last_name) AS owner_name
            FROM activities a LEFT JOIN users u ON u.id = a.owner_id
            WHERE a.id = ?
            """, activityMapper, id);
        if (activity == null) throw new IllegalStateException("Failed to create activity");
        return activity;
    }

    @Transactional
    public void delete(String id, SecurityPrincipal principal) {
        int rows = db.execute("UPDATE activities SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL", id);
        if (rows == 0) throw AppException.notFound("Activity not found");
    }
}
