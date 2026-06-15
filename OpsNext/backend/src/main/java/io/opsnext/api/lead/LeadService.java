package io.opsnext.api.lead;

import io.opsnext.api.common.dto.PageResponse;
import io.opsnext.api.common.exception.AppException;
import io.opsnext.api.lead.dto.LeadRequest;
import io.opsnext.api.security.SecurityPrincipal;
import io.opsnext.api.tenant.TenantJdbcTemplate;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class LeadService {

    private final TenantJdbcTemplate db;

    private static final Set<String> SORTABLE_COLUMNS = Set.of(
        "first_name", "last_name", "email", "company", "score", "status", "created_at", "updated_at"
    );

    private final RowMapper<Map<String, Object>> leadMapper = (rs, row) -> {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", rs.getString("id"));
        m.put("firstName", rs.getString("first_name"));
        m.put("lastName", rs.getString("last_name"));
        m.put("email", rs.getString("email"));
        m.put("company", rs.getString("company"));
        m.put("phone", rs.getString("phone"));
        m.put("source", rs.getString("source"));
        m.put("status", rs.getString("status"));
        m.put("score", rs.getInt("score"));
        m.put("ownerId", rs.getString("owner_id"));
        m.put("ownerName", rs.getString("owner_name"));
        m.put("convertedAt", rs.getTimestamp("converted_at"));
        m.put("convertedContactId", rs.getString("converted_to_contact_id"));
        m.put("convertedAccountId", rs.getString("converted_to_account_id"));
        m.put("customFields", rs.getString("custom_fields"));
        m.put("createdAt", rs.getTimestamp("created_at"));
        m.put("updatedAt", rs.getTimestamp("updated_at"));
        return m;
    };

    public PageResponse<Map<String, Object>> list(
        int page, int limit, String search,
        String ownerId, String status, String sort, String order,
        SecurityPrincipal principal
    ) {
        String safeSort = SORTABLE_COLUMNS.contains(sort) ? "l." + sort : "l.created_at";
        String safeOrder = "asc".equalsIgnoreCase(order) ? "ASC" : "DESC";

        List<Object> params = new ArrayList<>();
        StringBuilder where = new StringBuilder("WHERE l.deleted_at IS NULL");

        if (search != null && !search.isBlank()) {
            where.append(" AND (l.first_name ILIKE ? OR l.last_name ILIKE ? OR l.email ILIKE ? OR l.company ILIKE ?)");
            String like = "%" + search.trim() + "%";
            params.add(like); params.add(like); params.add(like); params.add(like);
        }
        if (ownerId != null && !ownerId.isBlank()) {
            where.append(" AND l.owner_id = ?");
            params.add(ownerId);
        }
        if (status != null && !status.isBlank()) {
            where.append(" AND l.status = ?");
            params.add(status);
        }

        Long total = db.queryForObject("SELECT COUNT(*) FROM leads l " + where, (rs, r) -> rs.getLong(1), params.toArray());

        String dataSql = """
            SELECT l.*, l.custom_fields::text AS custom_fields,
                   CONCAT(u.first_name, ' ', u.last_name) AS owner_name
            FROM leads l
            LEFT JOIN users u ON u.id = l.owner_id
            """ + where + " ORDER BY " + safeSort + " " + safeOrder + " LIMIT ? OFFSET ?";

        List<Object> dataParams = new ArrayList<>(params);
        dataParams.add(Math.min(limit, 100));
        dataParams.add((page - 1) * limit);

        return new PageResponse<>(db.query(dataSql, leadMapper, dataParams.toArray()), total == null ? 0 : total, page, limit);
    }

    public Map<String, Object> getById(String id) {
        Map<String, Object> lead = db.queryForObject("""
            SELECT l.*, l.custom_fields::text AS custom_fields,
                   CONCAT(u.first_name, ' ', u.last_name) AS owner_name
            FROM leads l
            LEFT JOIN users u ON u.id = l.owner_id
            WHERE l.id = ? AND l.deleted_at IS NULL
            """, leadMapper, id);
        if (lead == null) throw AppException.notFound("Lead not found");
        return lead;
    }

    @Transactional
    public Map<String, Object> create(LeadRequest.Create req, SecurityPrincipal principal) {
        String id = UUID.randomUUID().toString();
        String ownerId = req.ownerId() != null ? req.ownerId() : principal.userId();
        String status = req.status() != null ? req.status() : "NEW";

        db.execute("""
            INSERT INTO leads (id, first_name, last_name, email, company, phone,
                source, status, score, owner_id, custom_fields, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, NOW(), NOW())
            """,
            id, req.firstName(), req.lastName(), req.email(), req.company(),
            req.phone(), req.source(), status,
            req.score() != null ? req.score() : 0,
            ownerId, toJson(req.customFields())
        );
        return getById(id);
    }

    @Transactional
    public Map<String, Object> update(String id, LeadRequest.Update req, SecurityPrincipal principal) {
        getById(id);

        List<String> setClauses = new ArrayList<>();
        List<Object> params = new ArrayList<>();

        if (req.firstName() != null) { setClauses.add("first_name = ?"); params.add(req.firstName()); }
        if (req.lastName() != null) { setClauses.add("last_name = ?"); params.add(req.lastName()); }
        if (req.email() != null) { setClauses.add("email = ?"); params.add(req.email()); }
        if (req.company() != null) { setClauses.add("company = ?"); params.add(req.company()); }
        if (req.phone() != null) { setClauses.add("phone = ?"); params.add(req.phone()); }
        if (req.source() != null) { setClauses.add("source = ?"); params.add(req.source()); }
        if (req.status() != null) { setClauses.add("status = ?"); params.add(req.status()); }
        if (req.ownerId() != null) { setClauses.add("owner_id = ?"); params.add(req.ownerId()); }
        if (req.score() != null) { setClauses.add("score = ?"); params.add(req.score()); }
        if (req.customFields() != null) { setClauses.add("custom_fields = ?::jsonb"); params.add(toJson(req.customFields())); }

        if (setClauses.isEmpty()) return getById(id);

        setClauses.add("updated_at = NOW()");
        params.add(id);
        db.execute("UPDATE leads SET " + String.join(", ", setClauses) + " WHERE id = ? AND deleted_at IS NULL", params.toArray());
        return getById(id);
    }

    @Transactional
    public Map<String, Object> convert(String id, LeadRequest.Convert req, SecurityPrincipal principal) {
        Map<String, Object> lead = getById(id);
        if (lead.get("convertedAt") != null) {
            throw AppException.conflict("Lead has already been converted");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        String contactId = null;
        String accountId = req.accountId();

        if (req.createAccount() && accountId == null) {
            accountId = UUID.randomUUID().toString();
            String company = (String) lead.get("company");
            db.execute("""
                INSERT INTO accounts (id, name, owner_id, created_at, updated_at)
                VALUES (?, ?, ?, NOW(), NOW())
                """, accountId, company != null ? company : "Unknown", lead.get("ownerId"));
            result.put("accountId", accountId);
        }

        if (req.createContact()) {
            contactId = UUID.randomUUID().toString();
            db.execute("""
                INSERT INTO contacts (id, first_name, last_name, email, account_id,
                    owner_id, source, lead_source, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                """,
                contactId, lead.get("firstName"), lead.get("lastName"), lead.get("email"),
                accountId, lead.get("ownerId"), lead.get("source"), "LEAD"
            );
            result.put("contactId", contactId);
        }

        if (req.createOpportunity() && req.pipelineId() != null && req.stageId() != null) {
            String oppId = UUID.randomUUID().toString();
            String oppName = req.opportunityName() != null ? req.opportunityName()
                : lead.get("firstName") + " " + lead.get("lastName") + " - Opportunity";
            db.execute("""
                INSERT INTO opportunities (id, name, account_id, contact_id, pipeline_id, stage_id,
                    value, owner_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                """,
                oppId, oppName, accountId, contactId,
                req.pipelineId(), req.stageId(),
                req.dealValue() != null ? req.dealValue() : 0.0,
                lead.get("ownerId")
            );
            result.put("opportunityId", oppId);
        }

        db.execute("""
            UPDATE leads SET status = 'CONVERTED', converted_at = NOW(),
                converted_to_contact_id = ?, converted_to_account_id = ?, updated_at = NOW()
            WHERE id = ?
            """, contactId, accountId, id);

        result.put("leadId", id);
        result.put("converted", true);
        return result;
    }

    @Transactional
    public void delete(String id, SecurityPrincipal principal) {
        int rows = db.execute("UPDATE leads SET deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND deleted_at IS NULL", id);
        if (rows == 0) throw AppException.notFound("Lead not found");
    }

    private String toJson(Object value) {
        if (value == null) return null;
        if (value instanceof String s) return s;
        return value.toString();
    }
}
