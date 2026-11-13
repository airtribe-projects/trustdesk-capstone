package com.trustdesk.model;

import jakarta.persistence.*;

@Entity
@Table(name = "knowledge_documents")
public class KnowledgeDocument {
    @Id
    @Column(name = "doc_id")
    private String docId;

    private String title;

    @Column(length = 10000)
    private String content;

    @Column(name = "source_path")
    private String sourcePath;

    private String version;
    private String audience;

    public KnowledgeDocument() {}

    public String getDocId() { return docId; }
    public void setDocId(String docId) { this.docId = docId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getSourcePath() { return sourcePath; }
    public void setSourcePath(String sourcePath) { this.sourcePath = sourcePath; }
    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }
    public String getAudience() { return audience; }
    public void setAudience(String audience) { this.audience = audience; }
}
