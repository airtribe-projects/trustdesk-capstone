package com.trustdesk.action;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trustdesk.dto.ActionRequestDto;
import com.trustdesk.dto.ActionResponseDto;
import com.trustdesk.exception.*;
import com.trustdesk.model.Ticket;
import com.trustdesk.model.ToolActionRequest;
import com.trustdesk.repository.TicketRepository;
import com.trustdesk.repository.ToolActionRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class ToolActionService {

    private static final Logger log = LoggerFactory.getLogger(ToolActionService.class);

    @Value("${trustdesk.data.path}")
    private String dataPath;

    private final ToolActionRequestRepository actionRepo;
    private final TicketRepository ticketRepo;
    private final ObjectMapper mapper = new ObjectMapper();

    private Map<String, JsonNode> toolCatalog = new HashMap<>();

    public ToolActionService(ToolActionRequestRepository actionRepo, TicketRepository ticketRepo) {
        this.actionRepo = actionRepo;
        this.ticketRepo = ticketRepo;
    }

    @PostConstruct
    public void loadToolCatalog() {
        try {
            File file = new File(dataPath, "tool_actions.json");
            List<JsonNode> tools = mapper.readValue(file, new TypeReference<>() {});
            for (JsonNode tool : tools) {
                toolCatalog.put(tool.get("tool_name").asText(), tool);
            }
            log.info("Loaded {} tool definitions.", toolCatalog.size());
        } catch (Exception e) {
            log.error("Failed to load tool catalog", e);
        }
    }

    public ActionResponseDto requestAction(String ticketId, ActionRequestDto request) {
        // Validate ticket exists
        Ticket ticket = ticketRepo.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found: " + ticketId));

        String toolName = request.getToolName();
        Map<String, Object> payload = request.getPayload() != null ? request.getPayload() : new HashMap<>();

        // Validate tool exists
        JsonNode toolDef = toolCatalog.get(toolName);
        if (toolDef == null) {
            throw new ValidationException("Unknown tool: " + toolName);
        }

        // Validate required fields
        List<String> requiredFields = new ArrayList<>();
        toolDef.get("required_fields").forEach(f -> requiredFields.add(f.asText()));
        for (String field : requiredFields) {
            if (!payload.containsKey(field) || payload.get(field) == null) {
                throw new ValidationException("Missing required field: " + field);
            }
        }

        // Validate category
        String category = ticket.getTriageCategory();
        if (category == null) category = "general";
        List<String> allowedCategories = new ArrayList<>();
        toolDef.get("allowed_categories").forEach(c -> allowedCategories.add(c.asText()));
        if (!allowedCategories.contains(category)) {
            throw new GuardrailException("Tool '" + toolName + "' is not allowed for category '" + category + "'");
        }

        // Coupon amount validation
        if ("issue_coupon".equals(toolName) && payload.containsKey("amount")) {
            int amount = ((Number) payload.get("amount")).intValue();
            if (amount > 1000) {
                throw new GuardrailException("Coupon amount exceeds maximum limit of INR 1000. Larger coupons require manager approval.");
            }
        }

        // Idempotency check
        String idempotencyKey = (String) payload.get("idempotency_key");
        if (idempotencyKey != null) {
            Optional<ToolActionRequest> existing = actionRepo.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                throw new IdempotencyException(
                        "Action with idempotency key '" + idempotencyKey + "' already exists",
                        existing.get().getActionId());
            }
        }

        // Create action request
        boolean requiresApproval = toolDef.get("requires_human_approval").asBoolean();
        String riskLevel = toolDef.get("risk_level").asText();

        String actionId = "action_" + ticketId + "_" + System.currentTimeMillis();
        ToolActionRequest action = new ToolActionRequest();
        action.setActionId(actionId);
        action.setTicketId(ticketId);
        action.setToolName(toolName);
        try {
            action.setPayload(mapper.writeValueAsString(payload));
        } catch (Exception e) {
            action.setPayload("{}");
        }
        action.setRiskLevel(riskLevel);
        action.setRequiresHumanApproval(requiresApproval);
        action.setStatus(requiresApproval ? "approval_required" : "approved");
        action.setIdempotencyKey(idempotencyKey);
        action.setCreatedAt(OffsetDateTime.now());
        action.setUpdatedAt(OffsetDateTime.now());

        actionRepo.save(action);

        // Auto-execute if no approval needed
        if (!requiresApproval) {
            executeAction(action);
        }

        return toDto(action);
    }

    public ActionResponseDto getAction(String actionId) {
        ToolActionRequest action = actionRepo.findById(actionId)
                .orElseThrow(() -> new ResourceNotFoundException("Action not found: " + actionId));
        return toDto(action);
    }

    public ActionResponseDto approveAction(String actionId, String reviewerId, String reason) {
        ToolActionRequest action = actionRepo.findById(actionId)
                .orElseThrow(() -> new ResourceNotFoundException("Action not found: " + actionId));

        if (!"approval_required".equals(action.getStatus())) {
            throw new ValidationException("Action is not pending approval. Current status: " + action.getStatus());
        }

        action.setStatus("approved");
        action.setReviewerId(reviewerId != null ? reviewerId : "support_manager");
        action.setReviewReason(reason != null ? reason : "Approved by reviewer");
        action.setUpdatedAt(OffsetDateTime.now());
        actionRepo.save(action);

        // Execute the action
        executeAction(action);

        return toDto(action);
    }

    public ActionResponseDto rejectAction(String actionId, String reviewerId, String reason) {
        ToolActionRequest action = actionRepo.findById(actionId)
                .orElseThrow(() -> new ResourceNotFoundException("Action not found: " + actionId));

        if (!"approval_required".equals(action.getStatus())) {
            throw new ValidationException("Action is not pending approval. Current status: " + action.getStatus());
        }

        action.setStatus("rejected");
        action.setReviewerId(reviewerId != null ? reviewerId : "support_manager");
        action.setReviewReason(reason != null ? reason : "Rejected by reviewer");
        action.setUpdatedAt(OffsetDateTime.now());
        actionRepo.save(action);

        return toDto(action);
    }

    public List<ActionResponseDto> getActionsForTicket(String ticketId) {
        return actionRepo.findByTicketId(ticketId).stream().map(this::toDto).toList();
    }

    private void executeAction(ToolActionRequest action) {
        // Simulated execution - in production this would call real services
        String result;
        switch (action.getToolName()) {
            case "create_replacement_order" -> result = "Replacement order created. Tracking will be available within 24 hours.";
            case "start_refund_review" -> result = "Refund review initiated. Payment operations will review within 2-3 business days.";
            case "issue_coupon" -> result = "Goodwill coupon issued to customer account.";
            case "open_carrier_investigation" -> result = "Carrier investigation opened. Expected resolution: 3-5 business days.";
            case "escalate_to_human" -> result = "Ticket escalated to human support specialist queue.";
            case "lock_account" -> result = "Account locked pending security review.";
            default -> result = "Action executed.";
        }

        action.setStatus("executed");
        action.setExecutionResult(result);
        action.setUpdatedAt(OffsetDateTime.now());
        actionRepo.save(action);
    }

    private ActionResponseDto toDto(ToolActionRequest action) {
        ActionResponseDto dto = new ActionResponseDto();
        dto.setActionId(action.getActionId());
        dto.setTicketId(action.getTicketId());
        dto.setToolName(action.getToolName());
        dto.setStatus(action.getStatus());
        dto.setIdempotencyKey(action.getIdempotencyKey());
        dto.setRequiresHumanApproval(action.isRequiresHumanApproval());
        dto.setExecutionResult(action.getExecutionResult());
        dto.setReviewerId(action.getReviewerId());
        dto.setReviewReason(action.getReviewReason());
        dto.setCreatedAt(action.getCreatedAt() != null ? action.getCreatedAt().toString() : null);
        return dto;
    }
}
