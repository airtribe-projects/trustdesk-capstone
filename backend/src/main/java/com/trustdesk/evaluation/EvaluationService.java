package com.trustdesk.evaluation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trustdesk.dto.DraftReplyDto;
import com.trustdesk.dto.TriageResultDto;
import com.trustdesk.model.EvalRun;
import com.trustdesk.repository.EvalRunRepository;
import com.trustdesk.service.DraftReplyService;
import com.trustdesk.service.TriageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.*;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class EvaluationService {

    private static final Logger log = LoggerFactory.getLogger(EvaluationService.class);

    @Value("${trustdesk.data.path}")
    private String dataPath;

    private final TriageService triageService;
    private final DraftReplyService draftReplyService;
    private final EvalRunRepository evalRunRepo;
    private final ObjectMapper mapper = new ObjectMapper();

    public EvaluationService(TriageService triageService, DraftReplyService draftReplyService,
                             EvalRunRepository evalRunRepo) {
        this.triageService = triageService;
        this.draftReplyService = draftReplyService;
        this.evalRunRepo = evalRunRepo;
    }

    public Map<String, Object> runEvaluation() {
        String evalRunId = "eval_run_" + System.currentTimeMillis();
        OffsetDateTime startedAt = OffsetDateTime.now();

        List<JsonNode> evalCases = loadEvalCases();
        List<Map<String, Object>> caseResults = new ArrayList<>();

        int categoryCorrect = 0;
        int priorityCorrect = 0;
        int citationCovered = 0;
        int unsafeBlocked = 0;
        int totalUnsafeCases = 0;
        int escalationCorrect = 0;

        for (JsonNode evalCase : evalCases) {
            String caseId = evalCase.get("case_id").asText();
            String ticketId = evalCase.get("ticket_id").asText();
            JsonNode expected = evalCase.get("expected");

            Map<String, Object> caseResult = new LinkedHashMap<>();
            caseResult.put("case_id", caseId);
            caseResult.put("ticket_id", ticketId);

            try {
                // Run triage
                TriageResultDto triage = triageService.triage(ticketId);
                caseResult.put("predicted_category", triage.getCategory());
                caseResult.put("predicted_priority", triage.getPriority());
                caseResult.put("should_escalate", triage.isShouldEscalate());

                // Check category
                String expectedCategory = expected.get("category").asText();
                boolean categoryMatch = expectedCategory.equals(triage.getCategory());
                caseResult.put("category_match", categoryMatch);
                if (categoryMatch) categoryCorrect++;

                // Check priority
                String expectedPriority = expected.get("priority").asText();
                boolean priorityMatch = expectedPriority.equals(triage.getPriority());
                caseResult.put("priority_match", priorityMatch);
                if (priorityMatch) priorityCorrect++;

                // Run draft reply
                DraftReplyDto draft = draftReplyService.generateDraft(ticketId);
                caseResult.put("citations", draft.getCitations());
                caseResult.put("recommended_actions",
                        draft.getRecommendedActions() != null ?
                                draft.getRecommendedActions().stream()
                                        .map(a -> a.get("tool_name").toString())
                                        .toList() : List.of());

                // Check citation coverage
                List<String> mustCiteDocs = new ArrayList<>();
                expected.get("must_cite_doc_ids").forEach(d -> mustCiteDocs.add(d.asText()));
                boolean allCited = draft.getCitations() != null && draft.getCitations().containsAll(mustCiteDocs);
                caseResult.put("citation_covered", allCited);
                if (allCited) citationCovered++;

                // Check disallowed actions are blocked
                List<String> disallowedActions = new ArrayList<>();
                if (expected.has("disallowed_actions")) {
                    expected.get("disallowed_actions").forEach(a -> disallowedActions.add(a.asText()));
                }
                List<String> recommendedToolNames = draft.getRecommendedActions() != null ?
                        draft.getRecommendedActions().stream()
                                .map(a -> a.get("tool_name").toString())
                                .toList() : List.of();

                boolean noDisallowedExecuted = true;
                for (String disallowed : disallowedActions) {
                    if (recommendedToolNames.contains(disallowed)) {
                        noDisallowedExecuted = false;
                        break;
                    }
                }
                if (!disallowedActions.isEmpty()) {
                    totalUnsafeCases++;
                    caseResult.put("unsafe_blocked", noDisallowedExecuted);
                    if (noDisallowedExecuted) unsafeBlocked++;
                }

                // Check escalation
                boolean expectedEscalation = expected.get("should_escalate").asBoolean();
                boolean escalationMatch = expectedEscalation == triage.isShouldEscalate();
                caseResult.put("escalation_match", escalationMatch);
                if (escalationMatch) escalationCorrect++;

                caseResult.put("passed", categoryMatch && priorityMatch && allCited && noDisallowedExecuted && escalationMatch);

            } catch (Exception e) {
                log.error("Eval case {} failed: {}", caseId, e.getMessage());
                caseResult.put("passed", false);
                caseResult.put("error", e.getMessage());
            }

            caseResults.add(caseResult);
        }

        int total = evalCases.size();
        Map<String, Object> metrics = new LinkedHashMap<>();
        metrics.put("total_cases", total);
        metrics.put("category_accuracy", total > 0 ? (double) categoryCorrect / total : 0);
        metrics.put("priority_accuracy", total > 0 ? (double) priorityCorrect / total : 0);
        metrics.put("citation_coverage", total > 0 ? (double) citationCovered / total : 0);
        metrics.put("unsafe_action_block_rate", totalUnsafeCases > 0 ? (double) unsafeBlocked / totalUnsafeCases : 1.0);
        metrics.put("escalation_accuracy", total > 0 ? (double) escalationCorrect / total : 0);

        // Save eval run
        EvalRun evalRun = new EvalRun();
        evalRun.setEvalRunId(evalRunId);
        evalRun.setStartedAt(startedAt);
        evalRun.setCompletedAt(OffsetDateTime.now());
        evalRun.setTotalCases(total);
        try {
            evalRun.setMetrics(mapper.writeValueAsString(metrics));
            evalRun.setCaseResults(mapper.writeValueAsString(caseResults));
        } catch (Exception e) {
            log.error("Failed to serialize eval results", e);
        }
        evalRunRepo.save(evalRun);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("eval_run_id", evalRunId);
        result.put("metrics", metrics);
        result.put("case_results", caseResults);
        return result;
    }

    public Map<String, Object> getLatestEvaluation() {
        Optional<EvalRun> latest = evalRunRepo.findTopByOrderByStartedAtDesc();
        if (latest.isEmpty()) {
            return Map.of("message", "No evaluation runs found. Run POST /api/evaluations/run first.");
        }

        EvalRun run = latest.get();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("eval_run_id", run.getEvalRunId());
        result.put("started_at", run.getStartedAt() != null ? run.getStartedAt().toString() : null);
        result.put("completed_at", run.getCompletedAt() != null ? run.getCompletedAt().toString() : null);
        result.put("total_cases", run.getTotalCases());
        try {
            result.put("metrics", mapper.readTree(run.getMetrics()));
            result.put("case_results", mapper.readTree(run.getCaseResults()));
        } catch (Exception e) {
            result.put("metrics", run.getMetrics());
            result.put("case_results", run.getCaseResults());
        }
        return result;
    }

    private List<JsonNode> loadEvalCases() {
        List<JsonNode> cases = new ArrayList<>();
        try {
            Path file = Path.of(dataPath, "eval_cases.jsonl");
            List<String> lines = Files.readAllLines(file);
            for (String line : lines) {
                if (!line.isBlank()) {
                    cases.add(mapper.readTree(line));
                }
            }
        } catch (Exception e) {
            log.error("Failed to load eval cases", e);
        }
        return cases;
    }
}
