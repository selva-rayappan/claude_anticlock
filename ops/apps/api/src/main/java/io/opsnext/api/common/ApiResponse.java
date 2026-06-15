package io.opsnext.api.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(T data, Object meta, List<ApiError> errors) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(data, null, List.of());
    }

    public static <T> ApiResponse<T> ok(T data, Object meta) {
        return new ApiResponse<>(data, meta, List.of());
    }

    public static <T> ApiResponse<T> error(String code, String message) {
        return new ApiResponse<>(null, null, List.of(new ApiError(code, message)));
    }

    public record ApiError(String code, String message) {}

    public record PageMeta(long total, int page, int size, int pages) {}
}
