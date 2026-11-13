package com.trustdesk.repository;

import com.trustdesk.model.EvalRun;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface EvalRunRepository extends JpaRepository<EvalRun, String> {
    Optional<EvalRun> findTopByOrderByStartedAtDesc();
}
