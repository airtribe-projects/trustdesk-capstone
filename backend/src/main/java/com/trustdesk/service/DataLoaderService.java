package com.trustdesk.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.trustdesk.model.*;
import com.trustdesk.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;

import java.io.*;
import java.math.BigDecimal;
import java.nio.file.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DataLoaderService implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataLoaderService.class);

    @Value("${trustdesk.data.path}")
    private String dataPath;

    private final CustomerRepository customerRepo;
    private final OrderRepository orderRepo;
    private final TicketRepository ticketRepo;
    private final KnowledgeDocumentRepository kbRepo;
    private final ObjectMapper mapper;

    public DataLoaderService(CustomerRepository customerRepo, OrderRepository orderRepo,
                             TicketRepository ticketRepo, KnowledgeDocumentRepository kbRepo) {
        this.customerRepo = customerRepo;
        this.orderRepo = orderRepo;
        this.ticketRepo = ticketRepo;
        this.kbRepo = kbRepo;
        this.mapper = new ObjectMapper();
        this.mapper.registerModule(new JavaTimeModule());
    }

    @Override
    public void run(String... args) throws Exception {
        loadCustomers();
        loadOrders();
        loadTickets();
        loadKnowledgeBase();
        log.info("Data loading complete.");
    }

    private void loadCustomers() throws Exception {
        if (customerRepo.count() > 0) {
            log.info("Customers already loaded, skipping.");
            return;
        }
        Path file = Path.of(dataPath, "customers.json");
        List<JsonNode> nodes = mapper.readValue(file.toFile(), new TypeReference<>() {});
        for (JsonNode n : nodes) {
            Customer c = new Customer();
            c.setCustomerId(n.get("customer_id").asText());
            c.setName(n.get("name").asText());
            c.setEmail(n.get("email").asText());
            c.setTier(n.get("tier").asText());
            c.setCountry(n.get("country").asText());
            c.setCreatedAt(LocalDate.parse(n.get("created_at").asText()));
            c.setVerified(n.get("verified").asBoolean());
            List<String> tags = new ArrayList<>();
            n.get("tags").forEach(t -> tags.add(t.asText()));
            c.setTags(String.join(",", tags));
            customerRepo.save(c);
        }
        log.info("Loaded {} customers.", customerRepo.count());
    }

    private void loadOrders() throws Exception {
        if (orderRepo.count() > 0) {
            log.info("Orders already loaded, skipping.");
            return;
        }
        Path file = Path.of(dataPath, "orders.json");
        List<JsonNode> nodes = mapper.readValue(file.toFile(), new TypeReference<>() {});
        for (JsonNode n : nodes) {
            Order o = new Order();
            o.setOrderId(n.get("order_id").asText());
            o.setCustomerId(n.get("customer_id").asText());
            o.setStatus(n.get("status").asText());
            o.setPlacedAt(LocalDate.parse(n.get("placed_at").asText()));
            o.setDeliveredAt(n.has("delivered_at") && !n.get("delivered_at").isNull()
                    ? LocalDate.parse(n.get("delivered_at").asText()) : null);
            o.setEligibleReturnUntil(n.has("eligible_return_until") && !n.get("eligible_return_until").isNull()
                    ? LocalDate.parse(n.get("eligible_return_until").asText()) : null);
            o.setTotal(new BigDecimal(n.get("total").asText()));
            o.setCurrency(n.get("currency").asText());
            o.setPaymentStatus(n.get("payment_status").asText());
            o.setTrackingNumber(n.get("tracking_number").asText());
            o.setItems(mapper.writeValueAsString(n.get("items")));
            orderRepo.save(o);
        }
        log.info("Loaded {} orders.", orderRepo.count());
    }

    private void loadTickets() throws Exception {
        if (ticketRepo.count() > 0) {
            log.info("Tickets already loaded, skipping.");
            return;
        }
        Path file = Path.of(dataPath, "tickets.json");
        List<JsonNode> nodes = mapper.readValue(file.toFile(), new TypeReference<>() {});
        for (JsonNode n : nodes) {
            Ticket t = new Ticket();
            t.setTicketId(n.get("ticket_id").asText());
            t.setCustomerId(n.get("customer_id").asText());
            t.setOrderId(n.get("order_id").asText());
            t.setChannel(n.get("channel").asText());
            t.setSubject(n.get("subject").asText());
            t.setBody(n.get("body").asText());
            t.setCreatedAt(OffsetDateTime.parse(n.get("created_at").asText()));
            t.setStatus(n.get("status").asText());
            t.setExpectedCategory(n.has("expected_category") ? n.get("expected_category").asText() : null);
            t.setExpectedPriority(n.has("expected_priority") ? n.get("expected_priority").asText() : null);
            t.setExpectedSentiment(n.has("expected_sentiment") ? n.get("expected_sentiment").asText() : null);
            t.setExpectedEscalation(n.has("expected_escalation") ? n.get("expected_escalation").asBoolean() : null);
            if (n.has("expected_actions")) {
                List<String> actions = new ArrayList<>();
                n.get("expected_actions").forEach(a -> actions.add(a.asText()));
                t.setExpectedActions(String.join(",", actions));
            }
            ticketRepo.save(t);
        }
        log.info("Loaded {} tickets.", ticketRepo.count());
    }

    private void loadKnowledgeBase() throws Exception {
        if (kbRepo.count() > 0) {
            log.info("Knowledge base already loaded, skipping.");
            return;
        }
        Path kbDir = Path.of(dataPath, "knowledge_base");
        if (!Files.exists(kbDir)) {
            log.warn("Knowledge base directory not found at {}", kbDir);
            return;
        }
        try (var files = Files.list(kbDir)) {
            for (Path f : files.filter(p -> p.toString().endsWith(".md")).collect(Collectors.toList())) {
                String content = Files.readString(f);
                KnowledgeDocument doc = new KnowledgeDocument();

                // Parse doc ID from content
                String docId = extractField(content, "Doc ID:");
                String title = extractTitle(content);
                String audience = extractField(content, "Audience:");
                String version = extractField(content, "Version:");

                if (docId == null) {
                    docId = "KB-" + f.getFileName().toString().replace(".md", "").toUpperCase();
                }

                doc.setDocId(docId);
                doc.setTitle(title != null ? title : f.getFileName().toString());
                doc.setContent(content);
                doc.setSourcePath("data/knowledge_base/" + f.getFileName());
                doc.setAudience(audience);
                doc.setVersion(version);

                kbRepo.save(doc);
                log.info("Loaded KB document: {}", docId);
            }
        }
        log.info("Loaded {} knowledge base documents.", kbRepo.count());
    }

    private String extractField(String content, String fieldName) {
        for (String line : content.split("\n")) {
            if (line.trim().startsWith(fieldName)) {
                return line.substring(line.indexOf(fieldName) + fieldName.length()).trim();
            }
        }
        return null;
    }

    private String extractTitle(String content) {
        for (String line : content.split("\n")) {
            if (line.startsWith("# ") && !line.startsWith("## ")) {
                return line.substring(2).trim();
            }
        }
        return null;
    }
}
