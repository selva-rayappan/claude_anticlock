package io.opsnext.api.task;

import io.opsnext.api.common.dto.PageResponse;
import io.opsnext.api.common.exception.AppException;
import io.opsnext.api.security.SecurityPrincipal;
import io.opsnext.api.task.dto.TaskRequest;
import io.opsnext.api.tenant.TenantJdbcTemplate;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TenantJdbcTemplate db;

    private final RowMapper<Map<String, Object>> taskMapper = (rs, row) -> {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", rs.getString("id"));
        m.put("title", rs.getString("title"));
        m.put("description", rs.getString("description"));
        m.put("entityType", rs.getString("entity_type"));
        m.put("entityId", rs.getString("entity_id"));
        m.put("status", rs.getString("status"));
        m.put("priority", rs.getString("priority"));
        m.put("dueAt", rs.getTimestamp("due_at"));
        m.put("completedAt", rs.getTimestamp("completed_at"));
        m.put("creatorId", rs.getString("created_by"));
        m.put("creatorName", rs.getString("creator_name"));
        m.put("assigneeId", rs.getString("assignee_id"));
        m.put("assigneeName", rs.getString("assignee_name"));
        m.put("createdAt", rs.getTimestamp("created_at"));
        m.put("updatedAt", rs.getTimestamp("updated_at"));
        return m;
    };

    private static final String BASE_SELECT = """
        SELECT t.*,
               CONCAT(c.first_name, ' ', c.last_name) AS creator_name,
               CONCAT(a.first_name, ' ', a.last_name) AS assignee_name
        FROM tasks t
        LEFT JOIN users c ON c.id = t.created_by
        LEFT JOIN users a ON a.id = t.assignee_id
        """;

    public PageResponse<Map<String, Object>> list(
        String assigneeId, String entityType, String entityId,
        String status, String priority, boolean myTasks, boolean overdue,
        int page, int limit, SecurityPrincipal principal
    ) {
        List<Object> params = new ArrayList<>();
        StringBuilder where = new StringBuilder("WHERE 1=1");

        if (myTasks) {
            where.append(" AND t.assignee_id = ?");
            params.add(principal.userId());
        } else if (assigneeId != null && !assigneeId.isBlank()) {
            where.append(" AND t.assignee_id = ?");
            params.add(assigneeId);
        }
        if (entityType != null && !entityType.isBlank()) {
            where.append(" AND t.entity_type = ?");
            params.add(entityType.toUpperCase());
        }
        if (entityId != null && !entityId.isBlank()) {
            where.append(" AND t.entity_id = ?");
            params.add(entityId);
        }
        if (status != null && !status.isBlank()) {
            where.append(" AND t.status = ?");
            params.add(status.toUpperCase());
        }
        if (priority != null && !priority.isBlank()) {
            where.append(" AND t.priority = ?");
            params.add(priority.toUpperCase());
        }
        if (overdue) {
            where.append(" AND t.due_at < NOW() AND t.status != 'COMPLETED'");
        }

        Long total = db.queryForObject("SELECT COUNT(*) FROM tasks t " + where, (rs, r) -> rs.getLong(1), params.toArray());

        List<Object> dataParams = new ArrayList<>(params);
        dataParams.add(Math.min(limit, 100));
        dataParams.add((page - 1) * limit);

        List<Map<String, Object>> items = db.query(
            BASE_SELECT + where + " ORDER BY t.due_at ASC NULLS LAST, t.created_at DESC LIMIT ? OFFSET ?",
            taskMapper, dataParams.toArray()
        );
        return new PageResponse<>(items, total == null ? 0 : total, page, limit);
    }

    public Map<String, Object> getById(String id) {
        Map<String, Object> task = db.queryForObject(BASE_SELECT + "WHERE t.id = ?", taskMapper, id);
        if (task == null) throw AppException.notFound("Task not found");
        return task;
    }

    @Transactional
    public Map<String, Object> create(TaskRequest.Create req, SecurityPrincipal principal) {
        String id = UUID.randomUUID().toString();
        String status = req.status() != null ? req.status().toUpperCase() : "OPEN";
        String priority = req.priority() != null ? req.priority().toUpperCase() : "MEDIUM";
        String assigneeId = req.assigneeId() != null ? req.assigneeId() : principal.userId();

        db.execute("""
            INSERT INTO tasks (id, title, description, entity_type, entity_id,
                status, priority, due_at, created_by, assignee_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?::timestamptz, ?, ?, NOW(), NOW())
            """,
            id, req.title(), req.description(),
            req.entityType() != null ? req.entityType().toUpperCase() : null,
            req.entityId(), status, priority, req.dueDate(),
            principal.userId(), assigneeId
        );
        return getById(id);
    }

    @Transactional
    public Map<String, Object> update(String id, TaskRequest.Update req, SecurityPrincipal principal) {
        getById(id);

        List<String> setClauses = new ArrayList<>();
        List<Object> params = new ArrayList<>();

        if (req.title() != null) { setClauses.add("title = ?"); params.add(req.title()); }
        if (req.description() != null) { setClauses.add("description = ?"); params.add(req.description()); }
        if (req.assigneeId() != null) { setClauses.add("assignee_id = ?"); params.add(req.assigneeId()); }
        if (req.dueDate() != null) { setClauses.add("due_at = ?::timestamptz"); params.add(req.dueDate()); }
        if (req.priority() != null) { setClauses.add("priority = ?"); params.add(req.priority().toUpperCase()); }
        if (req.status() != null) { setClauses.add("status = ?"); params.add(req.status().toUpperCase()); }

        if (setClauses.isEmpty()) return getById(id);

        setClauses.add("updated_at = NOW()");
        params.add(id);
        db.execute("UPDATE tasks SET " + String.join(", ", setClauses) + " WHERE id = ?", params.toArray());
        return getById(id);
    }

    @Transactional
    public Map<String, Object> complete(String id, TaskRequest.Complete req, SecurityPrincipal principal) {
        getById(id);
        db.execute("""
            UPDATE tasks SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW()
            WHERE id = ? AND status != 'COMPLETED'
            """, id);
        return getById(id);
    }

    @Transactional
    public void delete(String id, SecurityPrincipal principal) {
        int rows = db.execute("UPDATE tasks SET status = 'CANCELLED', updated_at = NOW() WHERE id = ? AND status != 'CANCELLED'", id);
        if (rows == 0) throw AppException.notFound("Task not found");
    }
}
