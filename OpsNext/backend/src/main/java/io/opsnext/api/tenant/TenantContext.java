package io.opsnext.api.tenant;

public final class TenantContext {

    private static final ThreadLocal<String> CURRENT_TENANT = new ThreadLocal<>();
    private static final ThreadLocal<String> CURRENT_SCHEMA = new ThreadLocal<>();

    private TenantContext() {}

    public static void set(String tenantId) {
        CURRENT_TENANT.set(tenantId);
    }

    public static void setSchema(String schemaName) {
        CURRENT_SCHEMA.set(schemaName);
    }

    public static String get() {
        return CURRENT_TENANT.get();
    }

    public static String getSchema() {
        return CURRENT_SCHEMA.get();
    }

    public static void clear() {
        CURRENT_TENANT.remove();
        CURRENT_SCHEMA.remove();
    }

    public static boolean hasTenant() {
        return CURRENT_TENANT.get() != null;
    }
}
