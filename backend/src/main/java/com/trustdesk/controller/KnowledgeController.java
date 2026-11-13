package com.trustdesk.controller;

import com.trustdesk.dto.KnowledgeSearchResultDto;
import com.trustdesk.retrieval.KnowledgeRetrievalService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/knowledge")
public class KnowledgeController {

    private final KnowledgeRetrievalService retrievalService;

    public KnowledgeController(KnowledgeRetrievalService retrievalService) {
        this.retrievalService = retrievalService;
    }

    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> search(@RequestParam String q) {
        List<KnowledgeSearchResultDto> results = retrievalService.search(q);
        return ResponseEntity.ok(Map.of("query", q, "results", results));
    }
}
