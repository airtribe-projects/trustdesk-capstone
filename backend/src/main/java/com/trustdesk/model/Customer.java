package com.trustdesk.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "customers")
public class Customer {
    @Id
    @Column(name = "customer_id")
    private String customerId;

    private String name;
    private String email;
    private String tier;
    private String country;

    @Column(name = "created_at")
    private LocalDate createdAt;

    private boolean verified;

    @Column(length = 1000)
    private String tags;

    public Customer() {}

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getTier() { return tier; }
    public void setTier(String tier) { this.tier = tier; }
    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
    public LocalDate getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDate createdAt) { this.createdAt = createdAt; }
    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }
    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }
}
