package io.opsnext.api.contact;

import io.opsnext.api.common.dto.PageResponse;
import io.opsnext.api.common.exception.AppException;
import io.opsnext.api.contact.dto.ContactRequest;
import io.opsnext.api.security.SecurityPrincipal;
import io.opsnext.api.tenant.TenantJdbcTemplate;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class ContactService {

    private final TenantJdbcTemplate db;

    private static final Set<String> SORTABLE_COLUMNS = Set.of(
        "first_name", "last_name", "email", "created_at", "updated_at", "title"
    );

    private final RowMapper<Map<String, Object>> contactMapper = (rs, row) -> {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", rs.getString("id"));
        m.put("firstName", rs.getString("first_name"));
        m.put("lastName", rs.getString("last_name"));
        m.put("email", rs.getString("email"));
        m.put("title", rs.getString("title"));
        m.put("source", rs.getString("source"));
        m.put("leadSource", rs.getString("lead_source"));
        m.put("emailOptOut", rs.getBoolean("email_opt_out"));
        m.put("accountId", rs.getString("account_id"));
        m.put("accountName", rs.getString("account_name"));
        m.put("ownerId", rs.getString("owner_id"));
        m.put("ownerName", rs.getString("owner_name"));

        java.sql.Array tagsArray = null;
        try {
            tagsArray = rs.getArray("tags");
        } catch (Exception e) {
            // ignore
        }
        List<String> tagsList = List.of();
        if (tagsArray != null) {
            try {
                String[] arr = (String[]) tagsArray.getArray();
                if (arr != null) {
                    tagsList = Arrays.asList(arr);
                }
            } catch (Exception e) {
                // ignore
            }
        }
        m.put("tags", tagsList);

        m.put("phones", rs.getString("phones"));
        m.put("address", rs.getString("address"));
        m.put("socialHandles", rs.getString("social_handles"));
        m.put("customFields", rs.getString("custom_fields"));
        m.put("createdAt", rs.getTimestamp("created_at"));
        m.put("updatedAt", rs.getTimestamp("updated_at"));
        return m;
    };

    public PageResponse<Map<String, Object>> list(
        int page, int limit, String search,
        String ownerId, String accountId, String sort, String order,
        SecurityPrincipal principal
    ) {
        String safeSort = SORTABLE_COLUMNS.contains(sort) ? "c." + sort : "c.created_at";
        String safeOrder = "asc".equalsIgnoreCase(order) ? "ASC" : "DESC";

        List<Object> params = new ArrayList<>();
        StringBuilder where = new StringBuilder("WHERE c.deleted_at IS NULL");

        if (search != null && !search.isBlank()) {
            where.append(" AND (c.first_name ILIKE ? OR c.last_name ILIKE ? OR c.email ILIKE ?)");
            String like = "%" + search.trim() + "%";
            params.add(like); params.add(like); params.add(like);
        }
        if (ownerId != null && !ownerId.isBlank()) {
            where.append(" AND c.owner_id = ?");
            params.add(ownerId);
        }
        if (accountId != null && !accountId.isBlank()) {
            where.append(" AND c.account_id = ?");
            params.add(accountId);
        }

        String countSql = "SELECT COUNT(*) FROM contacts c " + where;
        Long total = db.queryForObject(countSql, (rs, r) -> rs.getLong(1), params.toArray());

        String dataSql = """
            SELECT c.*, a.name AS account_name,
                   CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
                   c.phones::text AS phones,
                   c.address::text AS address,
                   c.social_handles::text AS social_handles,
                   c.custom_fields::text AS custom_fields
            FROM contacts c
            LEFT JOIN accounts a ON a.id = c.account_id
            LEFT JOIN users u ON u.id = c.owner_id
            """ + where + " ORDER BY " + safeSort + " " + safeOrder + " LIMIT ? OFFSET ?";

        List<Object> dataParams = new ArrayList<>(params);
        dataParams.add(Math.min(limit, 100));
        dataParams.add((page - 1) * limit);

        List<Map<String, Object>> items = db.query(dataSql, contactMapper, dataParams.toArray());
        return new PageResponse<>(items, total == null ? 0 : total, page, limit);
    }

    public Map<String, Object> getById(String id) {
        String sql = """
            SELECT c.*, a.name AS account_name,
                   CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
                   c.phones::text AS phones,
                   c.address::text AS address,
                   c.social_handles::text AS social_handles,
                   c.custom_fields::text AS custom_fields
            FROM contacts c
            LEFT JOIN accounts a ON a.id = c.account_id
            LEFT JOIN users u ON u.id = c.owner_id
            WHERE c.id = ? AND c.deleted_at IS NULL
            """;
        Map<String, Object> contact = db.queryForObject(sql, contactMapper, id);
        if (contact == null) throw AppException.notFound("Contact not found");
        return contact;
    }

    @Transactional
    public Map<String, Object> create(ContactRequest.Create req, SecurityPrincipal principal) {
        String id = UUID.randomUUID().toString();
        String ownerId = req.ownerId() != null ? req.ownerId() : principal.userId();

        db.execute("""
            INSERT INTO contacts (id, first_name, last_name, email, title, account_id, owner_id,
                source, lead_source, email_opt_out, tags, phones, address,
                social_handles, custom_fields, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?::jsonb, ?::jsonb, NOW(), NOW())
            """,
            id, req.firstName(), req.lastName(), req.email(), req.title(),
            req.accountId(), ownerId, req.source(), req.leadSource(),
            req.emailOptOut() != null && req.emailOptOut(),
            toArray(req.tags()), toJson(req.phones()), toJson(req.address()),
            toJson(req.socialHandles()), toJson(req.customFields())
        );
        return getById(id);
    }

    @Transactional
    public Map<String, Object> update(String id, ContactRequest.Update req, SecurityPrincipal principal) {
        Map<String, Object> existing = getById(id);

        List<String> setClauses = new ArrayList<>();
        List<Object> params = new ArrayList<>();

        appendIfNotNull(setClauses, params, "first_name = ?", req.firstName());
        appendIfNotNull(setClauses, params, "last_name = ?", req.lastName());
        appendIfNotNull(setClauses, params, "email = ?", req.email());
        appendIfNotNull(setClauses, params, "title = ?", req.title());
        appendIfPresent(setClauses, params, "account_id = ?", req.accountId(), existing.containsKey("accountId"));
        appendIfNotNull(setClauses, params, "owner_id = ?", req.ownerId());
        appendIfNotNull(setClauses, params, "source = ?", req.source());
        appendIfNotNull(setClauses, params, "lead_source = ?", req.leadSource());
        if (req.emailOptOut() != null) {
            setClauses.add("email_opt_out = ?");
            params.add(req.emailOptOut());
        }
        appendArrayIfNotNull(setClauses, params, "tags = ?", req.tags());
        appendJsonIfNotNull(setClauses, params, "phones = ?::jsonb", req.phones());
        appendJsonIfNotNull(setClauses, params, "address = ?::jsonb", req.address());
        appendJsonIfNotNull(setClauses, params, "social_handles = ?::jsonb", req.socialHandles());
        appendJsonIfNotNull(setClauses, params, "custom_fields = ?::jsonb", req.customFields());

        if (setClauses.isEmpty()) return getById(id);

        setClauses.add("updated_at = NOW()");
        params.add(id);
        db.execute("UPDATE contacts SET " + String.join(", ", setClauses) + " WHERE id = ? AND deleted_at IS NULL", params.toArray());
        return getById(id);
    }

    @Transactional
    public void delete(String id, SecurityPrincipal principal) {
        int rows = db.execute("UPDATE contacts SET deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND deleted_at IS NULL", id);
        if (rows == 0) throw AppException.notFound("Contact not found");
    }

    private void appendIfNotNull(List<String> clauses, List<Object> params, String clause, Object value) {
        if (value != null) { clauses.add(clause); params.add(value); }
    }

    private void appendIfPresent(List<String> clauses, List<Object> params, String clause, Object value, boolean present) {
        if (present || value != null) { clauses.add(clause); params.add(value); }
    }

    private void appendJsonIfNotNull(List<String> clauses, List<Object> params, String clause, Object value) {
        if (value != null) { clauses.add(clause); params.add(toJson(value)); }
    }

    private void appendArrayIfNotNull(List<String> clauses, List<Object> params, String clause, List<String> value) {
        if (value != null) { clauses.add(clause); params.add(toArray(value)); }
    }

    private String[] toArray(List<String> list) {
        if (list == null) return null;
        return list.toArray(new String[0]);
    }

    @SuppressWarnings("unchecked")
    private String toJson(Object value) {
        if (value == null) return null;
        if (value instanceof String s) return s;
        if (value instanceof List<?> list) return "[" + String.join(",",
            ((List<Object>) list).stream().map(e -> "\"" + e.toString().replace("\"", "\\\"") + "\"").toList()) + "]";
        return value.toString();
    }
}
