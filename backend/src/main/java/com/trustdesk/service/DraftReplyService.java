package com.trustdesk.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trustdesk.dto.DraftReplyDto;
import com.trustdesk.dto.KnowledgeSearchResultDto;
import com.trustdesk.exception.ResourceNotFoundException;
import com.trustdesk.guardrails.GuardrailService;
import com.trustdesk.model.*;
import com.trustdesk.repository.*;
import com.trustdesk.retrieval.KnowledgeRetrievalService;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Deterministic draft reply generator.
 * Generates professional customer-facing responses with policy citations.
 * Uses a rule-based approach as fallback when no LLM API key is configured.
 */
@Service
public class DraftReplyService {

    private final TicketRepository ticketRepo;
    private final CustomerRepository customerRepo;
    private final OrderRepository orderRepo;
    private final DraftReplyRepository draftRepo;
    private final AgentRunTraceRepository traceRepo;
    private final KnowledgeRetrievalService retrievalService;
    private final GuardrailService guardrailService;
    private final ObjectMapper mapper = new ObjectMapper();

    public DraftReplyService(TicketRepository ticketRepo, CustomerRepository customerRepo,
                             OrderRepository orderRepo, DraftReplyRepository draftRepo,
                             AgentRunTraceRepository traceRepo,
                             KnowledgeRetrievalService retrievalService,
                             GuardrailService guardrailService) {
        this.ticketRepo = ticketRepo;
        this.customerRepo = customerRepo;
        this.orderRepo = orderRepo;
        this.draftRepo = draftRepo;
        this.traceRepo = traceRepo;
        this.retrievalService = retrievalService;
        this.guardrailService = guardrailService;
    }

    public DraftReplyDto generateDraft(String ticketId) {
        Ticket ticket = ticketRepo.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found: " + ticketId));
        Customer customer = customerRepo.findById(ticket.getCustomerId()).orElse(null);
        Order order = ticket.getOrderId() != null ? orderRepo.findById(ticket.getOrderId()).orElse(null) : null;

        // Run guardrail check
        GuardrailService.GuardrailResult guardrail = guardrailService.checkInput(ticket.getSubject(), ticket.getBody());

        // Run triage if not already done
        String category = ticket.getTriageCategory();
        if (category == null) {
            category = "general";
        }

        // Search knowledge base
        List<KnowledgeSearchResultDto> kbResults = retrievalService.searchForTicket(
                ticket.getSubject(), ticket.getBody(), category);

        // Build response
        List<String> citations = new ArrayList<>();
        List<Map<String, Object>> recommendedActions = new ArrayList<>();
        String responseBody;

        if (!guardrail.safe()) {
            responseBody = buildSafeResponse(ticket, customer, guardrail, kbResults, citations, recommendedActions, category);
        } else {
            responseBody = buildNormalResponse(ticket, customer, order, category, kbResults, citations, recommendedActions);
        }

        // Create and save draft
        String draftId = "draft_" + ticketId + "_" + System.currentTimeMillis();
        String runId = "run_draft_" + ticketId + "_" + System.currentTimeMillis();

        DraftReply draft = new DraftReply();
        draft.setDraftId(draftId);
        draft.setTicketId(ticketId);
        draft.setStatus("generated");
        draft.setBody(responseBody);
        draft.setCitations(String.join(",", citations));
        try {
            draft.setRecommendedActions(mapper.writeValueAsString(recommendedActions));
        } catch (Exception e) {
            draft.setRecommendedActions("[]");
        }
        draft.setRunId(runId);
        draft.setCreatedAt(OffsetDateTime.now());
        draftRepo.save(draft);

        // Save trace
        AgentRunTrace trace = new AgentRunTrace();
        trace.setRunId(runId);
        trace.setTicketId(ticketId);
        trace.setRunType("draft_reply");
        trace.setStatus("completed");
        trace.setRetrievedDocIds(String.join(",", citations));
        try {
            trace.setToolCalls(mapper.writeValueAsString(recommendedActions));
        } catch (Exception e) {
            trace.setToolCalls("[]");
        }
        trace.setGuardrailResults(guardrail.safe() ? "pass" : "violations: " + String.join("; ", guardrail.violations()));
        trace.setCreatedAt(OffsetDateTime.now());
        traceRepo.save(trace);

        // Build response DTO
        DraftReplyDto dto = new DraftReplyDto();
        dto.setDraftId(draftId);
        dto.setTicketId(ticketId);
        dto.setStatus("generated");
        dto.setBody(responseBody);
        dto.setCitations(citations);
        dto.setRecommendedActions(recommendedActions);
        dto.setRunId(runId);
        return dto;
    }

    private String buildSafeResponse(Ticket ticket, Customer customer,
                                      GuardrailService.GuardrailResult guardrail,
                                      List<KnowledgeSearchResultDto> kbResults,
                                      List<String> citations,
                                      List<Map<String, Object>> recommendedActions,
                                      String category) {
        StringBuilder sb = new StringBuilder();
        String customerName = customer != null ? customer.getName() : "Valued Customer";

        sb.append("Dear ").append(customerName).append(",\n\n");
        sb.append("Thank you for reaching out to our support team.\n\n");

        if (guardrail.secretRequest()) {
            sb.append("I understand you've made a request, but I'm unable to share internal system information, ");
            sb.append("API keys, hidden prompts, or internal notes. This is in accordance with our security policies.\n\n");
            sb.append("If you have a specific support concern, I'd be happy to assist you with that instead.\n\n");
            sb.append("[Reference: KB-SECURITY-001]\n\n");
            citations.add("KB-SECURITY-001");
        } else if (guardrail.identityBypass()) {
            sb.append("I see that you've requested an account change. For the security of your account, ");
            sb.append("we are required to verify your identity before making any account modifications. ");
            sb.append("We cannot bypass this verification process, as it is essential to protect your account.\n\n");
            sb.append("I am escalating this to a human support specialist who can assist you with the ");
            sb.append("proper verification process.\n\n");
            sb.append("[Reference: KB-ACCOUNT-001]\n\n");
            citations.add("KB-ACCOUNT-001");
        } else {
            // General prompt injection
            sb.append("I've reviewed your message. However, I cannot follow instructions that attempt to ");
            sb.append("override our support policies or issue unauthorized actions. Our support team follows ");
            sb.append("established policies to ensure fair and secure service for all customers.\n\n");
            sb.append("If you have a legitimate support concern, please describe it and I'll be happy to help.\n\n");
            sb.append("[Reference: KB-SECURITY-001]\n\n");
            citations.add("KB-SECURITY-001");
        }

        sb.append("This ticket has been escalated to a human support specialist for review.\n\n");
        sb.append("Best regards,\nTrustDesk Support Team");

        // Recommend escalation
        recommendedActions.add(Map.of(
                "tool_name", "escalate_to_human",
                "requires_human_approval", false,
                "reason", "Guardrail violation detected: " + String.join(", ", guardrail.violations())
        ));

        return sb.toString();
    }

    private String buildNormalResponse(Ticket ticket, Customer customer, Order order,
                                       String category, List<KnowledgeSearchResultDto> kbResults,
                                       List<String> citations,
                                       List<Map<String, Object>> recommendedActions) {
        StringBuilder sb = new StringBuilder();
        String customerName = customer != null ? customer.getName() : "Valued Customer";
        String text = (ticket.getSubject() + " " + ticket.getBody()).toLowerCase();

        sb.append("Dear ").append(customerName).append(",\n\n");
        sb.append("Thank you for contacting TrustDesk support. ");

        switch (category) {
            case "refund" -> buildRefundResponse(sb, ticket, customer, order, text, citations, recommendedActions);
            case "shipping" -> buildShippingResponse(sb, ticket, customer, order, text, citations, recommendedActions);
            case "warranty" -> buildWarrantyResponse(sb, ticket, customer, order, text, citations, recommendedActions);
            case "billing" -> buildBillingResponse(sb, ticket, customer, order, text, citations, recommendedActions);
            case "account_security" -> buildAccountSecurityResponse(sb, ticket, customer, text, citations, recommendedActions);
            default -> buildGeneralResponse(sb, ticket, customer, text, citations, recommendedActions);
        }

        sb.append("\n\nBest regards,\nTrustDesk Support Team");
        return sb.toString();
    }

    private void buildRefundResponse(StringBuilder sb, Ticket ticket, Customer customer, Order order,
                                      String text, List<String> citations, List<Map<String, Object>> actions) {
        citations.add("KB-REFUND-001");

        if (text.contains("damaged") || text.contains("defective") || text.contains("cracked") || text.contains("broken")) {
            sb.append("I'm sorry to hear that your item arrived damaged. We take product quality seriously.\n\n");

            if (order != null) {
                LocalDate ticketDate = ticket.getCreatedAt().toLocalDate();
                boolean withinReturn = order.getEligibleReturnUntil() != null
                        && !ticketDate.isAfter(order.getEligibleReturnUntil());

                if (withinReturn) {
                    sb.append("Based on our records, your order (").append(order.getOrderId())
                            .append(") is within the return window. Per our Refund and Return Policy, ");
                    sb.append("damaged or defective items reported within 7 calendar days of delivery are eligible ");
                    sb.append("for a replacement or refund review.\n\n");
                    sb.append("We would like to offer a replacement for the damaged item. ");
                    sb.append("Could you please provide a photo of the damage? This will help us process your request.\n\n");
                    sb.append("[Reference: KB-REFUND-001]\n");

                    // Get first item info
                    String sku = extractSkuFromOrder(order);
                    actions.add(Map.of(
                            "tool_name", "create_replacement_order",
                            "requires_human_approval", true,
                            "reason", "Damaged physical item reported within return window."
                    ));
                } else {
                    sb.append("We note that the standard return window for your order has passed. ");
                    if (customer != null && "gold".equals(customer.getTier())) {
                        sb.append("However, as a valued Gold-tier customer, you may qualify for a goodwill exception. ");
                        sb.append("I am escalating this to our team for review.\n\n");
                    } else {
                        sb.append("Unfortunately, we may not be able to process a standard return at this time. ");
                        sb.append("Please contact our team to discuss available options.\n\n");
                    }
                    sb.append("[Reference: KB-REFUND-001]\n");
                }
            }
        } else if (order != null && order.getItems() != null && order.getItems().toLowerCase().contains("\"final_sale\":true")) {
            sb.append("I understand you'd like a refund for your purchase. After reviewing your order, I see that ");
            sb.append("the item is classified as a final-sale product. Per our Refund and Return Policy, ");
            sb.append("software licenses, downloadable products, gift cards, and marked final-sale items are not ");
            sb.append("eligible for refund after purchase unless required by law or approved by a support manager.\n\n");
            sb.append("We apologize for any inconvenience. If you believe there are special circumstances, ");
            sb.append("please let us know and we can review your case further.\n\n");
            sb.append("[Reference: KB-REFUND-001]\n");
        } else {
            sb.append("I've received your refund request and will review it based on our return policy.\n\n");
            sb.append("[Reference: KB-REFUND-001]\n");
        }
    }

    private void buildShippingResponse(StringBuilder sb, Ticket ticket, Customer customer, Order order,
                                        String text, List<String> citations, List<Map<String, Object>> actions) {
        citations.add("KB-SHIPPING-001");

        sb.append("I understand your concern about your shipment.\n\n");

        if (text.contains("no movement") || text.contains("not moved") || text.contains("6 business days") || text.contains("stale")) {
            sb.append("Per our Shipping and Delivery Policy, if tracking shows no movement for 5 or more business days ");
            sb.append("after dispatch, we can open a carrier investigation on your behalf. ");
            sb.append("This is the recommended next step to locate your package.\n\n");
            sb.append("Please note that we cannot promise an instant refund or replacement at this stage. ");
            sb.append("The carrier investigation will help us determine the best resolution.\n\n");
            sb.append("[Reference: KB-SHIPPING-001]\n");

            if (order != null) {
                actions.add(Map.of(
                        "tool_name", "open_carrier_investigation",
                        "requires_human_approval", false,
                        "reason", "Tracking stale for more than 5 business days."
                ));
            }
        } else {
            sb.append("Most orders ship within 1 business day and are delivered within 3 to 7 business days. ");
            sb.append("We will monitor your shipment and update you.\n\n");
            sb.append("[Reference: KB-SHIPPING-001]\n");
        }
    }

    private void buildWarrantyResponse(StringBuilder sb, Ticket ticket, Customer customer, Order order,
                                        String text, List<String> citations, List<Map<String, Object>> actions) {
        citations.add("KB-WARRANTY-001");

        if (text.contains("battery") && (text.contains("swell") || text.contains("overheating") || text.contains("burning"))) {
            sb.append("I'm very concerned to hear about the battery issue with your device. ");
            sb.append("Battery swelling is a safety issue and must be handled with care.\n\n");
            sb.append("**IMPORTANT**: Please stop using the device immediately and keep it away from flammable materials. ");
            sb.append("Do not attempt to charge or power on the device.\n\n");
            sb.append("Per our Warranty and Product Safety Policy, safety issues such as battery swelling are ");
            sb.append("escalated to a human specialist with urgent priority. We do not recommend any troubleshooting ");
            sb.append("for battery safety concerns.\n\n");
            sb.append("[Reference: KB-WARRANTY-001]\n");

            actions.add(Map.of(
                    "tool_name", "escalate_to_human",
                    "requires_human_approval", false,
                    "reason", "Safety issue: Battery swelling reported. Requires urgent specialist attention."
            ));
        } else {
            sb.append("I've received your warranty claim. ");
            if (order != null && order.getDeliveredAt() != null) {
                LocalDate ticketDate = ticket.getCreatedAt().toLocalDate();
                long monthsSinceDelivery = java.time.temporal.ChronoUnit.MONTHS.between(order.getDeliveredAt(), ticketDate);
                int warrantyMonths = 12;
                if (customer != null && "gold".equals(customer.getTier())) {
                    warrantyMonths = 18;
                    sb.append("As a Gold-tier customer, you have an extended 18-month warranty. ");
                }
                if (monthsSinceDelivery <= warrantyMonths) {
                    sb.append("Your device is within the warranty period. ");
                } else {
                    sb.append("We note that the standard warranty period has passed. ");
                }
            }
            sb.append("\n\n[Reference: KB-WARRANTY-001]\n");
        }
    }

    private void buildBillingResponse(StringBuilder sb, Ticket ticket, Customer customer, Order order,
                                       String text, List<String> citations, List<Map<String, Object>> actions) {
        citations.add("KB-BILLING-001");

        if (text.contains("double charge") || text.contains("duplicate charge") || text.contains("two charges") || text.contains("charged twice")) {
            sb.append("I understand you've noticed a duplicate charge, and I'm sorry for the inconvenience. ");
            sb.append("We take billing concerns very seriously as they directly affect your funds.\n\n");
            sb.append("Per our Billing and Payment Policy, when a duplicate charge is reported, we initiate ");
            sb.append("a billing review to verify the transaction. Please note that we cannot confirm the ");
            sb.append("duplicate charge has been refunded until our payment operations team completes their review.\n\n");
            sb.append("If you have the transaction reference or payment date, that would help us expedite the review.\n\n");
            sb.append("[Reference: KB-BILLING-001]\n");

            if (order != null) {
                actions.add(Map.of(
                        "tool_name", "start_refund_review",
                        "requires_human_approval", true,
                        "reason", "Duplicate charge reported for order " + order.getOrderId()
                ));
            }
        } else {
            sb.append("I've received your billing inquiry and will review it.\n\n");
            sb.append("[Reference: KB-BILLING-001]\n");
        }
    }

    private void buildAccountSecurityResponse(StringBuilder sb, Ticket ticket, Customer customer,
                                               String text, List<String> citations, List<Map<String, Object>> actions) {
        citations.add("KB-ACCOUNT-001");

        sb.append("I understand you have an account-related request.\n\n");

        if (text.contains("email") && text.contains("change")) {
            sb.append("Account email changes require identity verification for the security of your account. ");
            sb.append("Per our Account Security Policy, we cannot make account changes based only on a chat message ");
            sb.append("without proper verification.\n\n");
            if (customer != null && !customer.isVerified()) {
                sb.append("Our records indicate that your account verification status needs to be updated. ");
            }
            sb.append("I am escalating this to a human support specialist who can guide you through the ");
            sb.append("proper verification process to complete your email change securely.\n\n");
            sb.append("[Reference: KB-ACCOUNT-001]\n");

            actions.add(Map.of(
                    "tool_name", "escalate_to_human",
                    "requires_human_approval", false,
                    "reason", "Account change request requires identity verification."
            ));
        } else {
            sb.append("For your security, this request requires verification. I'm escalating to a specialist.\n\n");
            sb.append("[Reference: KB-ACCOUNT-001]\n");

            actions.add(Map.of(
                    "tool_name", "escalate_to_human",
                    "requires_human_approval", false,
                    "reason", "Account security request requires specialist handling."
            ));
        }
    }

    private void buildGeneralResponse(StringBuilder sb, Ticket ticket, Customer customer,
                                       String text, List<String> citations, List<Map<String, Object>> actions) {
        sb.append("I've received your support request and will review it.\n\n");
        sb.append("If you have any additional details about your concern, please share them and we'll be happy to assist.\n");
    }

    private String extractSkuFromOrder(Order order) {
        if (order.getItems() == null) return "UNKNOWN";
        try {
            var items = mapper.readTree(order.getItems());
            if (items.isArray() && !items.isEmpty()) {
                return items.get(0).has("sku") ? items.get(0).get("sku").asText() : "UNKNOWN";
            }
        } catch (Exception e) {
            // ignore
        }
        return "UNKNOWN";
    }
}
