// services/guardrail.js
// Simple guardrail checks for unsafe documents, PII leakage, and prompt injection attempts.
// Returns an object { safe: boolean, reasons: string[] }

function checkGuardrails(draft, docs) {
  const reasons = [];
  // 1. Disallow explicit unsafe KB document IDs
  const unsafeIds = ['KB-ADVERSARIAL-001'];
  for (const doc of docs) {
    if (unsafeIds.includes(doc.id)) {
      reasons.push(`Unsafe policy document referenced: ${doc.id}`);
    }
  }
  // 2. Basic PII regex checks (email, credit card numbers)
  const piiPatterns = [
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // email
    /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, // credit card pattern
  ];
  for (const pat of piiPatterns) {
    if (pat.test(draft)) {
      reasons.push('Potential PII leakage detected in draft');
      break;
    }
  }
  // 3. Simple prompt injection detection – look for hidden tokens like "<SYSTEM>"
  if (/<\/?(SYSTEM|PROMPT|INJECTION)>/.test(draft)) {
    reasons.push('Possible prompt injection pattern detected');
  }

  return { safe: reasons.length === 0, reasons };
}

module.exports = { checkGuardrails };
