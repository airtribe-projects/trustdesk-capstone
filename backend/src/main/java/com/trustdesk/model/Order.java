package com.trustdesk.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "orders")
public class Order {
    @Id
    @Column(name = "order_id")
    private String orderId;

    @Column(name = "customer_id")
    private String customerId;

    private String status;

    @Column(name = "placed_at")
    private LocalDate placedAt;

    @Column(name = "delivered_at")
    private LocalDate deliveredAt;

    @Column(name = "eligible_return_until")
    private LocalDate eligibleReturnUntil;

    private BigDecimal total;
    private String currency;

    @Column(name = "payment_status")
    private String paymentStatus;

    @Column(name = "tracking_number")
    private String trackingNumber;

    @Column(length = 2000)
    private String items;

    public Order() {}

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }
    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDate getPlacedAt() { return placedAt; }
    public void setPlacedAt(LocalDate placedAt) { this.placedAt = placedAt; }
    public LocalDate getDeliveredAt() { return deliveredAt; }
    public void setDeliveredAt(LocalDate deliveredAt) { this.deliveredAt = deliveredAt; }
    public LocalDate getEligibleReturnUntil() { return eligibleReturnUntil; }
    public void setEligibleReturnUntil(LocalDate eligibleReturnUntil) { this.eligibleReturnUntil = eligibleReturnUntil; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
    public String getTrackingNumber() { return trackingNumber; }
    public void setTrackingNumber(String trackingNumber) { this.trackingNumber = trackingNumber; }
    public String getItems() { return items; }
    public void setItems(String items) { this.items = items; }
}
