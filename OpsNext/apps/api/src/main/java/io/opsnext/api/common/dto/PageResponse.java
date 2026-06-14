package io.opsnext.api.common.dto;

import java.util.List;

public record PageResponse<T>(
    List<T> items,
    long total,
    int page,
    int limit,
    int totalPages
) {
    public static <T> PageResponse<T> of(List<T> items, long total, int page, int limit) {
        int totalPages = (int) Math.ceil((double) total / limit);
        return new PageResponse<>(items, total, page, limit, totalPages);
    }
}
