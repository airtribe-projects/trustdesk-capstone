// services/triage.js
// Placeholder AI triage service. In production replace with real LLM call.
// Returns {category, priority, escalation}

function triageTicket(ticket) {
  // Very naive rule‑based demo: look for keywords.
  const text = `${ticket.subject} ${ticket.message}`.toLowerCase();
  if (text.includes('refund')) {
    return { category: 'refund', priority: 'high', escalation: false };
  }
  if (text.includes('shipping') || text.includes('delivery')) {
    return { category: 'shipping', priority: 'medium', escalation: false };
  }
  if (text.includes('account') && text.includes('security')) {
    return { category: 'account_security', priority: 'urgent', escalation: true };
  }
  return { category: 'general', priority: 'low', escalation: false };
}

module.exports = { triageTicket };
