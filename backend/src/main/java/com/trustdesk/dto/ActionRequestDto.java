package com.trustdesk.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.Map;

public class ActionRequestDto {
    @NotBlank
    private String toolName;

    private Map<String, Object> payload;

    public String getToolName() { return toolName; }
    public void setToolName(String toolName) { this.toolName = toolName; }
    public Map<String, Object> getPayload() { return payload; }
    public void setPayload(Map<String, Object> payload) { this.payload = payload; }
}
