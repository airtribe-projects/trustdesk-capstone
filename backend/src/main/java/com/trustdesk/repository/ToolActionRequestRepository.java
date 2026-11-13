package com.trustdesk.repository;

import com.trustdesk.model.ToolActionRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ToolActionRequestRepository extends JpaRepository<ToolActionRequest, String> {
    Optional<ToolActionRequest> findByIdempotencyKey(String idempotencyKey);
    List<ToolActionRequest> findByTicketId(String ticketId);
}
