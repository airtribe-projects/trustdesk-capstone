package com.trustdesk.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "tickets")
public class Ticket {
    @Id
    @Column(name = "ticket_id")
    private String ticketId;

    @Column(name = "customer_id")
    private String customerId;

    @Column(name = "order_id")
    private String orderId;

    private String channel;
    private String subject;

    @Column(length = 5000)
    private String body;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    private String status;

    @Column(name = "triage_category")
    private String triageCategory;

    @Column(name = "triage_priority")
    private String triagePriority;

    @Column(name = "triage_sentiment")
    private String triageSentiment;

    @Column(name = "triage_escalation")
    private Boolean triageEscalation;

    @Column(name = "triage_reason", length = 2000)
    private String triageReason;

    // Expected fields for evaluation only - not exposed to AI
    @Column(name = "expected_category")
    private String expectedCategory;

    @Column(name = "expected_priority")
    private String expectedPriority;

    @Column(name = "expected_sentiment")
    private String expectedSentiment;

    @Column(name = "expected_escalation")
    private Boolean expectedEscalation;

    @Column(name = "expected_actions", length = 1000)
    private String expectedActions;

    public Ticket() {}

    public String getTicketId() { return ticketId; }
    public void setTicketId(String ticketId) { this.ticketId = ticketId; }
    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }
    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }
    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }
    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getTriageCategory() { return triageCategory; }
    public void setTriageCategory(String triageCategory) { this.triageCategory = triageCategory; }
    public String getTriagePriority() { return triagePriority; }
    public void setTriagePriority(String triagePriority) { this.triagePriority = triagePriority; }
    public String getTriageSentiment() { return triageSentiment; }
    public void setTriageSentiment(String triageSentiment) { this.triageSentiment = triageSentiment; }
    public Boolean getTriageEscalation() { return triageEscalation; }
    public void setTriageEscalation(Boolean triageEscalation) { this.triageEscalation = triageEscalation; }
    public String getTriageReason() { return triageReason; }
    public void setTriageReason(String triageReason) { this.triageReason = triageReason; }
    public String getExpectedCategory() { return expectedCategory; }
    public void setExpectedCategory(String expectedCategory) { this.expectedCategory = expectedCategory; }
    public String getExpectedPriority() { return expectedPriority; }
    public void setExpectedPriority(String expectedPriority) { this.expectedPriority = expectedPriority; }
    public String getExpectedSentiment() { return expectedSentiment; }
    public void setExpectedSentiment(String expectedSentiment) { this.expectedSentiment = expectedSentiment; }
    public Boolean getExpectedEscalation() { return expectedEscalation; }
    public void setExpectedEscalation(Boolean expectedEscalation) { this.expectedEscalation = expectedEscalation; }
    public String getExpectedActions() { return expectedActions; }
    public void setExpectedActions(String expectedActions) { this.expectedActions = expectedActions; }
}
