package com.trustdesk.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "agent_run_traces")
public class AgentRunTrace {
    @Id
    @Column(name = "run_id")
    private String runId;

    @Column(name = "ticket_id")
    private String ticketId;

    @Column(name = "run_type")
    private String runType;

    private String status;

    @Column(name = "retrieved_doc_ids", length = 1000)
    private String retrievedDocIds;

    @Column(name = "tool_calls", length = 2000)
    private String toolCalls;

    @Column(name = "guardrail_results", length = 2000)
    private String guardrailResults;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public AgentRunTrace() {}

    public String getRunId() { return runId; }
    public void setRunId(String runId) { this.runId = runId; }
    public String getTicketId() { return ticketId; }
    public void setTicketId(String ticketId) { this.ticketId = ticketId; }
    public String getRunType() { return runType; }
    public void setRunType(String runType) { this.runType = runType; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getRetrievedDocIds() { return retrievedDocIds; }
    public void setRetrievedDocIds(String retrievedDocIds) { this.retrievedDocIds = retrievedDocIds; }
    public String getToolCalls() { return toolCalls; }
    public void setToolCalls(String toolCalls) { this.toolCalls = toolCalls; }
    public String getGuardrailResults() { return guardrailResults; }
    public void setGuardrailResults(String guardrailResults) { this.guardrailResults = guardrailResults; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
