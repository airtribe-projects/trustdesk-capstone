package com.trustdesk.dto;

import java.util.List;
import java.util.Map;

public class DraftReplyDto {
    private String draftId;
    private String ticketId;
    private String status;
    private String body;
    private List<String> citations;
    private List<Map<String, Object>> recommendedActions;
    private String runId;

    public String getDraftId() { return draftId; }
    public void setDraftId(String draftId) { this.draftId = draftId; }
    public String getTicketId() { return ticketId; }
    public void setTicketId(String ticketId) { this.ticketId = ticketId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public List<String> getCitations() { return citations; }
    public void setCitations(List<String> citations) { this.citations = citations; }
    public List<Map<String, Object>> getRecommendedActions() { return recommendedActions; }
    public void setRecommendedActions(List<Map<String, Object>> recommendedActions) { this.recommendedActions = recommendedActions; }
    public String getRunId() { return runId; }
    public void setRunId(String runId) { this.runId = runId; }
}
