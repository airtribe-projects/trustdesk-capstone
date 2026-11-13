package com.trustdesk.guardrails;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;

@Service
public class GuardrailService {

    private static final List<Pattern> PROMPT_INJECTION_PATTERNS = List.of(
            Pattern.compile("(?i)ignore\\s+(all\\s+)?(previous|prior|above)\\s+(instructions|rules|policies|prompts)"),
            Pattern.compile("(?i)system\\s+override"),
            Pattern.compile("(?i)reveal\\s+(your\\s+)?(system\\s+prompt|hidden\\s+prompt|api\\s+key|internal\\s+notes|hidden\\s+instructions)"),
            Pattern.compile("(?i)print\\s+(your\\s+)?(system\\s+prompt|api\\s+key|hidden|internal)"),
            Pattern.compile("(?i)show\\s+(me\\s+)?(your\\s+)?(internal|hidden|system)\\s+(instructions|prompt|notes|key)"),
            Pattern.compile("(?i)do\\s+not\\s+(mention|tell|reveal)\\s+(this|the)\\s+(instruction|to\\s+the\\s+human)"),
            Pattern.compile("(?i)bypass\\s+(identity|verification|security|policy)"),
            Pattern.compile("(?i)ignore\\s+(identity|verification)\\s+(checks|requirements|policy)"),
            Pattern.compile("(?i)the\\s+policy\\s+(allows|has\\s+changed|says)"),
            Pattern.compile("(?i)you\\s+are\\s+now\\s+allowed"),
            Pattern.compile("(?i)skip\\s+(identity|verification)\\s+(checks|requirements)")
    );

    private static final List<Pattern> SECRET_REQUEST_PATTERNS = List.of(
            Pattern.compile("(?i)(system\\s+prompt|api\\s+key|hidden\\s+(prompt|instruction|note)|internal\\s+notes|secret)"),
            Pattern.compile("(?i)before\\s+answering.*print"),
            Pattern.compile("(?i)reveal.*hidden")
    );

    private static final List<Pattern> IDENTITY_BYPASS_PATTERNS = List.of(
            Pattern.compile("(?i)ignore\\s+(identity|verification)"),
            Pattern.compile("(?i)skip\\s+(identity|verification)"),
            Pattern.compile("(?i)bypass\\s+(identity|verification)"),
            Pattern.compile("(?i)policy\\s+allows\\s+it")
    );

    public GuardrailResult checkInput(String subject, String body) {
        String combined = (subject != null ? subject : "") + " " + (body != null ? body : "");
        List<String> violations = new ArrayList<>();

        // Check for prompt injection
        for (Pattern p : PROMPT_INJECTION_PATTERNS) {
            if (p.matcher(combined).find()) {
                violations.add("prompt_injection_detected: " + p.pattern());
            }
        }

        // Check for secret disclosure requests
        boolean secretRequest = false;
        for (Pattern p : SECRET_REQUEST_PATTERNS) {
            if (p.matcher(combined).find()) {
                secretRequest = true;
                violations.add("secret_disclosure_request: " + p.pattern());
            }
        }

        // Check for identity bypass
        boolean identityBypass = false;
        for (Pattern p : IDENTITY_BYPASS_PATTERNS) {
            if (p.matcher(combined).find()) {
                identityBypass = true;
                violations.add("identity_bypass_attempt: " + p.pattern());
            }
        }

        boolean safe = violations.isEmpty();
        boolean shouldEscalate = !safe;

        return new GuardrailResult(safe, shouldEscalate, violations, secretRequest, identityBypass);
    }

    public boolean isDocumentAdversarial(String docId) {
        return "KB-ADVERSARIAL-001".equals(docId);
    }

    public boolean isCouponAmountValid(int amountInr) {
        return amountInr <= 1000;
    }

    public boolean isToolAllowedForCategory(String toolName, String category, List<String> allowedCategories) {
        return allowedCategories != null && allowedCategories.contains(category);
    }

    public record GuardrailResult(
            boolean safe,
            boolean shouldEscalate,
            List<String> violations,
            boolean secretRequest,
            boolean identityBypass
    ) {}
}
