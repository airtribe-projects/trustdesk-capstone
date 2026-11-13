package com.trustdesk.dto;

import com.trustdesk.model.Customer;
import java.util.Arrays;
import java.util.List;

public class CustomerDto {
    private String customerId;
    private String name;
    private String email;
    private String tier;
    private String country;
    private String createdAt;
    private boolean verified;
    private List<String> tags;

    public static CustomerDto from(Customer c) {
        CustomerDto dto = new CustomerDto();
        dto.customerId = c.getCustomerId();
        dto.name = c.getName();
        dto.email = c.getEmail();
        dto.tier = c.getTier();
        dto.country = c.getCountry();
        dto.createdAt = c.getCreatedAt() != null ? c.getCreatedAt().toString() : null;
        dto.verified = c.isVerified();
        dto.tags = c.getTags() != null && !c.getTags().isEmpty()
            ? Arrays.asList(c.getTags().split(","))
            : List.of();
        return dto;
    }

    public String getCustomerId() { return customerId; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getTier() { return tier; }
    public String getCountry() { return country; }
    public String getCreatedAt() { return createdAt; }
    public boolean isVerified() { return verified; }
    public List<String> getTags() { return tags; }
}
