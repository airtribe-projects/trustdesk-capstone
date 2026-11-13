package com.trustdesk.controller;

import com.trustdesk.action.ToolActionService;
import com.trustdesk.dto.*;
import com.trustdesk.exception.ResourceNotFoundException;
import com.trustdesk.model.*;
import com.trustdesk.repository.*;
import com.trustdesk.service.DraftReplyService;
import com.trustdesk.service.TriageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    private final TicketRepository ticketRepo;
    private final CustomerRepository customerRepo;
    private final OrderRepository orderRepo;
    private final AgentRunTraceRepository traceRepo;
    private final TriageService triageService;
    private final DraftReplyService draftReplyService;
    private final ToolActionService toolActionService;

    public TicketController(TicketRepository ticketRepo, CustomerRepository customerRepo,
                           OrderRepository orderRepo, AgentRunTraceRepository traceRepo,
                           TriageService triageService, DraftReplyService draftReplyService,
                           ToolActionService toolActionService) {
        this.ticketRepo = ticketRepo;
        this.customerRepo = customerRepo;
        this.orderRepo = orderRepo;
        this.traceRepo = traceRepo;
        this.triageService = triageService;
        this.draftReplyService = draftReplyService;
        this.toolActionService = toolActionService;
    }

    @GetMapping
    public ResponseEntity<List<TicketDetailDto>> listTickets() {
        List<Ticket> tickets = ticketRepo.findAll();
        List<TicketDetailDto> dtos = tickets.stream().map(t -> {
            Customer c = customerRepo.findById(t.getCustomerId()).orElse(null);
            Order o = t.getOrderId() != null ? orderRepo.findById(t.getOrderId()).orElse(null) : null;
            return TicketDetailDto.from(t, c, o);
        }).toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{ticketId}")
    public ResponseEntity<TicketDetailDto> getTicket(@PathVariable String ticketId) {
        Ticket ticket = ticketRepo.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found: " + ticketId));
        Customer customer = customerRepo.findById(ticket.getCustomerId()).orElse(null);
        Order order = ticket.getOrderId() != null ? orderRepo.findById(ticket.getOrderId()).orElse(null) : null;
        return ResponseEntity.ok(TicketDetailDto.from(ticket, customer, order));
    }

    @PostMapping("/{ticketId}/triage")
    public ResponseEntity<TriageResultDto> triageTicket(@PathVariable String ticketId) {
        return ResponseEntity.ok(triageService.triage(ticketId));
    }

    @PostMapping("/{ticketId}/draft-reply")
    public ResponseEntity<DraftReplyDto> generateDraftReply(@PathVariable String ticketId) {
        return ResponseEntity.ok(draftReplyService.generateDraft(ticketId));
    }

    @GetMapping("/{ticketId}/traces")
    public ResponseEntity<List<AgentRunTrace>> getTraces(@PathVariable String ticketId) {
        return ResponseEntity.ok(traceRepo.findByTicketId(ticketId));
    }

    @PostMapping("/{ticketId}/actions")
    public ResponseEntity<ActionResponseDto> requestAction(
            @PathVariable String ticketId,
            @RequestBody ActionRequestDto request) {
        return ResponseEntity.ok(toolActionService.requestAction(ticketId, request));
    }
}
