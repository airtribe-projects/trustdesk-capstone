package com.trustdesk.repository;

import com.trustdesk.model.DraftReply;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DraftReplyRepository extends JpaRepository<DraftReply, String> {
    List<DraftReply> findByTicketId(String ticketId);
}
