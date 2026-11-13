package com.trustdesk.dto;

import com.trustdesk.model.Customer;
import com.trustdesk.model.Order;
import com.trustdesk.model.Ticket;
import java.util.List;
import java.util.Map;

public class TicketDetailDto {
    private String ticketId;
    private String customerId;
    private String orderId;
    private String channel;
    private String subject;
    private String body;
    private String createdAt;
    private String status;
    private String triageCategory;
    private String triagePriority;
    private String triageSentiment;
    private Boolean triageEscalation;
    private String triageReason;
    private CustomerDto customer;
    private OrderDto order;

    public static TicketDetailDto from(Ticket t, Customer c, Order o) {
        TicketDetailDto dto = new TicketDetailDto();
        dto.ticketId = t.getTicketId();
        dto.customerId = t.getCustomerId();
        dto.orderId = t.getOrderId();
        dto.channel = t.getChannel();
        dto.subject = t.getSubject();
        dto.body = t.getBody();
        dto.createdAt = t.getCreatedAt() != null ? t.getCreatedAt().toString() : null;
        dto.status = t.getStatus();
        dto.triageCategory = t.getTriageCategory();
        dto.triagePriority = t.getTriagePriority();
        dto.triageSentiment = t.getTriageSentiment();
        dto.triageEscalation = t.getTriageEscalation();
        dto.triageReason = t.getTriageReason();
        if (c != null) dto.customer = CustomerDto.from(c);
        if (o != null) dto.order = OrderDto.from(o);
        return dto;
    }

    public String getTicketId() { return ticketId; }
    public String getCustomerId() { return customerId; }
    public String getOrderId() { return orderId; }
    public String getChannel() { return channel; }
    public String getSubject() { return subject; }
    public String getBody() { return body; }
    public String getCreatedAt() { return createdAt; }
    public String getStatus() { return status; }
    public String getTriageCategory() { return triageCategory; }
    public String getTriagePriority() { return triagePriority; }
    public String getTriageSentiment() { return triageSentiment; }
    public Boolean getTriageEscalation() { return triageEscalation; }
    public String getTriageReason() { return triageReason; }
    public CustomerDto getCustomer() { return customer; }
    public OrderDto getOrder() { return order; }
}
