package com.trustdesk.controller;

import com.trustdesk.evaluation.EvaluationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/evaluations")
public class EvaluationController {

    private final EvaluationService evaluationService;

    public EvaluationController(EvaluationService evaluationService) {
        this.evaluationService = evaluationService;
    }

    @PostMapping("/run")
    public ResponseEntity<Map<String, Object>> runEvaluation() {
        return ResponseEntity.ok(evaluationService.runEvaluation());
    }

    @GetMapping("/latest")
    public ResponseEntity<Map<String, Object>> getLatest() {
        return ResponseEntity.ok(evaluationService.getLatestEvaluation());
    }
}
