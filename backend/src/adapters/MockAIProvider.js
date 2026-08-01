const AIProvider = require("./AIProvider");

class MockAIProvider extends AIProvider {
  async classifyTicket(ticket, documents) {
    return {
      category: "refund",
      priority: "high",
      sentiment: "negative",
      escalation: false,
    };
  }

  async generateDraft(ticket, documents) {
    return {
      reply:
        "I am sorry that your item arrived damaged. We can help review the available replacement or refund options under our return policy.",
      citations: ["KB-REFUND-001"],
    };
  }
}

module.exports = MockAIProvider;
