package com.trustdesk.controller;

import com.trustdesk.action.ToolActionService;
import com.trustdesk.dto.ActionResponseDto;
import com.trustdesk.dto.ApprovalRequestDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/actions")
public class ActionController {

    private final ToolActionService toolActionService;

    public ActionController(ToolActionService toolActionService) {
        this.toolActionService = toolActionService;
    }

    @GetMapping("/{actionId}")
    public ResponseEntity<ActionResponseDto> getAction(@PathVariable String actionId) {
        return ResponseEntity.ok(toolActionService.getAction(actionId));
    }

    @PostMapping("/{actionId}/approve")
    public ResponseEntity<ActionResponseDto> approveAction(
            @PathVariable String actionId,
            @RequestBody(required = false) ApprovalRequestDto request) {
        String reviewerId = request != null ? request.getReviewerId() : null;
        String reason = request != null ? request.getReason() : null;
        return ResponseEntity.ok(toolActionService.approveAction(actionId, reviewerId, reason));
    }

    @PostMapping("/{actionId}/reject")
    public ResponseEntity<ActionResponseDto> rejectAction(
            @PathVariable String actionId,
            @RequestBody(required = false) ApprovalRequestDto request) {
        String reviewerId = request != null ? request.getReviewerId() : null;
        String reason = request != null ? request.getReason() : null;
        return ResponseEntity.ok(toolActionService.rejectAction(actionId, reviewerId, reason));
    }
}
