package io.opsnext.api.account;

import io.opsnext.api.account.dto.AccountRequest;
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
public class AccountService {

    private final TenantJdbcTemplate db;

    private static final Set<String> SORTABLE_COLUMNS = Set.of(
        "name", "domain", "industry", "annual_revenue", "created_at", "updated_at"
    );

    private final RowMapper<Map<String, Object>> accountMapper = (rs, row) -> {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", rs.getString("id"));
        m.put("name", rs.getString("name"));
        m.put("domain", rs.getString("domain"));
        m.put("industry", rs.getString("industry"));
        m.put("size", rs.getString("size"));
        m.put("annualRevenue", rs.getDouble("annual_revenue"));
        m.put("currency", rs.getString("currency"));
        m.put("website", rs.getString("website"));
        m.put("description", rs.getString("description"));
        m.put("source", rs.getString("source"));
        m.put("ownerId", rs.getString("owner_id"));
        m.put("ownerName", rs.getString("owner_name"));
        m.put("parentAccountId", rs.getString("parent_account_id"));
        m.put("address", rs.getString("address"));
        m.put("customFields", rs.getString("custom_fields"));
        m.put("contactCount", rs.getInt("contact_count"));
        m.put("createdAt", rs.getTimestamp("created_at"));
        m.put("updatedAt", rs.getTimestamp("updated_at"));
        return m;
    };

    public PageResponse<Map<String, Object>> list(
        int page, int limit, String search,
        String ownerId, String industry, String sort, String order,
        SecurityPrincipal principal
    ) {
        String safeSort = SORTABLE_COLUMNS.contains(sort) ? "a." + sort : "a.created_at";
        String safeOrder = "asc".equalsIgnoreCase(order) ? "ASC" : "DESC";

        List<Object> params = new ArrayList<>();
        StringBuilder where = new StringBuilder("WHERE a.deleted_at IS NULL");

        if (search != null && !search.isBlank()) {
            where.append(" AND (a.name ILIKE ? OR a.domain ILIKE ?)");
            String like = "%" + search.trim() + "%";
            params.add(like); params.add(like);
        }
        if (ownerId != null && !ownerId.isBlank()) {
            where.append(" AND a.owner_id = ?");
            params.add(ownerId);
        }
        if (industry != null && !industry.isBlank()) {
            where.append(" AND a.industry = ?");
            params.add(industry);
        }

        String countSql = "SELECT COUNT(*) FROM accounts a " + where;
        Long total = db.queryForObject(countSql, (rs, r) -> rs.getLong(1), params.toArray());

        String dataSql = """
            SELECT a.*,
                   CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
                   a.address::text AS address,
                   a.custom_fields::text AS custom_fields,
                   (SELECT COUNT(*) FROM contacts c WHERE c.account_id = a.id AND c.deleted_at IS NULL) AS contact_count
            FROM accounts a
            LEFT JOIN users u ON u.id = a.owner_id
            """ + where + " ORDER BY " + safeSort + " " + safeOrder + " LIMIT ? OFFSET ?";

        List<Object> dataParams = new ArrayList<>(params);
        dataParams.add(Math.min(limit, 100));
        dataParams.add((page - 1) * limit);

        List<Map<String, Object>> items = db.query(dataSql, accountMapper, dataParams.toArray());
        return new PageResponse<>(items, total == null ? 0 : total, page, limit);
    }

    public Map<String, Object> getById(String id) {
        String sql = """
            SELECT a.*,
                   CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
                   a.address::text AS address,
                   a.custom_fields::text AS custom_fields,
                   (SELECT COUNT(*) FROM contacts c WHERE c.account_id = a.id AND c.deleted_at IS NULL) AS contact_count
            FROM accounts a
            LEFT JOIN users u ON u.id = a.owner_id
            WHERE a.id = ? AND a.deleted_at IS NULL
            """;
        Map<String, Object> account = db.queryForObject(sql, accountMapper, id);
        if (account == null) throw AppException.notFound("Account not found");
        return account;
    }

    @Transactional
    public Map<String, Object> create(AccountRequest.Create req, SecurityPrincipal principal) {
        String id = UUID.randomUUID().toString();
        String ownerId = req.ownerId() != null ? req.ownerId() : principal.userId();

        db.execute("""
            INSERT INTO accounts (id, name, domain, industry, size, annual_revenue, currency,
                website, description, source, owner_id, parent_account_id,
                address, custom_fields, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?::company_size, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, NOW(), NOW())
            """,
            id, req.name(), req.domain(), req.industry(),
            req.size(), req.annualRevenue(), req.currency(),
            req.website(), req.description(), req.source(), ownerId,
            req.parentAccountId(), toJson(req.address()), toJson(req.customFields())
        );
        return getById(id);
    }

    @Transactional
    public Map<String, Object> update(String id, AccountRequest.Update req, SecurityPrincipal principal) {
        getById(id);

        List<String> setClauses = new ArrayList<>();
        List<Object> params = new ArrayList<>();

        if (req.name() != null) { setClauses.add("name = ?"); params.add(req.name()); }
        if (req.domain() != null) { setClauses.add("domain = ?"); params.add(req.domain()); }
        if (req.industry() != null) { setClauses.add("industry = ?"); params.add(req.industry()); }
        if (req.size() != null) { setClauses.add("size = ?::company_size"); params.add(req.size()); }
        if (req.annualRevenue() != null) { setClauses.add("annual_revenue = ?"); params.add(req.annualRevenue()); }
        if (req.currency() != null) { setClauses.add("currency = ?"); params.add(req.currency()); }
        if (req.website() != null) { setClauses.add("website = ?"); params.add(req.website()); }
        if (req.description() != null) { setClauses.add("description = ?"); params.add(req.description()); }
        if (req.source() != null) { setClauses.add("source = ?"); params.add(req.source()); }
        if (req.ownerId() != null) { setClauses.add("owner_id = ?"); params.add(req.ownerId()); }
        if (req.parentAccountId() != null) { setClauses.add("parent_account_id = ?"); params.add(req.parentAccountId()); }
        if (req.address() != null) { setClauses.add("address = ?::jsonb"); params.add(toJson(req.address())); }
        if (req.customFields() != null) { setClauses.add("custom_fields = ?::jsonb"); params.add(toJson(req.customFields())); }

        if (setClauses.isEmpty()) return getById(id);

        setClauses.add("updated_at = NOW()");
        params.add(id);
        db.execute("UPDATE accounts SET " + String.join(", ", setClauses) + " WHERE id = ? AND deleted_at IS NULL", params.toArray());
        return getById(id);
    }

    @Transactional
    public void delete(String id, SecurityPrincipal principal) {
        int rows = db.execute("UPDATE accounts SET deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND deleted_at IS NULL", id);
        if (rows == 0) throw AppException.notFound("Account not found");
    }

    public List<Map<String, Object>> getContacts(String accountId) {
        getById(accountId);
        return db.query("""
            SELECT c.id, c.first_name, c.last_name, c.email, c.title,
                   CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
                   c.created_at, c.updated_at
            FROM contacts c
            LEFT JOIN users u ON u.id = c.owner_id
            WHERE c.account_id = ? AND c.deleted_at IS NULL
            ORDER BY c.first_name, c.last_name
            LIMIT 50
            """,
            (rs, row) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getString("id"));
                m.put("firstName", rs.getString("first_name"));
                m.put("lastName", rs.getString("last_name"));
                m.put("email", rs.getString("email"));
                m.put("title", rs.getString("title"));
                m.put("ownerName", rs.getString("owner_name"));
                m.put("createdAt", rs.getTimestamp("created_at"));
                return m;
            },
            accountId
        );
    }

    private String toJson(Object value) {
        if (value == null) return null;
        if (value instanceof String s) return s;
        return value.toString();
    }
}
