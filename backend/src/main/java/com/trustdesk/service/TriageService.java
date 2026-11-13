package com.trustdesk.service;

import com.trustdesk.dto.TriageResultDto;
import com.trustdesk.guardrails.GuardrailService;
import com.trustdesk.model.*;
import com.trustdesk.repository.*;
import com.trustdesk.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.*;

/**
 * Deterministic rule-based triage engine.
 * This is the fallback when no LLM API key is configured.
 * It uses keyword matching, customer context, order status, and policy rules
 * to classify tickets.
 */
@Service
public class TriageService {

    private final TicketRepository ticketRepo;
    private final CustomerRepository customerRepo;
    private final OrderRepository orderRepo;
    private final AgentRunTraceRepository traceRepo;
    private final GuardrailService guardrailService;

    public TriageService(TicketRepository ticketRepo, CustomerRepository customerRepo,
                         OrderRepository orderRepo, AgentRunTraceRepository traceRepo,
                         GuardrailService guardrailService) {
        this.ticketRepo = ticketRepo;
        this.customerRepo = customerRepo;
        this.orderRepo = orderRepo;
        this.traceRepo = traceRepo;
        this.guardrailService = guardrailService;
    }

    public TriageResultDto triage(String ticketId) {
        Ticket ticket = ticketRepo.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found: " + ticketId));
        Customer customer = customerRepo.findById(ticket.getCustomerId()).orElse(null);
        Order order = ticket.getOrderId() != null ? orderRepo.findById(ticket.getOrderId()).orElse(null) : null;

        // Run guardrail check first
        GuardrailService.GuardrailResult guardrail = guardrailService.checkInput(ticket.getSubject(), ticket.getBody());

        String category = classifyCategory(ticket, customer, order, guardrail);
        String priority = classifyPriority(ticket, customer, order, category, guardrail);
        String sentiment = classifySentiment(ticket);
        boolean shouldEscalate = determineEscalation(ticket, customer, guardrail, category);
        String reason = buildReasonSummary(ticket, customer, order, category, guardrail);

        // Store triage result on ticket
        ticket.setTriageCategory(category);
        ticket.setTriagePriority(priority);
        ticket.setTriageSentiment(sentiment);
        ticket.setTriageEscalation(shouldEscalate);
        ticket.setTriageReason(reason);
        ticketRepo.save(ticket);

        // Create trace
        String runId = "run_triage_" + ticketId + "_" + System.currentTimeMillis();
        AgentRunTrace trace = new AgentRunTrace();
        trace.setRunId(runId);
        trace.setTicketId(ticketId);
        trace.setRunType("triage");
        trace.setStatus("completed");
        trace.setRetrievedDocIds("");
        trace.setToolCalls("");
        trace.setGuardrailResults(guardrail.safe() ? "pass" : "violations: " + String.join("; ", guardrail.violations()));
        trace.setCreatedAt(OffsetDateTime.now());
        traceRepo.save(trace);

        TriageResultDto result = new TriageResultDto();
        result.setTicketId(ticketId);
        result.setCategory(category);
        result.setPriority(priority);
        result.setSentiment(sentiment);
        result.setShouldEscalate(shouldEscalate);
        result.setReasonSummary(reason);
        result.setRunId(runId);
        return result;
    }

    private String classifyCategory(Ticket ticket, Customer customer, Order order, GuardrailService.GuardrailResult guardrail) {
        String text = (ticket.getSubject() + " " + ticket.getBody()).toLowerCase();

        // Security-related classifications first
        if (guardrail.secretRequest() || text.contains("system prompt") || text.contains("api key") || text.contains("internal notes") || text.contains("hidden")) {
            if (text.contains("prompt") || text.contains("api key") || text.contains("internal")) {
                return "account_security";
            }
        }

        if (guardrail.identityBypass() || text.contains("change") && (text.contains("email") || text.contains("account")) && text.contains("identity")) {
            return "account_security";
        }

        if (text.contains("account") && (text.contains("email") || text.contains("password") || text.contains("lock") || text.contains("security"))) {
            return "account_security";
        }

        // Prompt injection - categorize as general
        if (!guardrail.safe() && (text.contains("ignore") && text.contains("instruction")) || text.contains("system override") || text.contains("coupon") && text.contains("ignore")) {
            return "general";
        }

        // Billing
        if (text.contains("double charge") || text.contains("duplicate charge") || text.contains("billing") || (text.contains("two charges") || text.contains("charged twice"))) {
            return "billing";
        }

        // Warranty
        if (text.contains("warranty") || text.contains("battery") && (text.contains("swell") || text.contains("failed") || text.contains("overheating"))) {
            return "warranty";
        }

        // Shipping
        if (text.contains("tracking") || text.contains("transit") || text.contains("shipping") || text.contains("delivery") || text.contains("package") && text.contains("not moved")) {
            return "shipping";
        }

        // Refund
        if (text.contains("refund") || text.contains("damaged") || text.contains("replacement") || text.contains("defective") || text.contains("return") || text.contains("broken") || text.contains("cracked")) {
            return "refund";
        }

        return "general";
    }

    private String classifyPriority(Ticket ticket, Customer customer, Order order, String category, GuardrailService.GuardrailResult guardrail) {
        String text = (ticket.getSubject() + " " + ticket.getBody()).toLowerCase();

        // Safety issues are always urgent
        if (text.contains("battery") && (text.contains("swell") || text.contains("overheating") || text.contains("burning"))) {
            return "urgent";
        }

        // Security issues and account changes
        if ("account_security".equals(category)) {
            return "high";
        }

        // Billing (affects funds)
        if ("billing".equals(category) && (text.contains("double charge") || text.contains("duplicate"))) {
            return "high";
        }

        // Shipping with urgency
        if ("shipping".equals(category) && (text.contains("no movement") || text.contains("not moved") || text.contains("6 business days") || text.contains("travel") || text.contains("urgent"))) {
            return "high";
        }

        // Prompt injection
        if (!guardrail.safe()) {
            return "medium";
        }

        // Damaged items from gold customers
        if (customer != null && "gold".equals(customer.getTier()) && text.contains("damaged")) {
            return "medium";
        }

        // Final sale refund requests
        if (order != null) {
            String items = order.getItems() != null ? order.getItems().toLowerCase() : "";
            if (items.contains("final_sale") && text.contains("refund")) {
                return "low";
            }
        }

        // Default based on category
        return switch (category) {
            case "refund" -> "medium";
            case "shipping" -> "medium";
            case "warranty" -> "medium";
            default -> "low";
        };
    }

    private String classifySentiment(Ticket ticket) {
        String text = (ticket.getSubject() + " " + ticket.getBody()).toLowerCase();

        if (text.contains("worried") || text.contains("concerned") || text.contains("scared") || text.contains("safety") ||
                (text.contains("battery") && (text.contains("swell") || text.contains("fail")))) {
            return "worried";
        }

        if (text.contains("frustrated") || text.contains("angry") || text.contains("annoyed") || text.contains("fix this") ||
                text.contains("quickly") || text.contains("not moved") || text.contains("damaged")) {
            return "frustrated";
        }

        if (text.contains("please") && text.contains("help")) {
            return "concerned";
        }

        return "neutral";
    }

    private boolean determineEscalation(Ticket ticket, Customer customer, GuardrailService.GuardrailResult guardrail, String category) {
        String text = (ticket.getSubject() + " " + ticket.getBody()).toLowerCase();

        // Always escalate guardrail violations
        if (!guardrail.safe()) return true;

        // Safety issues require escalation
        if (text.contains("battery") && (text.contains("swell") || text.contains("overheating"))) return true;

        // Account security changes require escalation
        if ("account_security".equals(category)) return true;

        // Unverified customer requesting account changes
        if (customer != null && !customer.isVerified() && text.contains("change") && text.contains("email")) return true;

        return false;
    }

    private String buildReasonSummary(Ticket ticket, Customer customer, Order order, String category, GuardrailService.GuardrailResult guardrail) {
        StringBuilder sb = new StringBuilder();
        String text = (ticket.getSubject() + " " + ticket.getBody()).toLowerCase();

        if (!guardrail.safe()) {
            sb.append("Security concern detected: ").append(String.join(", ", guardrail.violations())).append(". ");
            sb.append("Ticket escalated for human review. ");
            return sb.toString();
        }

        switch (category) {
            case "refund" -> {
                if (text.contains("damaged") || text.contains("defective") || text.contains("cracked")) {
                    sb.append("Damaged/defective product reported. ");
                    if (order != null && order.getEligibleReturnUntil() != null) {
                        var ticketDate = ticket.getCreatedAt().toLocalDate();
                        if (!ticketDate.isAfter(order.getEligibleReturnUntil())) {
                            sb.append("Within return window. Eligible for replacement or refund review. ");
                        } else {
                            sb.append("Return window has passed. ");
                            if (customer != null && "gold".equals(customer.getTier())) {
                                sb.append("Gold-tier customer may qualify for goodwill exception. ");
                            }
                        }
                    }
                } else if (text.contains("refund")) {
                    sb.append("Refund request. ");
                    if (order != null && order.getItems() != null && order.getItems().toLowerCase().contains("final_sale")) {
                        sb.append("Item is marked as final sale and not eligible for refund. ");
                    }
                }
            }
            case "shipping" -> {
                sb.append("Shipping concern. ");
                if (text.contains("no movement") || text.contains("not moved")) {
                    sb.append("Tracking stale, carrier investigation recommended. ");
                }
            }
            case "warranty" -> {
                sb.append("Warranty claim. ");
                if (text.contains("battery") && (text.contains("swell") || text.contains("fail"))) {
                    sb.append("SAFETY ISSUE: Battery swelling detected. Escalated to specialist with urgent priority. ");
                }
            }
            case "billing" -> {
                sb.append("Billing issue. ");
                if (text.contains("double charge") || text.contains("duplicate")) {
                    sb.append("Duplicate charge reported. Refund review recommended. ");
                }
            }
            case "account_security" -> {
                sb.append("Account security request. ");
                if (customer != null && !customer.isVerified()) {
                    sb.append("Customer is not verified. Identity verification required. ");
                }
            }
            default -> sb.append("General support request. ");
        }

        return sb.toString().trim();
    }
}
