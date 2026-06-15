package io.opsnext.api.opportunity;

import io.opsnext.api.common.dto.PageResponse;
import io.opsnext.api.common.exception.AppException;
import io.opsnext.api.opportunity.dto.OpportunityRequest;
import io.opsnext.api.security.SecurityPrincipal;
import io.opsnext.api.tenant.TenantJdbcTemplate;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class OpportunityService {

    private final TenantJdbcTemplate db;

    private static final Set<String> SORTABLE_COLUMNS = Set.of(
        "name", "value", "expected_close_date", "probability", "created_at", "updated_at"
    );

    private final RowMapper<Map<String, Object>> oppMapper = (rs, row) -> {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", rs.getString("id"));
        m.put("name", rs.getString("name"));
        m.put("accountId", rs.getString("account_id"));
        m.put("accountName", rs.getString("account_name"));
        m.put("contactId", rs.getString("contact_id"));
        m.put("pipelineId", rs.getString("pipeline_id"));
        m.put("pipelineName", rs.getString("pipeline_name"));
        m.put("stageId", rs.getString("stage_id"));
        m.put("stageName", rs.getString("stage_name"));
        m.put("stageColor", rs.getString("stage_color"));
        m.put("value", rs.getDouble("value"));
        m.put("currency", rs.getString("currency"));
        m.put("closeDate", rs.getString("close_date_text"));
        m.put("probability", rs.getInt("probability"));
        m.put("ownerId", rs.getString("owner_id"));
        m.put("ownerName", rs.getString("owner_name"));
        m.put("customFields", rs.getString("custom_fields"));
        m.put("createdAt", rs.getTimestamp("created_at"));
        m.put("updatedAt", rs.getTimestamp("updated_at"));
        return m;
    };

    private static final String BASE_SELECT = """
        SELECT o.*,
               a.name AS account_name,
               p.name AS pipeline_name,
               ps.name AS stage_name,
               ps.rot_color AS stage_color,
               CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
               o.expected_close_date::text AS close_date_text,
               o.custom_fields::text AS custom_fields
        FROM opportunities o
        LEFT JOIN accounts a ON a.id = o.account_id
        LEFT JOIN pipelines p ON p.id = o.pipeline_id
        LEFT JOIN pipeline_stages ps ON ps.id = o.stage_id
        LEFT JOIN users u ON u.id = o.owner_id
        """;

    public PageResponse<Map<String, Object>> list(
        int page, int limit, String search,
        String ownerId, String pipelineId, String stageId,
        String sort, String order, SecurityPrincipal principal
    ) {
        String safeSort = SORTABLE_COLUMNS.contains(sort) ? "o." + sort : "o.created_at";
        String safeOrder = "asc".equalsIgnoreCase(order) ? "ASC" : "DESC";

        List<Object> params = new ArrayList<>();
        StringBuilder where = new StringBuilder("WHERE o.deleted_at IS NULL");

        if (search != null && !search.isBlank()) {
            where.append(" AND (o.name ILIKE ? OR a.name ILIKE ?)");
            String like = "%" + search.trim() + "%";
            params.add(like); params.add(like);
        }
        if (ownerId != null && !ownerId.isBlank()) {
            where.append(" AND o.owner_id = ?");
            params.add(ownerId);
        }
        if (pipelineId != null && !pipelineId.isBlank()) {
            where.append(" AND o.pipeline_id = ?");
            params.add(pipelineId);
        }
        if (stageId != null && !stageId.isBlank()) {
            where.append(" AND o.stage_id = ?");
            params.add(stageId);
        }

        String countSql = """
            SELECT COUNT(*) FROM opportunities o
            LEFT JOIN accounts a ON a.id = o.account_id
            """ + where;
        Long total = db.queryForObject(countSql, (rs, r) -> rs.getLong(1), params.toArray());

        List<Object> dataParams = new ArrayList<>(params);
        dataParams.add(Math.min(limit, 100));
        dataParams.add((page - 1) * limit);

        List<Map<String, Object>> items = db.query(
            BASE_SELECT + where + " ORDER BY " + safeSort + " " + safeOrder + " LIMIT ? OFFSET ?",
            oppMapper, dataParams.toArray()
        );
        return new PageResponse<>(items, total == null ? 0 : total, page, limit);
    }

    public List<Map<String, Object>> listByPipeline(String pipelineId) {
        return db.query(BASE_SELECT + "WHERE o.deleted_at IS NULL AND o.pipeline_id = ? ORDER BY o.created_at ASC",
            oppMapper, pipelineId);
    }

    public Map<String, Object> getById(String id) {
        Map<String, Object> opp = db.queryForObject(BASE_SELECT + "WHERE o.id = ? AND o.deleted_at IS NULL", oppMapper, id);
        if (opp == null) throw AppException.notFound("Opportunity not found");
        return opp;
    }

    @Transactional
    public Map<String, Object> create(OpportunityRequest.Create req, SecurityPrincipal principal) {
        String id = UUID.randomUUID().toString();
        String ownerId = req.ownerId() != null ? req.ownerId() : principal.userId();

        db.execute("""
            INSERT INTO opportunities (id, name, account_id, contact_id, pipeline_id, stage_id,
                value, currency, expected_close_date, probability, owner_id,
                custom_fields, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?::date, ?, ?, ?::jsonb, NOW(), NOW())
            """,
            id, req.name(), req.accountId(), req.contactId(),
            req.pipelineId(), req.stageId(),
            req.dealValue() != null ? req.dealValue() : 0.0,
            req.currency() != null ? req.currency() : "USD",
            req.closeDate(), req.probability() != null ? req.probability() : 0,
            ownerId, toJson(req.customFields())
        );
        return getById(id);
    }

    @Transactional
    public Map<String, Object> update(String id, OpportunityRequest.Update req, SecurityPrincipal principal) {
        getById(id);

        List<String> setClauses = new ArrayList<>();
        List<Object> params = new ArrayList<>();

        if (req.name() != null) { setClauses.add("name = ?"); params.add(req.name()); }
        if (req.accountId() != null) { setClauses.add("account_id = ?"); params.add(req.accountId()); }
        if (req.contactId() != null) { setClauses.add("contact_id = ?"); params.add(req.contactId()); }
        if (req.pipelineId() != null) { setClauses.add("pipeline_id = ?"); params.add(req.pipelineId()); }
        if (req.stageId() != null) { setClauses.add("stage_id = ?"); params.add(req.stageId()); }
        if (req.dealValue() != null) { setClauses.add("value = ?"); params.add(req.dealValue()); }
        if (req.currency() != null) { setClauses.add("currency = ?"); params.add(req.currency()); }
        if (req.closeDate() != null) { setClauses.add("expected_close_date = ?::date"); params.add(req.closeDate()); }
        if (req.probability() != null) { setClauses.add("probability = ?"); params.add(req.probability()); }
        if (req.ownerId() != null) { setClauses.add("owner_id = ?"); params.add(req.ownerId()); }
        if (req.customFields() != null) { setClauses.add("custom_fields = ?::jsonb"); params.add(toJson(req.customFields())); }

        if (setClauses.isEmpty()) return getById(id);

        setClauses.add("updated_at = NOW()");
        params.add(id);
        db.execute("UPDATE opportunities SET " + String.join(", ", setClauses) + " WHERE id = ? AND deleted_at IS NULL", params.toArray());
        return getById(id);
    }

    @Transactional
    public Map<String, Object> moveStage(String id, OpportunityRequest.MoveStage req, SecurityPrincipal principal) {
        Map<String, Object> opp = getById(id);

        Map<String, Object> stage = db.queryForObject(
            "SELECT id, name, probability FROM pipeline_stages WHERE id = ? AND pipeline_id = ?",
            (rs, r) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getString("id")); m.put("name", rs.getString("name"));
                m.put("probability", rs.getInt("probability"));
                return m;
            },
            req.stageId(), opp.get("pipelineId")
        );
        if (stage == null) throw AppException.badRequest("Stage not found in this pipeline");

        db.execute("""
            UPDATE opportunities SET stage_id = ?, probability = ?, updated_at = NOW()
            WHERE id = ? AND deleted_at IS NULL
            """, req.stageId(), stage.get("probability"), id);
        return getById(id);
    }

    @Transactional
    public void delete(String id, SecurityPrincipal principal) {
        int rows = db.execute("UPDATE opportunities SET deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND deleted_at IS NULL", id);
        if (rows == 0) throw AppException.notFound("Opportunity not found");
    }

    private String toJson(Object value) {
        if (value == null) return null;
        if (value instanceof String s) return s;
        return value.toString();
    }
}
