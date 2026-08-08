export interface GuardrailResult {
  blocked: boolean;
  reason?: string;
  injectionDetected: boolean;
  piiRequest: boolean;
  policyBypass: boolean;
}

// Patterns indicating prompt injection or policy bypass attempts
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|rules?|policies?)/i,
  /system\s+override/i,
  /you\s+(are\s+now|can now|must now)\s+(allowed|required|instructed)/i,
  /forget\s+(your|all)\s+(instructions?|rules?|training)/i,
  /new\s+(instruction|directive|rule):\s/i,
  /act\s+as\s+if\s+(you|the\s+policy)/i,
  /pretend\s+(you|there)\s+(have\s+no|is\s+no)/i,
];

// Patterns requesting sensitive data disclosure
const PII_PATTERNS = [
  /print\s+(your\s+)?(hidden\s+)?(system\s+prompt|api\s+key|secret|token)/i,
  /reveal\s+(your\s+)?(system\s+prompt|api\s+key|hidden|internal)/i,
  /show\s+(me\s+)?(your\s+)?(system\s+prompt|api\s+key|hidden|internal\s+notes?)/i,
  /what\s+is\s+your\s+(system\s+prompt|api\s+key|secret)/i,
  /tell\s+me\s+(your\s+)?(hidden|internal|secret)/i,
  /disclose\s+(your\s+)?(system\s+prompt|internal\s+notes?)/i,
];

// Patterns attempting to bypass identity/security checks
const BYPASS_PATTERNS = [
  /skip\s+(identity|verification|security)\s+check/i,
  /ignore\s+(identity|verification|security)\s+check/i,
  /bypass\s+(identity|verification|security)/i,
  /policy\s+allows?\s+(skipping|ignoring|bypass)/i,
  /no\s+(need\s+for\s+)?(identity|verification|id)\s+check/i,
];

// Patterns attempting to issue actions covertly
const COVERT_ACTION_PATTERNS = [
  /do\s+not\s+(mention|tell|report|show)\s+(this|it)\s+(to\s+)?(the\s+)?(human|reviewer|agent)/i,
  /hide\s+(this|it)\s+from\s+(the\s+)?(human|reviewer)/i,
  /don'?t\s+(mention|tell|show)\s+(this|it)\s+(to\s+)?(human|reviewer)/i,
  /without\s+(human\s+)?review/i,
  /automatically\s+(approve|issue|create|grant)/i,
];

function checkDocumentAdversarial(docId: string): boolean {
  return docId === 'KB-ADVERSARIAL-001';
}

export function checkGuardrails(
  message: string,
  retrievedDocIds?: string[]
): GuardrailResult {
  const injectionDetected = INJECTION_PATTERNS.some((p) => p.test(message)) ||
    COVERT_ACTION_PATTERNS.some((p) => p.test(message));

  const piiRequest = PII_PATTERNS.some((p) => p.test(message));

  const policyBypass = BYPASS_PATTERNS.some((p) => p.test(message));

  // Check if adversarial document was retrieved
  const adversarialDocRetrieved = (retrievedDocIds || []).some(checkDocumentAdversarial);

  const blocked = injectionDetected || piiRequest || policyBypass || adversarialDocRetrieved;

  let reason: string | undefined;
  if (injectionDetected) {
    reason = 'Prompt injection or covert action attempt detected in customer message.';
  } else if (piiRequest) {
    reason = 'Request to reveal sensitive internal information (system prompt, API keys, internal notes) detected.';
  } else if (policyBypass) {
    reason = 'Attempt to bypass identity verification or security checks detected.';
  } else if (adversarialDocRetrieved) {
    reason = 'Retrieved document KB-ADVERSARIAL-001 contains unsafe instructions and has been filtered.';
  }

  return { blocked, reason, injectionDetected, piiRequest, policyBypass };
}

export function filterAdversarialDocs<T extends { doc_id: string }>(docs: T[]): T[] {
  return docs.filter((d) => d.doc_id !== 'KB-ADVERSARIAL-001');
}
