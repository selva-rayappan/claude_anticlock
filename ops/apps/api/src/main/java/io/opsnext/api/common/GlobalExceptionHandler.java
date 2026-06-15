package io.opsnext.api.common;

import io.opsnext.api.common.exception.TierLimitException;
import io.opsnext.api.export.ExportJobNotFoundException;
import io.opsnext.api.platform.DuplicateSlugException;
import io.opsnext.api.platform.TenantNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(DuplicateSlugException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiResponse<?> handleDuplicateSlug(DuplicateSlugException ex) {
        return ApiResponse.error("DUPLICATE_SLUG", ex.getMessage());
    }

    @ExceptionHandler(TenantNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<?> handleTenantNotFound(TenantNotFoundException ex) {
        return ApiResponse.error("TENANT_NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler(TierLimitException.class)
    @ResponseStatus(HttpStatus.PAYMENT_REQUIRED)
    public ApiResponse<?> handleTierLimit(TierLimitException ex) {
        return ApiResponse.error("TIER_LIMIT_REACHED",
                "Tier limit reached for " + ex.getLimitType() +
                " (current=" + ex.getCurrent() + ", limit=" + ex.getLimit() + ")");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<?> handleValidation(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .findFirst()
                .orElse("Validation failed");
        return ApiResponse.error("VALIDATION_ERROR", msg);
    }

    @ExceptionHandler(ExportJobNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<?> handleExportJobNotFound(ExportJobNotFoundException ex) {
        return ApiResponse.error("EXPORT_JOB_NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<?> handleIllegalArgument(IllegalArgumentException ex) {
        return ApiResponse.error("BAD_REQUEST", ex.getMessage());
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResponse<?> handleGeneral(Exception ex) {
        return ApiResponse.error("INTERNAL_ERROR", "An unexpected error occurred");
    }
}
