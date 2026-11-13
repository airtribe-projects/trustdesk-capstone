package com.trustdesk.dto;

public class KnowledgeSearchResultDto {
    private String docId;
    private String title;
    private String snippet;
    private double score;

    public KnowledgeSearchResultDto() {}

    public KnowledgeSearchResultDto(String docId, String title, String snippet, double score) {
        this.docId = docId;
        this.title = title;
        this.snippet = snippet;
        this.score = score;
    }

    public String getDocId() { return docId; }
    public void setDocId(String docId) { this.docId = docId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getSnippet() { return snippet; }
    public void setSnippet(String snippet) { this.snippet = snippet; }
    public double getScore() { return score; }
    public void setScore(double score) { this.score = score; }
}
