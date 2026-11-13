package com.trustdesk.dto;

public class TriageResultDto {
    private String ticketId;
    private String category;
    private String priority;
    private String sentiment;
    private boolean shouldEscalate;
    private String reasonSummary;
    private String runId;

    public String getTicketId() { return ticketId; }
    public void setTicketId(String ticketId) { this.ticketId = ticketId; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }
    public String getSentiment() { return sentiment; }
    public void setSentiment(String sentiment) { this.sentiment = sentiment; }
    public boolean isShouldEscalate() { return shouldEscalate; }
    public void setShouldEscalate(boolean shouldEscalate) { this.shouldEscalate = shouldEscalate; }
    public String getReasonSummary() { return reasonSummary; }
    public void setReasonSummary(String reasonSummary) { this.reasonSummary = reasonSummary; }
    public String getRunId() { return runId; }
    public void setRunId(String runId) { this.runId = runId; }
}
