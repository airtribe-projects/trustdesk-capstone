package com.trustdesk.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "draft_replies")
public class DraftReply {
    @Id
    @Column(name = "draft_id")
    private String draftId;

    @Column(name = "ticket_id")
    private String ticketId;

    private String status;

    @Column(length = 5000)
    private String body;

    @Column(length = 1000)
    private String citations;

    @Column(name = "recommended_actions", length = 2000)
    private String recommendedActions;

    @Column(name = "run_id")
    private String runId;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public DraftReply() {}

    public String getDraftId() { return draftId; }
    public void setDraftId(String draftId) { this.draftId = draftId; }
    public String getTicketId() { return ticketId; }
    public void setTicketId(String ticketId) { this.ticketId = ticketId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public String getCitations() { return citations; }
    public void setCitations(String citations) { this.citations = citations; }
    public String getRecommendedActions() { return recommendedActions; }
    public void setRecommendedActions(String recommendedActions) { this.recommendedActions = recommendedActions; }
    public String getRunId() { return runId; }
    public void setRunId(String runId) { this.runId = runId; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
