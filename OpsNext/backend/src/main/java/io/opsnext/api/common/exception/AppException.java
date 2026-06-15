package io.opsnext.api.common.exception;

import org.springframework.http.HttpStatus;

public class AppException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public AppException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public static AppException notFound(String entity) {
        return new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", entity + " not found");
    }

    public static AppException conflict(String message) {
        return new AppException(HttpStatus.CONFLICT, "CONFLICT", message);
    }

    public static AppException badRequest(String message) {
        return new AppException(HttpStatus.BAD_REQUEST, "BAD_REQUEST", message);
    }

    public static AppException unauthorized(String message) {
        return new AppException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", message);
    }

    public static AppException forbidden(String message) {
        return new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", message);
    }

    public static AppException tooManyRequests(String message) {
        return new AppException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", message);
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
}
