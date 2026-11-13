package com.trustdesk.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "eval_runs")
public class EvalRun {
    @Id
    @Column(name = "eval_run_id")
    private String evalRunId;

    @Column(name = "started_at")
    private OffsetDateTime startedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "total_cases")
    private int totalCases;

    @Column(length = 5000)
    private String metrics;

    @Column(name = "case_results", length = 20000)
    private String caseResults;

    public EvalRun() {}

    public String getEvalRunId() { return evalRunId; }
    public void setEvalRunId(String evalRunId) { this.evalRunId = evalRunId; }
    public OffsetDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(OffsetDateTime startedAt) { this.startedAt = startedAt; }
    public OffsetDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(OffsetDateTime completedAt) { this.completedAt = completedAt; }
    public int getTotalCases() { return totalCases; }
    public void setTotalCases(int totalCases) { this.totalCases = totalCases; }
    public String getMetrics() { return metrics; }
    public void setMetrics(String metrics) { this.metrics = metrics; }
    public String getCaseResults() { return caseResults; }
    public void setCaseResults(String caseResults) { this.caseResults = caseResults; }
}
