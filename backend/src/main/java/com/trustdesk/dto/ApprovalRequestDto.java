package com.trustdesk.dto;

public class ApprovalRequestDto {
    private String reviewerId;
    private String reason;

    public String getReviewerId() { return reviewerId; }
    public void setReviewerId(String reviewerId) { this.reviewerId = reviewerId; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
