package com.trustdesk.repository;

import com.trustdesk.model.AgentRunTrace;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AgentRunTraceRepository extends JpaRepository<AgentRunTrace, String> {
    List<AgentRunTrace> findByTicketId(String ticketId);
}
