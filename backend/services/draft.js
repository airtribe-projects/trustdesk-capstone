// services/draft.js
// Placeholder draft generation service.
// In a real implementation this would call an LLM with the ticket, customer/order context, and retrieved policy docs.
// Here we simply concatenate a static template and embed citation IDs.

function generateDraft(ticket, docs) {
  const citations = docs.map(d => `[${d.id}]`).join(' ');
  const draft = `Dear ${ticket.customerName || 'Customer'},\n\nWe have reviewed your request regarding "${ticket.subject}". Based on our policy documents ${citations}, we recommend the following action...\n\nBest regards,\nTrustDesk Support Team`;
  return { draft, citations: docs.map(d => d.id) };
}

module.exports = { generateDraft };
