package com.trustdesk.exception;

public class IdempotencyException extends RuntimeException {
    private final String existingActionId;

    public IdempotencyException(String message, String existingActionId) {
        super(message);
        this.existingActionId = existingActionId;
    }

    public String getExistingActionId() {
        return existingActionId;
    }
}
