package io.opsnext.api.platform;

public class DuplicateSlugException extends RuntimeException {
    public DuplicateSlugException(String slug) {
        super("Tenant slug already exists: " + slug);
    }
}
