package io.opsnext.api.common.exception;

import lombok.Getter;

@Getter
public class TierLimitException extends RuntimeException {

    private final String currentTier;
    private final String limitType;
    private final int limit;
    private final int current;

    public TierLimitException(String currentTier, String limitType, int limit, int current) {
        super("Tier limit reached: " + limitType + " (current=" + current + ", limit=" + limit + ")");
        this.currentTier = currentTier;
        this.limitType = limitType;
        this.limit = limit;
        this.current = current;
    }
}
