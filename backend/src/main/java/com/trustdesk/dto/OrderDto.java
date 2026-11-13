package com.trustdesk.dto;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trustdesk.model.Order;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class OrderDto {
    private String orderId;
    private String customerId;
    private String status;
    private String placedAt;
    private String deliveredAt;
    private String eligibleReturnUntil;
    private BigDecimal total;
    private String currency;
    private String paymentStatus;
    private String trackingNumber;
    private List<Map<String, Object>> items;

    private static final ObjectMapper mapper = new ObjectMapper();

    public static OrderDto from(Order o) {
        OrderDto dto = new OrderDto();
        dto.orderId = o.getOrderId();
        dto.customerId = o.getCustomerId();
        dto.status = o.getStatus();
        dto.placedAt = o.getPlacedAt() != null ? o.getPlacedAt().toString() : null;
        dto.deliveredAt = o.getDeliveredAt() != null ? o.getDeliveredAt().toString() : null;
        dto.eligibleReturnUntil = o.getEligibleReturnUntil() != null ? o.getEligibleReturnUntil().toString() : null;
        dto.total = o.getTotal();
        dto.currency = o.getCurrency();
        dto.paymentStatus = o.getPaymentStatus();
        dto.trackingNumber = o.getTrackingNumber();
        try {
            if (o.getItems() != null) {
                dto.items = mapper.readValue(o.getItems(), new TypeReference<>() {});
            }
        } catch (Exception e) {
            dto.items = List.of();
        }
        return dto;
    }

    public String getOrderId() { return orderId; }
    public String getCustomerId() { return customerId; }
    public String getStatus() { return status; }
    public String getPlacedAt() { return placedAt; }
    public String getDeliveredAt() { return deliveredAt; }
    public String getEligibleReturnUntil() { return eligibleReturnUntil; }
    public BigDecimal getTotal() { return total; }
    public String getCurrency() { return currency; }
    public String getPaymentStatus() { return paymentStatus; }
    public String getTrackingNumber() { return trackingNumber; }
    public List<Map<String, Object>> getItems() { return items; }
}
