package com.trustdesk.retrieval;

import com.trustdesk.dto.KnowledgeSearchResultDto;
import com.trustdesk.guardrails.GuardrailService;
import com.trustdesk.model.KnowledgeDocument;
import com.trustdesk.repository.KnowledgeDocumentRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class KnowledgeRetrievalService {

    private final KnowledgeDocumentRepository kbRepo;
    private final GuardrailService guardrailService;

    // Keyword mappings for better retrieval
    private static final Map<String, List<String>> CATEGORY_KEYWORDS = Map.of(
            "refund", List.of("refund", "return", "damaged", "defective", "replacement", "money back", "broken", "cracked"),
            "shipping", List.of("shipping", "delivery", "tracking", "transit", "carrier", "package", "lost", "movement", "stale"),
            "warranty", List.of("warranty", "defect", "manufacturing", "battery", "swelling", "overheating", "safety", "gold-tier", "extension"),
            "billing", List.of("billing", "charge", "payment", "duplicate", "double charge", "invoice", "card"),
            "account_security", List.of("account", "email change", "password", "identity", "verification", "security", "lock", "takeover"),
            "coupon", List.of("coupon", "goodwill", "discount", "voucher"),
            "general", List.of("general", "support", "help", "question"),
            "security_playbook", List.of("injection", "prompt", "override", "ignore", "reveal", "hidden", "system prompt", "api key", "unsafe")
    );

    public KnowledgeRetrievalService(KnowledgeDocumentRepository kbRepo, GuardrailService guardrailService) {
        this.kbRepo = kbRepo;
        this.guardrailService = guardrailService;
    }

    public List<KnowledgeSearchResultDto> search(String query) {
        if (query == null || query.isBlank()) return List.of();

        String queryLower = query.toLowerCase();
        List<KnowledgeDocument> allDocs = kbRepo.findAll();
        List<KnowledgeSearchResultDto> results = new ArrayList<>();

        for (KnowledgeDocument doc : allDocs) {
            // Skip adversarial document from normal retrieval results
            if (guardrailService.isDocumentAdversarial(doc.getDocId())) {
                continue;
            }

            double score = calculateRelevance(queryLower, doc);
            if (score > 0) {
                String snippet = extractSnippet(doc.getContent(), queryLower);
                results.add(new KnowledgeSearchResultDto(doc.getDocId(), doc.getTitle(), snippet, score));
            }
        }

        results.sort((a, b) -> Double.compare(b.getScore(), a.getScore()));
        return results.stream().limit(5).collect(Collectors.toList());
    }

    public List<KnowledgeSearchResultDto> searchForTicket(String subject, String body, String category) {
        String combinedQuery = (subject != null ? subject : "") + " " + (body != null ? body : "");
        List<KnowledgeSearchResultDto> results = search(combinedQuery);

        // Boost results matching the category
        if (category != null && !results.isEmpty()) {
            // If we have category-specific documents, ensure they're included
            List<String> categoryKeywords = CATEGORY_KEYWORDS.getOrDefault(category, List.of());
            for (KnowledgeSearchResultDto r : results) {
                for (String kw : categoryKeywords) {
                    if (r.getTitle().toLowerCase().contains(kw) || r.getDocId().toLowerCase().contains(kw.replace("_", "-"))) {
                        r.setScore(r.getScore() + 0.2);
                    }
                }
            }
            results.sort((a, b) -> Double.compare(b.getScore(), a.getScore()));
        }

        return results;
    }

    private double calculateRelevance(String query, KnowledgeDocument doc) {
        String contentLower = doc.getContent().toLowerCase();
        String titleLower = doc.getTitle().toLowerCase();

        String[] queryTerms = query.split("\\s+");
        int matchCount = 0;
        int totalTerms = queryTerms.length;

        for (String term : queryTerms) {
            if (term.length() < 3) continue;
            if (contentLower.contains(term)) matchCount++;
            if (titleLower.contains(term)) matchCount += 2; // title matches worth more
        }

        if (totalTerms == 0) return 0;
        double score = (double) matchCount / (totalTerms * 3); // normalize

        // Check category keyword matches
        for (var entry : CATEGORY_KEYWORDS.entrySet()) {
            for (String keyword : entry.getValue()) {
                if (query.contains(keyword) && contentLower.contains(keyword)) {
                    score += 0.15;
                }
            }
        }

        return Math.min(score, 1.0);
    }

    private String extractSnippet(String content, String query) {
        String[] lines = content.split("\n");
        String[] queryTerms = query.split("\\s+");

        // Find the most relevant line
        String bestLine = null;
        int bestScore = 0;
        for (String line : lines) {
            if (line.startsWith("#") || line.startsWith("Doc ID:") || line.startsWith("Audience:") || line.startsWith("Version:")) {
                continue;
            }
            String lineLower = line.toLowerCase().trim();
            if (lineLower.isEmpty()) continue;

            int lineScore = 0;
            for (String term : queryTerms) {
                if (term.length() >= 3 && lineLower.contains(term)) {
                    lineScore++;
                }
            }
            if (lineScore > bestScore) {
                bestScore = lineScore;
                bestLine = line.trim();
            }
        }

        if (bestLine != null && bestLine.length() > 200) {
            bestLine = bestLine.substring(0, 200) + "...";
        }

        return bestLine != null ? bestLine : content.substring(0, Math.min(content.length(), 200)) + "...";
    }
}
