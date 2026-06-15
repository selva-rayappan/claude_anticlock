package io.opsnext.api.pipeline;

import io.opsnext.api.common.dto.ApiResponse;
import io.opsnext.api.common.exception.AppException;
import io.opsnext.api.security.SecurityPrincipal;
import io.opsnext.api.tenant.TenantJdbcTemplate;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/pipelines")
@RequiredArgsConstructor
@Tag(name = "Pipelines")
@SecurityRequirement(name = "bearerAuth")
public class PipelineController {

    private final TenantJdbcTemplate db;

    @GetMapping
    @Operation(summary = "List all pipelines with their stages")
    public ApiResponse<List<Map<String, Object>>> list(
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        List<Map<String, Object>> pipelines = db.query("""
            SELECT id, name, is_default, is_active, created_at, updated_at
            FROM pipelines
            WHERE is_active = true
            ORDER BY is_default DESC, name ASC
            """,
            (rs, row) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getString("id"));
                m.put("name", rs.getString("name"));
                m.put("isDefault", rs.getBoolean("is_default"));
                m.put("isActive", rs.getBoolean("is_active"));
                m.put("stages", List.of()); // populated below
                m.put("createdAt", rs.getTimestamp("created_at"));
                return m;
            }
        );

        // Load stages for each pipeline
        for (Map<String, Object> pipeline : pipelines) {
            String pipelineId = (String) pipeline.get("id");
            List<Map<String, Object>> stages = db.query("""
                SELECT id, name, display_order, probability, is_closed, is_won, rot_color
                FROM pipeline_stages
                WHERE pipeline_id = ?
                ORDER BY display_order ASC
                """,
                (rs, row) -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getString("id"));
                    m.put("name", rs.getString("name"));
                    m.put("displayOrder", rs.getInt("display_order"));
                    m.put("probability", rs.getInt("probability"));
                    m.put("isClosed", rs.getBoolean("is_closed"));
                    m.put("isWon", rs.getBoolean("is_won"));
                    m.put("color", rs.getString("rot_color"));
                    return m;
                },
                pipelineId
            );
            pipeline.put("stages", stages);
        }

        return ApiResponse.success(pipelines);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a pipeline with stages and opportunity counts")
    public ApiResponse<Map<String, Object>> getById(
        @PathVariable String id,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        Map<String, Object> pipeline = db.queryForObject("""
            SELECT id, name, is_default, is_active, created_at, updated_at
            FROM pipelines WHERE id = ? AND is_active = true
            """,
            (rs, row) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getString("id"));
                m.put("name", rs.getString("name"));
                m.put("isDefault", rs.getBoolean("is_default"));
                m.put("isActive", rs.getBoolean("is_active"));
                return m;
            }, id
        );
        if (pipeline == null) throw AppException.notFound("Pipeline not found");

        List<Map<String, Object>> stages = db.query("""
            SELECT ps.id, ps.name, ps.display_order, ps.probability, ps.is_closed, ps.is_won, ps.rot_color,
                   COUNT(o.id) AS opportunity_count,
                   COALESCE(SUM(o.deal_value), 0) AS total_value
            FROM pipeline_stages ps
            LEFT JOIN opportunities o ON o.stage_id = ps.id AND o.deleted_at IS NULL
            WHERE ps.pipeline_id = ?
            GROUP BY ps.id, ps.name, ps.display_order, ps.probability, ps.is_closed, ps.is_won, ps.rot_color
            ORDER BY ps.display_order ASC
            """,
            (rs, row) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getString("id"));
                m.put("name", rs.getString("name"));
                m.put("displayOrder", rs.getInt("display_order"));
                m.put("probability", rs.getInt("probability"));
                m.put("isClosed", rs.getBoolean("is_closed"));
                m.put("isWon", rs.getBoolean("is_won"));
                m.put("color", rs.getString("rot_color"));
                m.put("opportunityCount", rs.getInt("opportunity_count"));
                m.put("totalValue", rs.getDouble("total_value"));
                return m;
            }, id
        );

        pipeline.put("stages", stages);
        return ApiResponse.success(pipeline);
    }
}
